import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, userEvent, resetStores } from "../test-utils"
import CheckEmailPage from "@/app/check-email/page"
import { useUserStore } from "@/lib/stores/userStore"

const mockPush = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn(), back: vi.fn() }),
}))

vi.mock("@/lib/api/auth", () => ({
  getMe: vi.fn().mockResolvedValue(null),
  resendVerification: vi.fn().mockResolvedValue({ success: true }),
  logout: vi.fn().mockResolvedValue(undefined),
}))

import { getMe, resendVerification, logout } from "@/lib/api/auth"
const getMeMock = vi.mocked(getMe)
const resendMock = vi.mocked(resendVerification)
const logoutMock = vi.mocked(logout)

beforeEach(() => {
  resetStores()
  mockPush.mockClear()
  getMeMock.mockClear()
  resendMock.mockClear()
  logoutMock.mockClear()
})

describe("CheckEmailPage", () => {
  it("shows page with user email when unverified user is in store", () => {
    useUserStore.setState({
      user: { id: "1", email: "alice@example.com", emailVerified: false },
    })
    render(<CheckEmailPage />)

    expect(screen.getByText("Check your inbox")).toBeInTheDocument()
    expect(screen.getByText("alice@example.com")).toBeInTheDocument()
  })

  it("redirects to / when user is verified", async () => {
    useUserStore.setState({
      user: { id: "1", email: "alice@example.com", emailVerified: true },
    })
    render(<CheckEmailPage />)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/")
    })
  })

  it("fetches user via getMe when store is empty", async () => {
    getMeMock.mockResolvedValue({
      id: "1",
      email: "alice@example.com",
      emailVerified: false,
    })
    render(<CheckEmailPage />)

    await waitFor(() => {
      expect(getMeMock).toHaveBeenCalled()
      expect(screen.getByText("alice@example.com")).toBeInTheDocument()
    })
  })

  it("redirects to /login when getMe returns null", async () => {
    getMeMock.mockResolvedValue(null)
    render(<CheckEmailPage />)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login")
    })
  })

  it("resend button calls API and starts 60s cooldown", async () => {
    resendMock.mockResolvedValue({ success: true })
    useUserStore.setState({
      user: { id: "1", email: "alice@example.com", emailVerified: false },
    })
    const user = userEvent.setup()
    render(<CheckEmailPage />)

    const resendBtn = screen.getByRole("button", {
      name: "Resend verification email",
    })
    await user.click(resendBtn)

    await waitFor(() => {
      expect(resendMock).toHaveBeenCalled()
    })

    // After click, button should show countdown text
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Resend in \d+s/ })).toBeDisabled()
    })
  })

  it("button shows countdown text during cooldown", async () => {
    resendMock.mockResolvedValue({ success: true })
    useUserStore.setState({
      user: { id: "1", email: "alice@example.com", emailVerified: false },
    })
    const user = userEvent.setup()
    render(<CheckEmailPage />)

    await user.click(
      screen.getByRole("button", { name: "Resend verification email" })
    )

    await waitFor(() => {
      const btn = screen.getByRole("button", { name: /Resend in \d+s/ })
      expect(btn).toBeDisabled()
    })
  })

  it("logout clears user and redirects to /login", async () => {
    logoutMock.mockResolvedValue(undefined)
    useUserStore.setState({
      user: { id: "1", email: "alice@example.com", emailVerified: false },
    })
    const user = userEvent.setup()
    render(<CheckEmailPage />)

    await user.click(screen.getByText("Log out"))

    await waitFor(() => {
      expect(logoutMock).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith("/login")
      expect(useUserStore.getState().user).toBeNull()
    })
  })
})
