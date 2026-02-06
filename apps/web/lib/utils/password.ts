export function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters"
  }
  if (!/\d/.test(password)) {
    return "Password must contain at least one number"
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return "Password must contain at least one symbol"
  }
  return null
}
