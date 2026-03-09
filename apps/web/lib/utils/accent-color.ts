export function applyAccentColor(color: string): void {
  if (color === 'slate') {
    delete document.documentElement.dataset.accent;
  } else {
    document.documentElement.dataset.accent = color;
  }
}
