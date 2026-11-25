#!/usr/bin/env node
// F&V (by Factronics) — smoke test real de idiomas en Android (gate F1.2).
//
// Requisitos: teléfono/emulador con la APK debug instalada y adb en PATH.
// Usa el receptor SOLO-DEBUG (src/debug) para fijar el idioma, reinicia la app
// y verifica con uiautomator que la interfaz renderiza el idioma esperado.
//
// Uso: node tools/smoke-i18n-android.mjs
// Evidencia: docs/evidencia/23..27 (capturas) y 28 (informe JSON).

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..");
const LOCALES_DIR = path.join(REPO_ROOT, "packages/i18n/src/locales");
const EVIDENCE = path.join(REPO_ROOT, "docs/evidencia");
const PACKAGE = "com.factronics.fv";
const ACTIVITY = `${PACKAGE}/.MainActivity`;
const SCREENSHOTS = {
  "es-VE": "23-android-es-VE.png",
  ja: "24-android-ja.png",
  hi: "25-android-hi.png",
  "es-XA": "27-android-pseudo.png"
};

const ALL = [
  "es-VE", "en", "pt-BR", "pt-PT", "it", "de", "fr",
  "zh-Hans", "ja", "ko", "hi", "la", "es-XA"
];

const TEAM = "Eduardo Rodríguez · Luis Iungano · José Tovar · José Gabriel Ríos · Elián Inojosa · Mariana Cerdeño";
const SOURCES = "factronics.com.ve · videojet.com";

function adb(args, options = {}) {
  return execFileSync("adb", args, { maxBuffer: 64 * 1024 * 1024, ...options });
}

function adbText(args) {
  return adb(args, { encoding: "utf8" }).trim();
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function decodeXml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function readUiTexts() {
  const remote = `/sdcard/fv-ui-${Date.now()}.xml`;
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      adbText(["shell", "uiautomator", "dump", remote]);
      const xml = adbText(["shell", "cat", remote]);
      adb(["shell", "rm", "-f", remote]);
      const texts = [];
      for (const match of xml.matchAll(/(?:text|content-desc)="([^"]*)"/g)) {
        const value = decodeXml(match[1]).trim();
        if (value) texts.push(value);
      }
      return [...new Set(texts)];
    } catch (error) {
      lastError = error;
      sleep(800);
    }
  }
  throw lastError;
}

function startApp() {
  adbText(["shell", "am", "force-stop", PACKAGE]);
  adbText(["shell", "am", "start", "-n", ACTIVITY]);
}

function setLanguage(tag) {
  adbText(["shell", "am", "start", "-n", ACTIVITY]);
  sleep(400);
  adbText([
    "shell", "am", "broadcast",
    "-a", `${PACKAGE}.DEBUG_SET_LANG`,
    "--es", "lang", tag
  ]);
  sleep(700);
  startApp();
}

function waitForGreeting(expected) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    sleep(600);
    const texts = readUiTexts();
    if (texts.some((text) => text.includes(expected))) return texts;
  }
  return readUiTexts();
}

function capture(name) {
  const buffer = adb(["exec-out", "screencap", "-p"]);
  fs.writeFileSync(path.join(EVIDENCE, name), buffer);
}

function main() {
  const devices = adbText(["devices"]);
  if (!devices.split("\n").some((line) => /\tdevice$/.test(line.trim()))) {
    console.error("No hay dispositivo ADB conectado.");
    console.error(devices);
    process.exit(1);
  }
  if (!adbText(["shell", "pm", "list", "packages", PACKAGE]).includes(PACKAGE)) {
    console.error(`La app ${PACKAGE} no está instalada (build debug).`);
    process.exit(1);
  }
  fs.mkdirSync(EVIDENCE, { recursive: true });

  const report = [];
  let failures = 0;

  for (const tag of ALL) {
    const catalog = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, `${tag}.json`), "utf8"));
    const expected = catalog["home.greeting"];
    setLanguage(tag);
    const texts = waitForGreeting(expected);
    const joined = texts.join("\n");

    const checks = [];
    checks.push({
      name: "saludo del locale visible",
      ok: texts.some((text) => text.includes(expected))
    });
    checks.push({ name: "sin marcadores de pseudo-local", ok: !joined.includes("⟦") || tag === "es-XA" });
    checks.push({ name: "sin marcadores sin interpolar", ok: !joined.includes("{days}") && !joined.includes("{version}") });
    checks.push({ name: "sin claves crudas", ok: !/home\.greeting|nav\.settings|about\.versionValue/.test(joined) });

    if (tag === "es-XA") {
      const allow = new Set([TEAM, SOURCES, "KH", "Khristyan Hidalgo", "Factronics, C.A."]);
      const suspicious = texts.filter((text) => {
        const clean = text.replace(/^[●✓]\s*/, "");
        if (allow.has(clean)) return false;
        if (/^[\d\s.,:/%+\-–—\u00A0]+$/.test(clean)) return false;
        return !clean.includes("⟦");
      });
      checks.push({ name: "todos los textos están pseudo-localizados", ok: suspicious.length === 0 });
      if (suspicious.length) {
        checks.push({ name: "textos sospechosos", ok: false, detail: suspicious.slice(0, 8) });
      }
    }

    const failed = checks.filter((check) => !check.ok);
    if (failed.length) failures += 1;
    if (SCREENSHOTS[tag]) capture(SCREENSHOTS[tag]);

    report.push({
      locale: tag,
      ok: failed.length === 0,
      textCount: texts.length,
      checks,
      sample: texts.slice(0, 6)
    });
    console.log(`${failed.length ? "FALLO" : "OK   "} ${tag} (${texts.length} textos)`);
  }

  fs.writeFileSync(
    path.join(EVIDENCE, "28-android-smoke-i18n.json"),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), device: adbText(["shell", "getprop", "ro.product.model"]), report }, null, 2)}\n`
  );

  if (failures) {
    console.error(`\n${failures} locale(s) con fallos. Ver docs/evidencia/28-android-smoke-i18n.json`);
    process.exit(1);
  }
  console.log(`\nSmoke Android OK: ${ALL.length} locales.`);
}

main();
