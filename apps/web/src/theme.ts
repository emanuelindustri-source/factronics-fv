// F&V — utilidades de tema (claro/oscuro/sistema) y festividades (F1.3).
import type { FestivityId } from "./festivities";

export type ThemeMode = "system" | "light" | "dark";

export function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode !== "system") return mode;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Aplica tema y festividad al documento. La festividad nunca cambia la
 * legibilidad: solo acentos e ilustración. En modo sobrio no se pinta nada.
 */
export function applyTheme(
  mode: ThemeMode,
  festivityId: FestivityId = "none",
  soberMode = false
): void {
  const root = document.documentElement;
  root.setAttribute("data-theme", resolveTheme(mode));
  root.setAttribute("data-sober", soberMode ? "true" : "false");
  if (festivityId === "none" || soberMode) {
    root.removeAttribute("data-festivity");
  } else {
    root.setAttribute("data-festivity", festivityId);
  }
}
