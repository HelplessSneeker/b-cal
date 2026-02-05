import { toast } from "sonner"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000"

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

export async function api<T = unknown>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { body, showSuccessToast = true, ...fetchOptions } = options

  const config: RequestInit = {
    ...fetchOptions,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...fetchOptions.headers,
    },
  }

  if (body !== undefined) {
    config.body = JSON.stringify(body)
  }

  try {
    const response = await fetch(`${BACKEND_URL}${endpoint}`, config)
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
