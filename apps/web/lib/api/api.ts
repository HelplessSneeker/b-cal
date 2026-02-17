import { toast } from "sonner"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!

interface ApiResponse<T> {
  message?: string
  data?: T
}

interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown
  showSuccessToast?: boolean
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message)
    this.name = "ApiError"
  }
}

let csrfToken: string | null = null
let refreshPromise: Promise<boolean> | null = null

async function attemptTokenRefresh(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = (async () => {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Request-Id": crypto.randomUUID(),
      }
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken
      }
      const response = await fetch(`${BACKEND_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers,
      })
      return response.ok
    } catch {
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

export async function fetchCsrfToken(): Promise<void> {
  try {
    const response = await fetch(`${BACKEND_URL}/auth/csrf-token`, {
      credentials: "include",
    })
    if (response.ok) {
      const json = await response.json()
      csrfToken = json.data?.csrfToken ?? null
    }
  } catch {
    // CSRF token fetch failed — will retry on next mutation
  }
}

export async function api<T = unknown>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { body, showSuccessToast = true, ...fetchOptions } = options

  const method = (fetchOptions.method ?? "GET").toUpperCase()
  const isStateChanging = method !== "GET" && method !== "HEAD" && method !== "OPTIONS"

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Request-Id": crypto.randomUUID(),
    ...(fetchOptions.headers as Record<string, string>),
  }

  if (isStateChanging && csrfToken) {
    headers["x-csrf-token"] = csrfToken
  }

  const config: RequestInit = {
    ...fetchOptions,
    credentials: "include",
    headers,
  }

  if (body !== undefined) {
    config.body = JSON.stringify(body)
  }

  try {
    let response = await fetch(`${BACKEND_URL}${endpoint}`, config)

    if (response.status === 403 && isStateChanging) {
      const json = await response.json().catch(() => ({}))
      if (json.message && json.message.includes("CSRF")) {
        csrfToken = null
        await fetchCsrfToken()
        if (csrfToken) {
          headers["x-csrf-token"] = csrfToken
          config.headers = headers
          response = await fetch(`${BACKEND_URL}${endpoint}`, config)
        }
      }
    }

    if (response.status === 401 && endpoint !== "/auth/refresh") {
      const refreshed = await attemptTokenRefresh()
      if (refreshed) {
        headers["X-Request-Id"] = crypto.randomUUID()
        config.headers = headers
        response = await fetch(`${BACKEND_URL}${endpoint}`, config)
      }

      if (response.status === 401) {
        window.location.href = "/login"
        throw new ApiError("Session expired", 401)
      }
    }

    const json: ApiResponse<T> = await response.json().catch(() => ({}))

    if (!response.ok) {
      const errorMessage = json.message || `Request failed with status ${response.status}`
      toast.error(errorMessage)
      throw new ApiError(errorMessage, response.status)
    }

    if (json.message && showSuccessToast) {
      toast.success(json.message)
    }

    return json.data as T
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    const message = "Network error. Please try again."
    toast.error(message)
    throw new ApiError(message, 0)
  }
}
