#!/usr/bin/env node
// F&V (by Factronics) — verificación del opt-out/modo sobrio por UI real en Android.
// Uso: node tools/festivity-ui-check.mjs
// Evidencia: docs/evidencia/49-android-festividad-ui.txt

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");
const OUT = path.join(REPO, "docs/evidencia/49-android-festividad-ui.txt");
const PACKAGE = "com.factronics.fv";
const ACTIVITY = `${PACKAGE}/.MainActivity`;
const RECEIVER = `${PACKAGE}/.debug.DebugLocaleReceiver`;

function adb(args) {
  return execFileSync("adb", args, { maxBuffer: 64 * 1024 * 1024 });
}
function text(args) {
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
function dump() {
  const remote = `/sdcard/fv-festui-${Date.now()}.xml`;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      text(["shell", "uiautomator", "dump", remote]);
      const xml = text(["shell", "cat", remote]);
      adb(["shell", "rm", "-f", remote]);
      return xml;
    } catch {
      sleep(700);
    }
  }
  throw new Error("uiautomator dump falló");
}
function texts(xml) {
  return [...xml.matchAll(/text="([^"]*)"/g)].map((match) => decode(match[1])).filter(Boolean);
}
function boundsOf(xml, label) {
  for (const match of xml.matchAll(/<node[^>]*>/g)) {
    const node = match[0];
    const value = /text="([^"]*)"/.exec(node)?.[1];
    if (!value || decode(value) !== label) continue;
    const bounds = /bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/.exec(node);
    if (!bounds) continue;
    const [, x1, y1, x2, y2] = bounds.map(Number);
    return { x1, y1, x2, y2 };
  }
  return null;
}
function tap(x, y) {
  adb(["shell", "input", "tap", String(x), String(y)]);
}
function start() {
  adb(["shell", "am", "force-stop", PACKAGE]);
  adb(["shell", "am", "start", "-n", ACTIVITY]);
  sleep(1800);
}
function setState(overrides) {
  start();
  adb([
    "shell", "am", "broadcast", "-n", RECEIVER,
    "--es", "lang", "es-VE",
    "--es", "theme", "light",
    "--es", "festivity", overrides.festivity ?? "christmas",
    "--ez", "sober", String(overrides.sober ?? false),
    "--ez", "festivities", String(overrides.enabled ?? true),
    "--ez", "dynamic", "false"
  ]);
  sleep(500);
  start();
}
function openSettings() {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    tap(676, 2346);
    sleep(1200);
    if (texts(dump()).includes("Idioma")) return;
  }
  throw new Error("No se pudo abrir Ajustes");
}
function scrollTo(label) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const xml = dump();
    const box = boundsOf(xml, label);
    if (box) return xml;
    adb(["shell", "input", "swipe", "500", "1900", "500", "800", "350"]);
    sleep(700);
  }
  throw new Error(`No se encontró "${label}" al desplazar`);
}
function toggle(label) {
  const xml = scrollTo(label);
  const box = boundsOf(xml, label);
  tap(980, Math.round((box.y1 + box.y2) / 2));
  sleep(1000);
  return dump();
}

const lines = [];
function log(message) {
  lines.push(message);
  console.log(message);
}

try {
  log("Verificación de festividades por UI real (Redmi 22101316G, API 34)");
  setState({ festivity: "christmas", sober: false, enabled: true });

  openSettings();
  let xml = scrollTo("Modo sobrio");
  if (!texts(xml).includes("Tema festivo: Navidad")) {
    throw new Error("No aparece la etiqueta de Navidad antes de la prueba");
  }
  log("OK: Navidad activa visible en Ajustes");

  xml = toggle("Modo sobrio");
  if (texts(xml).includes("Tema festivo: Navidad")) {
    throw new Error("Modo sobrio no ocultó la festividad");
  }
  log("OK: Modo sobrio oculta la festividad");

  xml = toggle("Modo sobrio");
  if (!texts(xml).includes("Tema festivo: Navidad")) {
    throw new Error("Al desactivar modo sobrio no volvió la festividad");
  }
  log("OK: al desactivar modo sobrio vuelve la festividad");

  xml = toggle("Festividades");
  if (texts(xml).includes("Tema festivo: Navidad")) {
    throw new Error("Desactivar festividades no ocultó la festividad");
  }
  log("OK: desactivar festividades oculta la festividad");

  // Persistencia: reiniciar y comprobar que sigue desactivada en Inicio.
  start();
  xml = dump();
  if (texts(xml).some((value) => value.startsWith("Tema festivo:"))) {
    throw new Error("La desactivación no persistió tras reiniciar");
  }
  log("OK: la desactivación persiste tras cerrar y abrir");

  // Dejar el teléfono limpio: festividades activas en automático.
  setState({ festivity: "auto", sober: false, enabled: true });
  log("RESULTADO: opt-out y modo sobrio verificados en teléfono real");
  fs.writeFileSync(OUT, `${lines.join("\n")}\n`, "utf8");
  console.log(`Evidencia: ${path.relative(REPO, OUT)}`);
} catch (error) {
  lines.push(`FALLO: ${error.message}`);
  fs.writeFileSync(OUT, `${lines.join("\n")}\n`, "utf8");
  console.error(error.message);
  process.exit(1);
}
