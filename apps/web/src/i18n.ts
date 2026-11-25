// F&V (by Factronics) — internacionalización de la PWA (F1.2).
// Mismas claves que Android: ambos consumen packages/i18n.
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { LOCALE_TAGS, resources } from "./locales";
import {
  BASE_LOCALE,
  STORAGE_LANGUAGE,
  STORAGE_SPECIAL,
  isSpecialTag,
  isSupportedTag,
  matchSupportedLocale
} from "./supported-locales";

export function specialLocalesUnlocked(): boolean {
  try {
    return localStorage.getItem(STORAGE_SPECIAL) === "1";
  } catch {
    return false;
  }
}

export function setSpecialLocalesUnlocked(value: boolean): void {
  try {
    localStorage.setItem(STORAGE_SPECIAL, value ? "1" : "0");
  } catch {
    // Sin almacenamiento: el desbloqueo dura solo la sesión.
  }
}

function storedLanguage(): string | null {
  try {
    const stored = localStorage.getItem(STORAGE_LANGUAGE);
    if (!stored || !isSupportedTag(stored)) return null;
    if (isSpecialTag(stored) && !specialLocalesUnlocked()) return null;
    return stored;
  } catch {
    return null;
  }
}

/** Prioridad: elección guardada → idioma del navegador → es-VE. */
export function detectLanguage(): string {
  const stored = storedLanguage();
  if (stored) return stored;

  const candidates =
    typeof navigator !== "undefined"
      ? [...(navigator.languages ?? []), navigator.language].filter(Boolean)
      : [];
  for (const candidate of candidates) {
    const match = matchSupportedLocale(candidate);
    if (match) return match;
  }
  return BASE_LOCALE;
}

export function persistLanguage(tag: string): void {
  try {
    localStorage.setItem(STORAGE_LANGUAGE, tag);
  } catch {
    // La elección seguirá viva en memoria durante la sesión.
  }
  document.documentElement.lang = tag;
  document.documentElement.dir = "ltr";
}

const initialLanguage = detectLanguage();

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: BASE_LOCALE,
  supportedLngs: [...LOCALE_TAGS],
  load: "currentOnly",
  keySeparator: false,
  nsSeparator: false,
  returnNull: false,
  interpolation: { prefix: "{", suffix: "}", escapeValue: false }
});

persistLanguage(initialLanguage);
i18n.on("languageChanged", persistLanguage);

export default i18n;
