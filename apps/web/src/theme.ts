// F&V — utilidades de tema (claro/oscuro/sistema)
export type ThemeMode = "system" | "light" | "dark";

export function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode !== "system") return mode;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(mode: ThemeMode): void {
  document.documentElement.setAttribute("data-theme", resolveTheme(mode));
}
