// F&V (by Factronics) — pruebas de i18n de la PWA (gate F1.2).
import { describe, expect, it } from "vitest";
import { resources } from "./locales";
import {
  ALL_LOCALES,
  REAL_LOCALES,
  SPECIAL_LOCALES,
  matchSupportedLocale
} from "./supported-locales";

const base = resources["es-VE"].translation;
const baseKeys = Object.keys(base).sort();

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((match) => match[1]).sort();
}

describe("catálogo de la PWA", () => {
  it("tiene 11 idiomas reales y 2 especiales", () => {
    expect(REAL_LOCALES).toHaveLength(11);
    expect(SPECIAL_LOCALES.map((locale) => locale.tag)).toEqual(["la", "es-XA"]);
    expect(ALL_LOCALES).toHaveLength(13);
  });

  it("todos los locales tienen exactamente las mismas 83 claves", () => {
    expect(baseKeys).toHaveLength(83);
    for (const locale of ALL_LOCALES) {
      const catalog = resources[locale.tag as keyof typeof resources].translation;
      expect(Object.keys(catalog).sort(), locale.tag).toEqual(baseKeys);
      for (const key of baseKeys) {
        expect(catalog[key as keyof typeof catalog], `${locale.tag}/${key}`).toBeTruthy();
      }
    }
  });

  it("los marcadores de posición son idénticos en todos los idiomas", () => {
    for (const locale of ALL_LOCALES) {
      const catalog = resources[locale.tag as keyof typeof resources].translation;
      for (const key of baseKeys) {
        expect(
          placeholders(catalog[key as keyof typeof catalog] as string),
          `${locale.tag}/${key}`
        ).toEqual(placeholders(base[key as keyof typeof base] as string));
      }
    }
  });

  it("el pseudo-local está marcado y el latín no usa marcadores", () => {
    for (const value of Object.values(resources["es-XA"].translation)) {
      expect(value.startsWith("⟦")).toBe(true);
      expect(value.endsWith("⟧")).toBe(true);
    }
    for (const [key, value] of Object.entries(resources.la.translation)) {
      expect(value.includes("⟦"), key).toBe(false);
    }
  });
});

describe("detección de idioma", () => {
  it("mapea variantes al idioma soportado más cercano", () => {
    expect(matchSupportedLocale("es-MX")).toBe("es-VE");
    expect(matchSupportedLocale("es-ve")).toBe("es-VE");
    expect(matchSupportedLocale("pt")).toBe("pt-PT");
    expect(matchSupportedLocale("pt-BR")).toBe("pt-BR");
    expect(matchSupportedLocale("pt_PT")).toBe("pt-PT");
    expect(matchSupportedLocale("zh-TW")).toBe("zh-Hans");
    expect(matchSupportedLocale("zh-CN")).toBe("zh-Hans");
    expect(matchSupportedLocale("en-GB")).toBe("en");
    expect(matchSupportedLocale("ja-JP")).toBe("ja");
    expect(matchSupportedLocale("hi-IN")).toBe("hi");
    expect(matchSupportedLocale("la")).toBe("la");
    expect(matchSupportedLocale("xx-YY")).toBeNull();
    expect(matchSupportedLocale(null)).toBeNull();
  });
});
