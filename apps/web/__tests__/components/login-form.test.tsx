import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, userEvent, resetStores } from "../test-utils"
import { LoginForm } from "@/components/login-form"

const mockPush = vi.fn()
const mockRefresh = vi.fn()
let searchParamsMap: Record<string, string> = {}

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
    back: vi.fn(),
  }),
  useSearchParams: () => ({
    get: (key: string) => searchParamsMap[key] ?? null,
  }),
}))

const toastError = vi.fn()
vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
    success: vi.fn(),
  },
  Toaster: () => null,
}))

vi.mock("@/lib/api/auth", () => ({
  login: vi.fn(),
  signup: vi.fn(),
}))

import { login, signup } from "@/lib/api/auth"
const loginMock = vi.mocked(login)
const signupMock = vi.mocked(signup)

beforeEach(() => {
  resetStores()
  mockPush.mockClear()
  mockRefresh.mockClear()
  toastError.mockClear()
  loginMock.mockReset()
  signupMock.mockReset()
  searchParamsMap = {}
})

describe("LoginForm", () => {
  it("renders login form by default (no confirm password field)", () => {
    render(<LoginForm />)
    expect(screen.getByText("Login to your account")).toBeInTheDocument()
    expect(screen.getByLabelText("Email")).toBeInTheDocument()
    expect(screen.getByLabelText("Password")).toBeInTheDocument()
    expect(screen.queryByLabelText("Confirm Password")).not.toBeInTheDocument()
  })

  it("renders signup form with confirm password field", () => {
    render(<LoginForm isSignup />)
    expect(screen.getByText("Create an account")).toBeInTheDocument()
    expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument()
  })

  it("successful login redirects to /", async () => {
    loginMock.mockResolvedValue({ success: true })
    const user = userEvent.setup()
    render(<LoginForm />)

    await user.type(screen.getByLabelText("Email"), "alice@example.com")
    await user.type(screen.getByLabelText("Password"), "password123!")
    await user.click(screen.getByRole("button", { name: "Login" }))

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith("alice@example.com", "password123!")
      expect(mockPush).toHaveBeenCalledWith("/")
    })
  })

  it("login with ?from=/calendar redirects to /calendar", async () => {
    searchParamsMap = { from: "/calendar" }
    loginMock.mockResolvedValue({ success: true })
    const user = userEvent.setup()
    render(<LoginForm />)

    await user.type(screen.getByLabelText("Email"), "alice@example.com")
    await user.type(screen.getByLabelText("Password"), "password123!")
    await user.click(screen.getByRole("button", { name: "Login" }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/calendar")
    })
  })

  it("successful signup redirects to /check-email", async () => {
    signupMock.mockResolvedValue({ success: true })
    const user = userEvent.setup()
    render(<LoginForm isSignup />)

    await user.type(screen.getByLabelText("Email"), "alice@example.com")
    await user.type(screen.getByLabelText("Password"), "password123!")
    await user.type(screen.getByLabelText("Confirm Password"), "password123!")
    await user.click(screen.getByRole("button", { name: "Sign Up" }))

    await waitFor(() => {
      expect(signupMock).toHaveBeenCalledWith("alice@example.com", "password123!")
      expect(mockPush).toHaveBeenCalledWith("/check-email")
    })
  })

  it("signup with weak password shows validation error toast", async () => {
    const user = userEvent.setup()
    render(<LoginForm isSignup />)

    await user.type(screen.getByLabelText("Email"), "alice@example.com")
    await user.type(screen.getByLabelText("Password"), "short")
    await user.type(screen.getByLabelText("Confirm Password"), "short")
    await user.click(screen.getByRole("button", { name: "Sign Up" }))

    expect(toastError).toHaveBeenCalledWith(
      "Password must be at least 8 characters"
    )
    expect(signupMock).not.toHaveBeenCalled()
  })

  it("signup with mismatched passwords shows error toast", async () => {
    const user = userEvent.setup()
    render(<LoginForm isSignup />)

    await user.type(screen.getByLabelText("Email"), "alice@example.com")
    await user.type(screen.getByLabelText("Password"), "password123!")
    await user.type(screen.getByLabelText("Confirm Password"), "different123!")
    await user.click(screen.getByRole("button", { name: "Sign Up" }))

    expect(toastError).toHaveBeenCalledWith("Passwords do not match")
    expect(signupMock).not.toHaveBeenCalled()
  })

  it("shows spinner while loading", async () => {
    loginMock.mockReturnValue(new Promise(() => {})) // never resolves
    const user = userEvent.setup()
    render(<LoginForm />)

    await user.type(screen.getByLabelText("Email"), "alice@example.com")
    await user.type(screen.getByLabelText("Password"), "password123!")
    await user.click(screen.getByRole("button"))

    await waitFor(() => {
      expect(screen.getByRole("button")).toBeDisabled()
    })
  })
})
