#!/usr/bin/env node
// F&V (by Factronics) — evidencia visual de temas/festividades en Android (F1.3).
// Usa el receptor SOLO-DEBUG para fijar preferencias y captura la pantalla de Inicio.
//
// Uso: node tools/festivity-evidence-android.mjs
// Salida: docs/evidencia/36..41 y 48-android-festividades.txt

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, "../docs/evidencia");
const PACKAGE = "com.factronics.fv";
const ACTIVITY = `${PACKAGE}/.MainActivity`;
const RECEIVER = `${PACKAGE}/.debug.DebugLocaleReceiver`;

const STATES = [
  { name: "Tema claro (sin festividad)", file: "36-android-tema-claro.png", theme: "light", festivity: "auto", sober: false, expected: null },
  { name: "Tema oscuro (sin festividad)", file: "37-android-tema-oscuro.png", theme: "dark", festivity: "auto", sober: false, expected: null },
  { name: "Navidad forzada", file: "38-android-navidad.png", theme: "light", festivity: "christmas", sober: false, expected: "Tema festivo: Navidad" },
  { name: "Carnaval forzado", file: "39-android-carnaval.png", theme: "light", festivity: "carnival", sober: false, expected: "Tema festivo: Carnaval" },
  { name: "Halloween forzado", file: "40-android-halloween.png", theme: "light", festivity: "halloween", sober: false, expected: "Tema festivo: Halloween" },
  { name: "Modo sobrio (Navidad suprimida)", file: "41-android-modo-sobrio.png", theme: "light", festivity: "christmas", sober: true, expected: null }
];

function adb(args) {
  return execFileSync("adb", args, { maxBuffer: 64 * 1024 * 1024 });
}
function adbText(args) {
  return adb(args).toString("utf8").trim();
}
function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}
function decode(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
function uiTexts() {
  const remote = `/sdcard/fv-fest-${Date.now()}.xml`;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      adbText(["shell", "uiautomator", "dump", remote]);
      const xml = adbText(["shell", "cat", remote]);
      adb(["shell", "rm", "-f", remote]);
      return [...xml.matchAll(/text="([^"]*)"/g)].map((m) => decode(m[1])).filter(Boolean);
    } catch {
      sleep(700);
    }
  }
  return [];
}
function setState(state) {
  adb(["shell", "am", "force-stop", PACKAGE]);
  adb(["shell", "am", "start", "-n", ACTIVITY]);
  sleep(500);
  adbText([
    "shell", "am", "broadcast", "-n", RECEIVER,
    "--es", "lang", "es-VE",
    "--es", "theme", state.theme,
    "--es", "festivity", state.festivity,
    "--ez", "sober", String(state.sober),
    "--ez", "festivities", "true",
    "--ez", "dynamic", "false"
  ]);
  sleep(500);
  adb(["shell", "am", "force-stop", PACKAGE]);
  adb(["shell", "am", "start", "-n", ACTIVITY]);
  sleep(1800);
}

fs.mkdirSync(OUT, { recursive: true });
const log = ["Evidencia de tema y festividades en Android (Redmi 22101316G, API 34)"];

for (const state of STATES) {
  setState(state);
  const texts = uiTexts();
  const hasExpected = state.expected ? texts.includes(state.expected) : true;
  const hasAnyFestivityLabel = texts.some((text) => text.startsWith("Tema festivo:"));
  const ok = state.expected ? hasExpected : !hasAnyFestivityLabel;
  log.push(`${ok ? "OK" : "FALLO"}: ${state.name} (${state.theme}, ${state.festivity}, sobrio=${state.sober})`);
  if (!ok) {
    log.push(`  textos: ${texts.slice(0, 8).join(" | ")}`);
  }
  fs.writeFileSync(
    path.join(OUT, state.file),
    adb(["exec-out", "screencap", "-p"])
  );
  console.log(`${ok ? "OK" : "FALLO"} ${state.name}`);
}

fs.writeFileSync(path.join(OUT, "48-android-festividades.txt"), `${log.join("\n")}\n`, "utf8");
console.log("Evidencia Android de festividades capturada.");
