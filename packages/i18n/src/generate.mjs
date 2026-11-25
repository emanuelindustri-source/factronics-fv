#!/usr/bin/env node
// F&V (by Factronics) — generador del catálogo de idiomas.
//
// Fuente única: packages/i18n/src/locales/*.json (es-VE es la base).
// Salidas:
//   - apps/android/app/src/main/res/values*/strings.xml (recursos Android)
//   - apps/android/app/src/main/res/xml/locales_config.xml
//   - apps/web/src/locales/*.json + index.ts (PWA con i18next)
//
// Uso:
//   node src/generate.mjs           # escribe las salidas
//   node src/generate.mjs --check   # falla si las salidas no están al día

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BASE_LOCALE, LOCALES, REAL_LOCALES } from "./catalog.mjs";
import { pseudoLocalize } from "./pseudo.mjs";
import { validateCatalogs, validatePseudo } from "./validate.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "../../..");
const SOURCE_LOCALES = path.join(HERE, "locales");
const ANDROID_RES = path.join(REPO_ROOT, "apps/android/app/src/main/res");
const WEB_LOCALES = path.join(REPO_ROOT, "apps/web/src/locales");
const CHECK = process.argv.includes("--check");

const PLACEHOLDER = /\{([A-Za-z0-9_]+)\}/g;

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function androidResourceName(key) {
  return key
    .replace(/\./g, "_")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase();
}

function escapeAndroid(value) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"');
}

/** Convierte {count}/{version} a %1$s/%2$s respetando el orden de la base. */
function androidValue(key, value, baseValue) {
  const names = [];
  for (const match of baseValue.matchAll(PLACEHOLDER)) {
    if (!names.includes(match[1])) names.push(match[1]);
  }
  let converted = value;
  names.forEach((name, index) => {
    converted = converted.split(`{${name}}`).join(`%${index + 1}$s`);
  });
  if (/\{[A-Za-z0-9_]+\}/.test(converted)) {
    throw new Error(`${key}: marcador de posición sin convertir en "${value}"`);
  }
  return escapeAndroid(converted);
}

function renderAndroid(keys, catalog, baseCatalog, tag) {
  const lines = [
    '<?xml version="1.0" encoding="utf-8"?>',
    `<!-- GENERADO por packages/i18n/src/generate.mjs — no editar a mano. Idioma: ${tag} -->`,
    "<resources>"
  ];
  for (const key of keys) {
    lines.push(
      `    <string name="${androidResourceName(key)}">${androidValue(key, catalog[key], baseCatalog[key])}</string>`
    );
  }
  lines.push("</resources>", "");
  return lines.join("\n");
}

function renderLocaleConfig() {
  const lines = [
    '<?xml version="1.0" encoding="utf-8"?>',
    "<!-- GENERADO por packages/i18n/src/generate.mjs — no editar a mano. -->",
    '<locale-config xmlns:android="http://schemas.android.com/apk/res/android">'
  ];
  for (const locale of REAL_LOCALES) {
    lines.push(`    <locale android:name="${locale.tag}" />`);
  }
  lines.push("</locale-config>", "");
  return lines.join("\n");
}

function renderWebIndex() {
  const lines = [
    "// GENERADO por packages/i18n/src/generate.mjs — no editar a mano.",
    "// Recursos de i18next compartidos por la PWA (mismas claves que Android)."
  ];
  LOCALES.forEach((locale, index) => {
    lines.push(`import catalog${index} from "./${locale.tag}.json";`);
  });
  lines.push("", "export const resources = {");
  LOCALES.forEach((locale, index) => {
    lines.push(`  ${JSON.stringify(locale.tag)}: { translation: catalog${index} },`);
  });
  lines.push("} as const;", "");
  lines.push("export const LOCALE_TAGS = [");
  LOCALES.forEach((locale) => lines.push(`  ${JSON.stringify(locale.tag)},`));
  lines.push("] as const;", "");
  return lines.join("\n");
}

function loadCatalogs() {
  const catalogs = {};
  for (const { tag } of LOCALES) {
    if (tag === "es-XA") continue;
    catalogs[tag] = readJson(path.join(SOURCE_LOCALES, `${tag}.json`));
  }
  const pseudoCatalog = {};
  for (const key of Object.keys(catalogs[BASE_LOCALE])) {
    pseudoCatalog[key] = pseudoLocalize(catalogs[BASE_LOCALE][key]);
  }
  const pseudoFile = path.join(SOURCE_LOCALES, "es-XA.json");
  if (CHECK) {
    if (!fs.existsSync(pseudoFile)) throw new Error("Falta src/locales/es-XA.json");
    catalogs["es-XA"] = readJson(pseudoFile);
  } else {
    catalogs["es-XA"] = pseudoCatalog;
  }
  return { catalogs, pseudoCatalog };
}

function main() {
  const { catalogs, pseudoCatalog } = loadCatalogs();
  const errors = [...validateCatalogs(catalogs), ...validatePseudo(catalogs, (base) => {
    const result = {};
    for (const key of Object.keys(base)) result[key] = pseudoLocalize(base[key]);
    return result;
  })];
  if (errors.length) {
    console.error("Catálogo de idiomas inválido:");
    errors.forEach((error) => console.error(`  - ${error}`));
    process.exit(1);
  }

  // Colisiones de nombres de recurso (home.module.3d → home_module_3d, etc.)
  const keys = Object.keys(catalogs[BASE_LOCALE]);
  const androidNames = new Map();
  for (const key of keys) {
    const name = androidResourceName(key);
    if (androidNames.has(name)) {
      throw new Error(`Colisión de recurso Android: ${key} y ${androidNames.get(name)} → ${name}`);
    }
    androidNames.set(name, key);
  }

  const outputs = new Map();
  if (CHECK) {
    // En modo check también se compara el pseudo-local generado con el comprometido.
    const committedPseudo = readJson(path.join(SOURCE_LOCALES, "es-XA.json"));
    for (const key of keys) {
      if (committedPseudo[key] !== pseudoCatalog[key]) {
        throw new Error(`es-XA.json desactualizado en ${key}; ejecuta npm run i18n:build`);
      }
    }
  } else {
    fs.writeFileSync(
      path.join(SOURCE_LOCALES, "es-XA.json"),
      `${JSON.stringify(pseudoCatalog, null, 2)}\n`,
      "utf8"
    );
  }

  for (const locale of LOCALES) {
    const catalog = catalogs[locale.tag];
    const xml = renderAndroid(keys, catalog, catalogs[BASE_LOCALE], locale.tag);
    outputs.set(path.join(ANDROID_RES, locale.androidFolder, "strings.xml"), xml);
    outputs.set(
      path.join(WEB_LOCALES, `${locale.tag}.json`),
      `${JSON.stringify(catalog, null, 2)}\n`
    );
  }
  outputs.set(path.join(ANDROID_RES, "xml/locales_config.xml"), renderLocaleConfig());
  outputs.set(path.join(WEB_LOCALES, "index.ts"), renderWebIndex());

  let drift = 0;
  for (const [file, content] of outputs) {
    const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
    const same = current === content;
    if (CHECK) {
      if (!same) {
        drift += 1;
        console.error(`Desactualizado: ${path.relative(REPO_ROOT, file)}`);
      }
    } else if (!same) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, content, "utf8");
      console.log(`Escrito: ${path.relative(REPO_ROOT, file)}`);
    }
  }

  if (CHECK) {
    if (drift) {
      console.error(`\n${drift} archivo(s) generados no están al día. Ejecuta: npm run i18n:build`);
      process.exit(1);
    }
    console.log(`i18n OK: ${LOCALES.length} idiomas, ${keys.length} claves, salidas al día.`);
  } else {
    console.log(`i18n generado: ${LOCALES.length} idiomas, ${keys.length} claves.`);
  }
}

main();
