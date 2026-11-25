// F&V (by Factronics) — idiomas soportados por la PWA (espejo de Android).
// Los endónimos se muestran en su propia lengua y no se traducen (ADR-0007).

export interface LocaleOption {
  /** Etiqueta BCP-47 usada por i18next y persistida. */
  tag: string;
  /** Nombre del idioma en su propia lengua (no traducible). */
  label: string;
  /** Etiqueta para Intl (región/escritura concreta). */
  formattingTag: string;
  special?: boolean;
}

export const BASE_LOCALE = "es-VE";
export const STORAGE_LANGUAGE = "fv.lang";
export const STORAGE_SPECIAL = "fv.special";

export const REAL_LOCALES: readonly LocaleOption[] = [
  { tag: "es-VE", label: "Español (Venezuela)", formattingTag: "es-VE" },
  { tag: "en", label: "English", formattingTag: "en-US" },
  { tag: "pt-BR", label: "Português (Brasil)", formattingTag: "pt-BR" },
  { tag: "pt-PT", label: "Português (Portugal)", formattingTag: "pt-PT" },
  { tag: "it", label: "Italiano", formattingTag: "it-IT" },
  { tag: "de", label: "Deutsch", formattingTag: "de-DE" },
  { tag: "fr", label: "Français", formattingTag: "fr-FR" },
  { tag: "zh-Hans", label: "简体中文", formattingTag: "zh-Hans" },
  { tag: "ja", label: "日本語", formattingTag: "ja-JP" },
  { tag: "ko", label: "한국어", formattingTag: "ko-KR" },
  { tag: "hi", label: "हिन्दी", formattingTag: "hi-IN" }
];

/** Latín: solo interfaz/logros. Pseudo-local: solo QA. */
export const SPECIAL_LOCALES: readonly LocaleOption[] = [
  { tag: "la", label: "Latina · easter egg", formattingTag: "la", special: true },
  { tag: "es-XA", label: "Pseudo-local · QA", formattingTag: "es-XA", special: true }
];

export const ALL_LOCALES: readonly LocaleOption[] = [...REAL_LOCALES, ...SPECIAL_LOCALES];

export function isSupportedTag(tag: string): boolean {
  return ALL_LOCALES.some((locale) => locale.tag === tag);
}

export function isSpecialTag(tag: string): boolean {
  return SPECIAL_LOCALES.some((locale) => locale.tag === tag);
}

export function formatLocale(tag: string): string {
  return ALL_LOCALES.find((locale) => locale.tag === tag)?.formattingTag ?? BASE_LOCALE;
}

/**
 * Detección de idioma del navegador → idioma soportado más cercano.
 * zh-Hant (tradicional) se aproxima a zh-Hans: es el único chino del alcance F1.2.
 * Cualquier idioma no soportado cae al español de Venezuela (idioma principal).
 */
export function matchSupportedLocale(input: string | null | undefined): string | null {
  if (!input) return null;
  const normalized = input.replace(/_/g, "-").toLowerCase();

  for (const locale of ALL_LOCALES) {
    if (locale.tag.toLowerCase() === normalized) return locale.tag;
  }
  if (normalized.startsWith("es")) return "es-VE";
  if (normalized.startsWith("pt-br")) return "pt-BR";
  if (normalized.startsWith("pt")) return "pt-PT";
  if (normalized.startsWith("zh")) return "zh-Hans";
  if (normalized.startsWith("en")) return "en";
  if (normalized.startsWith("it")) return "it";
  if (normalized.startsWith("de")) return "de";
  if (normalized.startsWith("fr")) return "fr";
  if (normalized.startsWith("ja")) return "ja";
  if (normalized.startsWith("ko")) return "ko";
  if (normalized.startsWith("hi")) return "hi";
  if (normalized === "la") return "la";
  return null;
}
