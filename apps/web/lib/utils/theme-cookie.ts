export function setThemeCookie(theme: string) {
  document.cookie = `theme=${theme};path=/;max-age=31536000;SameSite=Lax`;
}
