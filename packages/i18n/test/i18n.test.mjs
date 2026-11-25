// F&V (by Factronics) — pruebas del catálogo único de idiomas.
// Gate F1.2: claves completas por idioma, sin faltantes ni sobrantes,
// paridad Android ↔ PWA, pseudo-local determinista y cero literales en pantallas.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  BASE_LOCALE,
  LOCALES,
  REAL_LOCALES,
  SPECIAL_LOCALES
} from "../src/catalog.mjs";
import { pseudoLocalize } from "../src/pseudo.mjs";
import { validateCatalogs, validatePseudo } from "../src/validate.mjs";
import { scan } from "../src/scan-hardcoded.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "../../..");
const SOURCE_LOCALES = path.join(HERE, "../src/locales");
const ANDROID_RES = path.join(REPO_ROOT, "apps/android/app/src/main/res");
const WEB_LOCALES = path.join(REPO_ROOT, "apps/web/src/locales");

function readCatalog(dir, tag) {
  return JSON.parse(fs.readFileSync(path.join(dir, `${tag}.json`), "utf8"));
}

const catalogs = Object.fromEntries(LOCALES.map(({ tag }) => [tag, readCatalog(SOURCE_LOCALES, tag)]));
const baseKeys = Object.keys(catalogs[BASE_LOCALE]).sort();

function androidResourceName(key) {
  return key
    .replace(/\./g, "_")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase();
}

function parseAndroidStrings(file) {
  const xml = fs.readFileSync(file, "utf8");
  const entries = new Map();
  for (const match of xml.matchAll(/<string name="([^"]+)">([\s\S]*?)<\/string>/g)) {
    entries.set(match[1], match[2]);
  }
  return entries;
}

test("están los 11 idiomas reales y exactamente 2 especiales", () => {
  assert.equal(REAL_LOCALES.length, 11);
  assert.deepEqual(
    REAL_LOCALES.map((locale) => locale.tag),
    ["es-VE", "en", "pt-BR", "pt-PT", "it", "de", "fr", "zh-Hans", "ja", "ko", "hi"]
  );
  assert.deepEqual(SPECIAL_LOCALES.map((locale) => locale.tag).sort(), ["es-XA", "la"]);
});

test("cada idioma tiene las mismas claves que es-VE, sin vacíos ni marcadores raros", () => {
  const errors = validateCatalogs(catalogs);
  assert.deepEqual(errors, [], errors.join("\n"));
});

test("es-VE define las 83 claves esperadas", () => {
  assert.equal(baseKeys.length, 83);
});

test("el pseudo-local es-XA se deriva exactamente de es-VE", () => {
  const errors = validatePseudo(catalogs, (base) =>
    Object.fromEntries(Object.keys(base).map((key) => [key, pseudoLocalize(base[key])]))
  );
  assert.deepEqual(errors, [], errors.join("\n"));
});

test("el pseudo-local nunca pierde marcadores de posición", () => {
  assert.match(pseudoLocalize("{days} días"), /\{days\}/);
  assert.match(pseudoLocalize("F&V {version} · Fase 1.2"), /\{version\}/);
});

test("los recursos Android generados están al día y completos en los 13 locales", () => {
  for (const locale of LOCALES) {
    const file = path.join(ANDROID_RES, locale.androidFolder, "strings.xml");
    assert.ok(fs.existsSync(file), `Falta ${file}`);
    const entries = parseAndroidStrings(file);
    assert.equal(entries.size, baseKeys.length, `${locale.tag}: número de cadenas distinto`);
    for (const key of baseKeys) {
      const resourceName = androidResourceName(key);
      assert.ok(entries.has(resourceName), `${locale.tag}: falta ${resourceName}`);
      assert.ok(entries.get(resourceName).trim().length > 0, `${locale.tag}: ${resourceName} vacío`);
    }
  }
});

test("paridad estricta de claves Android ↔ PWA ↔ catálogo", () => {
  for (const locale of LOCALES) {
    const android = new Set(
      [...parseAndroidStrings(path.join(ANDROID_RES, locale.androidFolder, "strings.xml")).keys()]
    );
    const webCatalog = readCatalog(WEB_LOCALES, locale.tag);
    const expected = new Set(baseKeys.map(androidResourceName));
    assert.deepEqual([...android].sort(), [...expected].sort(), `${locale.tag}: Android`);
    assert.deepEqual(Object.keys(webCatalog).sort(), baseKeys, `${locale.tag}: PWA`);
  }
});

test("las copias de la PWA son idénticas al catálogo fuente", () => {
  for (const locale of LOCALES) {
    assert.deepEqual(
      readCatalog(WEB_LOCALES, locale.tag),
      readCatalog(SOURCE_LOCALES, locale.tag),
      `${locale.tag}: copia PWA desactualizada`
    );
  }
});

test("todos los textos pseudo-localizados están marcados con ⟦ ⟧", () => {
  for (const [key, value] of Object.entries(catalogs["es-XA"])) {
    assert.ok(value.startsWith("⟦") && value.endsWith("⟧"), `${key} sin marcadores`);
  }
});

test("no hay textos de UI hardcodeados ni claves/recurso inexistentes", () => {
  const issues = scan();
  assert.deepEqual(issues, [], issues.join("\n"));
});
