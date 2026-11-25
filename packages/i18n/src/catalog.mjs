// F&V (by Factronics) — metadatos del catálogo de idiomas.
// El español de Venezuela es el idioma base y la fuente de verdad de las claves.

export const BASE_LOCALE = "es-VE";

/** Idiomas reales, seleccionables en la app y declarados en locales_config. */
export const REAL_LOCALES = [
  { tag: "es-VE", androidFolder: "values", intl: "es-VE", nativeName: "Español (Venezuela)" },
  { tag: "en", androidFolder: "values-en", intl: "en-US", nativeName: "English" },
  { tag: "pt-BR", androidFolder: "values-pt-rBR", intl: "pt-BR", nativeName: "Português (Brasil)" },
  { tag: "pt-PT", androidFolder: "values-pt-rPT", intl: "pt-PT", nativeName: "Português (Portugal)" },
  { tag: "it", androidFolder: "values-it", intl: "it-IT", nativeName: "Italiano" },
  { tag: "de", androidFolder: "values-de", intl: "de-DE", nativeName: "Deutsch" },
  { tag: "fr", androidFolder: "values-fr", intl: "fr-FR", nativeName: "Français" },
  { tag: "zh-Hans", androidFolder: "values-b+zh+Hans", intl: "zh-Hans", nativeName: "简体中文" },
  { tag: "ja", androidFolder: "values-ja", intl: "ja-JP", nativeName: "日本語" },
  { tag: "ko", androidFolder: "values-ko", intl: "ko-KR", nativeName: "한국어" },
  { tag: "hi", androidFolder: "values-hi", intl: "hi-IN", nativeName: "हिन्दी" }
];

/**
 * Idiomas especiales, ocultos tras el easter egg (7 pulsaciones en la versión).
 * - la: latín, solo interfaz y logros. Nunca contenido técnico.
 * - es-XA: pseudo-local para detectar literales y desbordes. Solo QA.
 */
export const SPECIAL_LOCALES = [
  { tag: "la", androidFolder: "values-la", intl: "la", nativeName: "Latina · easter egg" },
  {
    // El pseudo-local usa el código privado "qps" para NO secuestrar los recursos
    // de los dispositivos en español (Android prioriza coincidencia de idioma
    // sobre el idioma base). La etiqueta visible sigue siendo es-XA.
    tag: "es-XA",
    androidFolder: "values-qps",
    androidResourceTag: "qps",
    intl: "es-XA",
    nativeName: "Pseudo-local · QA",
    pseudo: true
  }
];

export const LOCALES = [...REAL_LOCALES, ...SPECIAL_LOCALES];

/** Claves que legítimamente son iguales en todos los idiomas (marcas y nombres propios). */
export const INVARIANT_KEYS = ["app.name", "profile.name.value", "profile.company.value"];

/**
 * Valores que pueden coincidir con el español sin ser un error de traducción.
 * Cada excepción está justificada: son palabras idénticas en esos idiomas.
 */
export const SAME_AS_BASE_ALLOWED = {
  // Cognados idénticos en español y portugués/italiano: no son errores.
  "about.versionValue": ["it", "pt-BR", "pt-PT"],
  "home.module.calc": ["pt-BR", "pt-PT"],
  "home.module.certs": ["pt-BR", "pt-PT"],
  "nav.profile": ["pt-BR", "pt-PT"],
  "profile.company": ["pt-BR", "pt-PT"],
  "profile.edit": ["pt-BR", "pt-PT"],
  "profile.title": ["pt-BR", "pt-PT"],
  "settings.language": ["pt-BR", "pt-PT"],
  "profile.save": ["pt-PT"],
  "settings.formats.number": ["pt-BR", "pt-PT"],
  "settings.theme": ["it", "pt-BR", "pt-PT"],
  "settings.theme.light": ["pt-BR", "pt-PT"],
  "settings.theme.system": ["it", "pt-BR", "pt-PT"],
  // F1.3: nombres de festividades y términos que coinciden legítimamente.
  "festivity.halloween": ["en", "pt-BR", "pt-PT", "it", "de", "fr", "la"],
  "festivity.carnival": ["pt-BR", "pt-PT", "fr"],
  "settings.festivity.enabled": ["pt-BR", "pt-PT"],
  "settings.festivity.auto": ["pt-BR", "pt-PT"],
  "home.festivity.active": ["it", "pt-BR", "pt-PT"]
};

/** Marcadores de posición admitidos. Deben ser iguales en todos los idiomas. */
export const ALLOWED_PLACEHOLDERS = ["days", "name", "version"];

/** Prefijo de los textos pseudo-localizados. */
export const PSEUDO_OPEN = "⟦";
export const PSEUDO_CLOSE = "⟧";

export function localeByTag(tag) {
  return LOCALES.find((locale) => locale.tag === tag);
}

export function isRealLocale(tag) {
  return REAL_LOCALES.some((locale) => locale.tag === tag);
}
