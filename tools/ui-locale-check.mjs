#!/usr/bin/env node
// F&V (by Factronics) — verificación del selector de idioma por la UI real (gate F1.2).
// No usa el hook de debug para cambiar el idioma: toca Ajustes y las filas de idioma
// como lo haría una persona. Deja constancia en docs/evidencia/28b-android-selector.txt.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..");
const OUT = path.join(REPO_ROOT, "docs/evidencia/28b-android-selector.txt");
const PACKAGE = "com.factronics.fv";
const ACTIVITY = `${PACKAGE}/.MainActivity`;

function adb(args) {
  return execFileSync("adb", args, { maxBuffer: 32 * 1024 * 1024, encoding: "utf8" }).trim();
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

function dump() {
  const remote = `/sdcard/fv-selector-${Date.now()}.xml`;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      adb(["shell", "uiautomator", "dump", remote]);
      const xml = adb(["shell", "cat", remote]);
      adb(["shell", "rm", "-f", remote]);
      return xml;
    } catch {
      sleep(800);
    }
  }
  throw new Error("uiautomator dump falló");
}

function texts(xml) {
  return [...xml.matchAll(/text="([^"]*)"/g)].map((match) => decode(match[1])).filter(Boolean);
}

function nodeBounds(xml, label, minY = 0) {
  for (const match of xml.matchAll(/<node[^>]*>/g)) {
    const node = match[0];
    const text = /text="([^"]*)"/.exec(node)?.[1];
    if (!text || decode(text) !== label) continue;
    const bounds = /bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/.exec(node);
    if (!bounds) continue;
    const [, x1, y1, x2, y2] = bounds.map(Number);
    if (y1 < minY) continue;
    return { x: Math.round((x1 + x2) / 2), y: Math.round((y1 + y2) / 2) };
  }
  return null;
}

function tap(x, y) {
  adb(["shell", "input", "tap", String(x), String(y)]);
}

function tapLabel(label, minY = 0) {
  const xml = dump();
  const point = nodeBounds(xml, label, minY);
  if (!point) throw new Error(`No se encontró "${label}" en la pantalla`);
  tap(point.x, point.y);
  sleep(1200);
}

function start(tag) {
  adb(["shell", "am", "force-stop", PACKAGE]);
  adb(["shell", "am", "start", "-n", ACTIVITY]);
  sleep(1200);
  adb([
    "shell", "am", "broadcast",
    "-n", `${PACKAGE}/.debug.DebugLocaleReceiver`,
    "--es", "lang", tag
  ]);
  sleep(500);
  adb(["shell", "am", "force-stop", PACKAGE]);
  adb(["shell", "am", "start", "-n", ACTIVITY]);
  sleep(1800);
}

const lines = [];
function log(message) {
  lines.push(message);
  console.log(message);
}

try {
  log("Verificación del selector de idioma por UI real (Redmi 22101316G, API 34)");

  // 1) Español de Venezuela → Ajustes → English
  start("es-VE");
  let xml = dump();
  if (!texts(xml).includes("Hola, F&V")) throw new Error("No arrancó en español");
  tapLabel("Ajustes", 1800);
  xml = dump();
  if (!texts(xml).includes("Idioma")) throw new Error("No se abrió Ajustes en español");
  log("OK: Ajustes abierto en español de Venezuela");
  tapLabel("English", 400);
  xml = dump();
  const english = texts(xml);
  if (!english.includes("Language") || !english.includes("Settings")) {
    throw new Error(`La UI no cambió a inglés: ${english.slice(0, 8).join(" | ")}`);
  }
  const prefsEn = adb(["shell", "run-as", PACKAGE, "cat", "shared_prefs/fv_settings.xml"]);
  if (!prefsEn.includes(">en<")) throw new Error("La preferencia no se guardó como en");
  log("OK: selector cambió a English y persistió la preferencia");

  // 2) English → Settings → Español (Venezuela)
  tapLabel("Settings", 1800);
  xml = dump();
  tapLabel("Español (Venezuela)", 300);
  xml = dump();
  const spanish = texts(xml);
  if (!spanish.includes("Idioma") || !spanish.includes("Ajustes")) {
    throw new Error(`La UI no volvió a español: ${spanish.slice(0, 8).join(" | ")}`);
  }
  const prefsEs = adb(["shell", "run-as", PACKAGE, "cat", "shared_prefs/fv_settings.xml"]);
  if (!prefsEs.includes(">es-VE<")) throw new Error("La preferencia no se guardó como es-VE");
  log("OK: selector volvió a Español (Venezuela) y persistió es-VE");

  // 3) Persistencia tras force-stop (sin cambiar nada)
  adb(["shell", "am", "force-stop", PACKAGE]);
  adb(["shell", "am", "start", "-n", ACTIVITY]);
  sleep(1800);
  xml = dump();
  if (!texts(xml).includes("Hola, F&V")) throw new Error("El idioma no persistió tras reiniciar");
  log("OK: el idioma persiste tras cerrar y abrir la app");

  log("RESULTADO: selector in-app verificado en teléfono real");
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${lines.join("\n")}\n`, "utf8");
  console.log(`Evidencia: ${path.relative(REPO_ROOT, OUT)}`);
} catch (error) {
  lines.push(`FALLO: ${error.message}`);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${lines.join("\n")}\n`, "utf8");
  console.error(error.message);
  process.exit(1);
}
