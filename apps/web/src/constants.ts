// F&V (by Factronics) — textos NO traducibles (marcas, nombres propios, dominios).
// Viven fuera del catálogo i18n a propósito; ver ADR-0007.

export const ABOUT_TEAM_NAMES =
  "Eduardo Rodríguez · Luis Iungano · José Tovar · José Gabriel Ríos · Elián Inojosa · Mariana Cerdeño";

export const ABOUT_SOURCES_VALUE = "factronics.com.ve · videojet.com";

/**
 * Inyectado por Vite desde package.json (define __APP_VERSION__).
 * El fallback permite usar este módulo en pruebas Node (Playwright).
 */
export const APP_VERSION = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "0.3.0";
