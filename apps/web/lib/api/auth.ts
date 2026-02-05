import { api, ApiError } from "./api"

export interface User {
  id: string
  email: string
}

export interface AuthResponse {
  success: boolean
  error?: string
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  try {
    await api("/auth/login", {
      method: "POST",
      body: { email, password },
    })
    return { success: true }
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, error: error.message }
    }
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function signup(email: string, password: string): Promise<AuthResponse> {
  try {
    await api("/auth/signup", {
      method: "POST",
      body: { email, password },
    })
    return { success: true }
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, error: error.message }
    }
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function logout(): Promise<void> {
  try {
    await api("/auth/logout", {
      method: "POST",
    })
  } catch {
    // Ignore errors on logout
  }
}

export async function getMe(): Promise<User | null> {
  try {
    const user = await api<User>("/auth/me", {
      method: "GET",
      showSuccessToast: false,
    })
    return user
  } catch {
    return null
  }
}
