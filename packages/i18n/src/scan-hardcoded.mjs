#!/usr/bin/env node
// F&V (by Factronics) — detector de textos de interfaz hardcodeados.
//
// Es una comprobación heurística y deliberadamente estricta: cualquier literal
// visible en pantallas debe venir del catálogo (stringResource/t). Las
// excepciones (marcas, nombres propios, endónimos de idiomas) viven en
// módulos marcados como no traducibles y están documentadas en ADR-0007.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BASE_LOCALE, LOCALES } from "./catalog.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "../../..");
const ANDROID_UI = path.join(REPO_ROOT, "apps/android/app/src/main/java/com/factronics/fv/ui");
const WEB_SRC = path.join(REPO_ROOT, "apps/web/src");
const BASE_CATALOG = JSON.parse(
  fs.readFileSync(path.join(HERE, `locales/${BASE_LOCALE}.json`), "utf8")
);

const IGNORED_LITERALS = new Set([
  "",
  ".",
  "·",
  "●",
  "✓",
  "—",
  "–",
  "…",
  "↑",
  "↓",
  "←",
  "→"
]);

function isIgnoredLiteral(value) {
  const trimmed = value.trim();
  if (IGNORED_LITERALS.has(trimmed)) return true;
  if (/^[\s\p{P}\p{S}\d]+$/u.test(trimmed)) return true;
  if (/^%[0-9]+\$[sd]$/.test(trimmed)) return true;
  return false;
}

function walk(dir, extension, result = []) {
  if (!fs.existsSync(dir)) return result;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, extension, result);
    else if (entry.name.endsWith(extension)) result.push(full);
  }
  return result;
}

function lineOf(source, index) {
  return source.slice(0, index).split("\n").length;
}

export function scanAndroid() {
  const issues = [];
  const knownResources = new Set([
    "about_team_names",
    "about_sources_value",
    ...Object.keys(BASE_CATALOG).map((key) =>
      key
        .replace(/\./g, "_")
        .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
        .toLowerCase()
    )
  ]);

  for (const file of walk(ANDROID_UI, ".kt")) {
    const source = fs.readFileSync(file, "utf8");
    const relative = path.relative(REPO_ROOT, file);

    const patterns = [
      /\bText\(\s*"((?:[^"\\]|\\.)*)"/g,
      /\btext\s*=\s*"((?:[^"\\]|\\.)*)"/g,
      /\bcontentDescription\s*=\s*"((?:[^"\\]|\\.)*)"/g
    ];
    for (const pattern of patterns) {
      for (const match of source.matchAll(pattern)) {
        if (isIgnoredLiteral(match[1])) continue;
        issues.push(`${relative}:${lineOf(source, match.index)} texto literal "${match[1]}"`);
      }
    }

    for (const match of source.matchAll(/R\.string\.([A-Za-z0-9_]+)/g)) {
      if (!knownResources.has(match[1])) {
        issues.push(`${relative}:${lineOf(source, match.index)} recurso inexistente R.string.${match[1]}`);
      }
    }
  }
  return issues;
}

export function scanWeb() {
  const issues = [];

  for (const file of walk(WEB_SRC, ".tsx")) {
    const source = fs.readFileSync(file, "utf8");
    const relative = path.relative(REPO_ROOT, file);

    const attributePattern = /\b(?:aria-label|placeholder|title|alt)="([^"]+)"/g;
    for (const match of source.matchAll(attributePattern)) {
      if (isIgnoredLiteral(match[1])) continue;
      issues.push(`${relative}:${lineOf(source, match.index)} atributo literal "${match[1]}"`);
    }

    const textNodePattern = /(?<!=)>([^<>{}\n]+)</g;
    for (const match of source.matchAll(textNodePattern)) {
      const value = match[1].trim();
      if (isIgnoredLiteral(value)) continue;
      // Evita falsos positivos de TypeScript (genéricos, comparaciones, código).
      if (/[=;(){}[\]`'"]/.test(value)) continue;
      if (/^(Promise|String|Boolean|Number|Array|Record|Partial|Readonly|void|string|number)$/.test(value)) continue;
      if (!/[A-Za-zÁ-ÿ\u00c0-\u024f\u0400-\u04ff\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af\u0900-\u097f]{2,}/u.test(value)) {
        continue;
      }
      issues.push(`${relative}:${lineOf(source, match.index)} texto JSX literal "${value}"`);
    }

    for (const match of source.matchAll(/\bt\(\s*"([^"]+)"/g)) {
      if (!(match[1] in BASE_CATALOG)) {
        issues.push(`${relative}:${lineOf(source, match.index)} clave inexistente en t("${match[1]}")`);
      }
    }
  }
  return issues;
}

export function scan() {
  return [...scanAndroid(), ...scanWeb()];
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const issues = scan();
  if (issues.length) {
    console.error(`Textos hardcodeados o referencias inválidas (${issues.length}):`);
    issues.forEach((issue) => console.error(`  - ${issue}`));
    process.exit(1);
  }
  console.log(`Sin textos hardcodeados: ${LOCALES.length} idiomas, ${Object.keys(BASE_CATALOG).length} claves.`);
}
