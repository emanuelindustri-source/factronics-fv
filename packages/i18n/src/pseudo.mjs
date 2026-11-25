// F&V (by Factronics) — pseudo-localización determinista (es-XA).
// Alarga el texto, acentúa las vocales y lo envuelve en marcadores visibles.
// Sirve para detectar literales sin traducir y desbordes de diseño.

import { PSEUDO_CLOSE, PSEUDO_OPEN } from "./catalog.mjs";

const ACCENTS = {
  a: "á", e: "é", i: "í", o: "ó", u: "ú", n: "ñ", c: "ç", y: "ý",
  A: "Á", E: "É", I: "Í", O: "Ó", U: "Ú", N: "Ñ", C: "Ç", Y: "Ý"
};

const PLACEHOLDER = /\{([A-Za-z0-9_]+)\}/g;

export function pseudoLocalize(text) {
  const pieces = text.split(PLACEHOLDER);
  const transformed = pieces
    .map((piece, index) => {
      if (index % 2 === 1) return `{${piece}}`; // el grupo capturado es el nombre del marcador
      return [...piece].map((char) => ACCENTS[char] ?? char).join("");
    })
    .join("");

  // Relleno para simular un idioma ~35 % más largo que el español.
  const originalLength = [...text].length;
  const padding = "·".repeat(Math.max(3, Math.ceil(originalLength * 0.35)));
  return `${PSEUDO_OPEN}${transformed}${padding}${PSEUDO_CLOSE}`;
}
