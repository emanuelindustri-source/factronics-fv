// F&V (by Factronics) — contraste AA de temas y festividades (F1.3).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  FESTIVITY_COLORS,
  type FestivityColors,
  type ThemeVariant
} from "./festivity-colors";
import { FESTIVITY_IDS } from "./festivities";

interface PaletteFile {
  contrast: { normalText: number; largeText: number };
  base: Record<ThemeVariant, Record<string, string>>;
  festivities: Record<string, Record<ThemeVariant, FestivityColors>>;
}

const palettes = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../../../packages/shared-fixtures/theme/palettes.json", import.meta.url)),
    "utf8"
  )
) as PaletteFile;

const css = readFileSync(
  fileURLToPath(new URL("./styles.css", import.meta.url)),
  "utf8"
);

function cssBlock(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`No se encontró el bloque CSS ${selector}`);
  return css.slice(start, css.indexOf("}", start));
}

function cssVar(block: string, name: string): string {
  const match = new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`).exec(block);
  if (!match) throw new Error(`No se encontró ${name}`);
  return match[1].toLowerCase();
}

function expectAA(foreground: string, background: string, label: string) {
  const ratio = contrastRatio(foreground, background);
  expect(ratio, `${label}: ${foreground} sobre ${background} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(
    palettes.contrast.normalText
  );
}

describe("paletas compartidas", () => {
  it("la PWA coincide exactamente con el archivo compartido", () => {
    for (const id of FESTIVITY_IDS) {
      expect(FESTIVITY_COLORS[id]).toEqual(palettes.festivities[id]);
    }
  });

  it("el CSS de la PWA coincide con la paleta compartida", () => {
    for (const id of FESTIVITY_IDS) {
      for (const variant of ["light", "dark"] as ThemeVariant[]) {
        const selector =
          variant === "dark"
            ? `:root[data-theme="dark"][data-festivity="${id}"]`
            : `:root[data-festivity="${id}"]`;
        const block = cssBlock(selector);
        const colors = palettes.festivities[id][variant];
        expect(cssVar(block, "--fv-accent"), `${id} ${variant} accent`).toBe(
          colors.accent.toLowerCase()
        );
        expect(cssVar(block, "--fv-on-accent"), `${id} ${variant} onAccent`).toBe(
          colors.onAccent.toLowerCase()
        );
        expect(cssVar(block, "--fv-accent-soft"), `${id} ${variant} accentSoft`).toBe(
          colors.accentSoft.toLowerCase()
        );
        expect(cssVar(block, "--fv-on-accent-soft"), `${id} ${variant} onAccentSoft`).toBe(
          colors.onAccentSoft.toLowerCase()
        );
      }
    }
  });
});

describe("contraste AA", () => {
  it("tema base claro y oscuro", () => {
    for (const variant of ["light", "dark"] as ThemeVariant[]) {
      const base = palettes.base[variant];
      expectAA(base.onBackground, base.background, `base ${variant} fondo`);
      expectAA(base.onSurface, base.surface, `base ${variant} superficie`);
      expectAA(base.onAccent, base.accent, `base ${variant} acento`);
      expectAA(base.onAccentSoft, base.accentSoft, `base ${variant} acento suave`);
      expectAA(base.onError, base.error, `base ${variant} error`);
    }
  });

  it("todas las festividades en claro y oscuro", () => {
    for (const id of FESTIVITY_IDS) {
      for (const variant of ["light", "dark"] as ThemeVariant[]) {
        const colors = palettes.festivities[id][variant];
        expectAA(colors.onAccent, colors.accent, `${id} ${variant} acento`);
        expectAA(colors.onAccentSoft, colors.accentSoft, `${id} ${variant} acento suave`);
      }
    }
  });
});
