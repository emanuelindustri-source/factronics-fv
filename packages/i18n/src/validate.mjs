// F&V (by Factronics) — validaciones del catálogo de textos de interfaz.
// Se ejecutan en el generador y en los tests: una fase no entra si el catálogo
// tiene claves faltantes, sobrantes, marcadores inconsistentes o traducciones vacías.

import {
  ALLOWED_PLACEHOLDERS,
  BASE_LOCALE,
  INVARIANT_KEYS,
  LOCALES,
  SAME_AS_BASE_ALLOWED
} from "./catalog.mjs";

const PLACEHOLDER = /\{([A-Za-z0-9_]+)\}/g;

export function placeholdersOf(value) {
  return [...value.matchAll(PLACEHOLDER)].map((match) => match[1]);
}

export function keySetOf(catalog) {
  return Object.keys(catalog).sort();
}

/**
 * @param {Record<string, Record<string, string>>} catalogs texto por idioma
 * @returns {string[]} errores legibles (vacío = todo correcto)
 */
export function validateCatalogs(catalogs) {
  const errors = [];
  const base = catalogs[BASE_LOCALE];
  if (!base) return [`Falta el catálogo base ${BASE_LOCALE}`];

  const baseKeys = keySetOf(base);

  for (const { tag } of LOCALES) {
    const catalog = catalogs[tag];
    if (!catalog) {
      errors.push(`Falta el catálogo ${tag}`);
      continue;
    }

    const keys = keySetOf(catalog);
    const missing = baseKeys.filter((key) => !(key in catalog));
    const extra = keys.filter((key) => !(key in base));
    if (missing.length) errors.push(`${tag}: claves faltantes → ${missing.join(", ")}`);
    if (extra.length) errors.push(`${tag}: claves sobrantes → ${extra.join(", ")}`);

    for (const key of baseKeys) {
      const value = catalog[key];
      if (typeof value !== "string" || value.trim() === "") {
        errors.push(`${tag}: valor vacío en ${key}`);
        continue;
      }
      if (tag !== "es-XA" && (value.includes("⟦") || value.includes("⟧"))) {
        errors.push(`${tag}: marcador de pseudo-local en ${key}`);
      }

      const basePlaceholders = placeholdersOf(base[key]).sort();
      const valuePlaceholders = placeholdersOf(value).sort();
      if (basePlaceholders.join(",") !== valuePlaceholders.join(",")) {
        errors.push(
          `${tag}: marcadores distintos en ${key} (base ${basePlaceholders.join(",") || "ninguno"}, ` +
            `${tag} ${valuePlaceholders.join(",") || "ninguno"})`
        );
      }
      for (const name of valuePlaceholders) {
        if (!ALLOWED_PLACEHOLDERS.includes(name)) {
          errors.push(`${tag}: marcador no permitido {${name}} en ${key}`);
        }
      }

      if (
        tag !== BASE_LOCALE &&
        tag !== "es-XA" &&
        !INVARIANT_KEYS.includes(key) &&
        value === base[key] &&
        !(SAME_AS_BASE_ALLOWED[key] ?? []).includes(tag)
      ) {
        errors.push(`${tag}: valor idéntico al español en ${key} (posible texto sin traducir)`);
      }
    }
  }

  return errors;
}

/** Comprueba que el pseudo-local se deriva exactamente del catálogo base. */
export function validatePseudo(catalogs, pseudoBuilder) {
  const expected = pseudoBuilder(catalogs[BASE_LOCALE]);
  const actual = catalogs["es-XA"];
  if (!actual) return ["Falta el catálogo es-XA"];
  const errors = [];
  for (const key of Object.keys(expected)) {
    if (actual[key] !== expected[key]) {
      errors.push(`es-XA: ${key} no coincide con la pseudo-localización esperada`);
    }
  }
  return errors;
}
