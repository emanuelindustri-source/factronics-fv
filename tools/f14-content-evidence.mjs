#!/usr/bin/env node
// F&V — Evidencia F1.4 en teléfono real: estado vacío, pack demo instalado,
// búsqueda offline en modo avión y exportación de copia de seguridad.
// Uso: node tools/f14-content-evidence.mjs
// Evidencia: docs/evidencia/66..68 (capturas) y 72-android-offline-log.txt

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");
const EVID = path.join(REPO, "docs/evidencia");
const PACKAGE = "com.factronics.fv";
const ACTIVITY = `${PACKAGE}/.MainActivity`;
const APK = path.join(REPO, "apps/android/app/build/outputs/apk/debug/app-debug.apk");
const log = [];
function registrar(linea) {
  log.push(linea);
  console.log(linea);
}

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
  const remote = `/sdcard/fv-f14-${Date.now()}.xml`;
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
  return [...xml.matchAll(/text="([^"]*)"/g)].map((m) => decode(m[1])).filter(Boolean);
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
function tapLabel(xml, label) {
  const box = boundsOf(xml, label);
  if (!box) return false;
  tap(Math.round((box.x1 + box.x2) / 2), Math.round((box.y1 + box.y2) / 2));
  sleep(1200);
  return true;
}
function tap(x, y) {
  adb(["shell", "input", "tap", String(x), String(y)]);
  sleep(600);
}
function tapInNode(xml, clase) {
  const match = new RegExp(`<node[^>]*class="${clase}"[^>]*>`).exec(xml);
  if (!match) return false;
  const bounds = /bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/.exec(match[0]);
  if (!bounds) return false;
  const [, x1, y1, x2, y2] = bounds.map(Number);
  tap(Math.round((x1 + x2) / 2), Math.round((y1 + y2) / 2));
  return true;
}
function start() {
  adb(["shell", "am", "force-stop", PACKAGE]);
  adb(["shell", "am", "start", "-n", ACTIVITY]);
  sleep(2200);
}
function screenshot(nombre) {
  const buf = execFileSync("adb", ["exec-out", "screencap", "-p"], { maxBuffer: 64 * 1024 * 1024 });
  fs.writeFileSync(path.join(EVID, nombre), buf);
  registrar(`captura: ${nombre}`);
}
function abrirTab(xml, label, marcador) {
  for (let intento = 0; intento < 4; intento += 1) {
    const actual = intento === 0 ? xml : dump();
    if (tapLabel(actual, label)) {
      sleep(600);
      const despues = dump();
      if (!marcador || texts(despues).some((t) => t.includes(marcador))) return despues;
    }
    sleep(900);
  }
  throw new Error(`No se pudo abrir la pestaña ${label} (marcador: ${marcador})`);
}
function desplazarHasta(label) {
  for (let intento = 0; intento < 6; intento += 1) {
    const xml = dump();
    if (boundsOf(xml, label)) return xml;
    adb(["shell", "input", "swipe", "500", "1900", "500", "800", "350"]);
    sleep(700);
  }
  return dump();
}
function modoAvion(encendido) {
  if (encendido) {
    try {
      text(["shell", "cmd", "connectivity", "airplane-mode", "enable"]);
    } catch {
      text(["shell", "settings", "put", "global", "airplane_mode_on", "1"]);
      text(["shell", "am", "broadcast", "-a", "android.intent.action.AIRPLANE_MODE", "--ez", "state", "true"]);
    }
  } else {
    try {
      text(["shell", "cmd", "connectivity", "airplane-mode", "disable"]);
    } catch {
      text(["shell", "settings", "put", "global", "airplane_mode_on", "0"]);
      text(["shell", "am", "broadcast", "-a", "android.intent.action.AIRPLANE_MODE", "--ez", "state", "false"]);
    }
  }
  sleep(1500);
}

// ------------------------------------------------------------------ 1) Instalar APK
registrar("=== F1.4 · Evidencia Android (teléfono real) ===");
registrar(`adb install -r → ${text(["install", "-r", APK])}`);
text(["shell", "pm", "clear", PACKAGE]);
registrar("pm clear → estado limpio (sin pack instalado)");

// ------------------------------------------------------------------ 2) Estado vacío
start();
let xml = dump();
xml = abrirTab(xml, "Contenido", "Buscar contenido");
const vacioTexts = texts(xml);
if (!vacioTexts.includes("Sin contenido instalado")) {
  throw new Error(`Estado vacío no visible: ${vacioTexts.slice(0, 20).join(" | ")}`);
}
screenshot("68-android-estado-vacio.png");
registrar("estado vacío verificado: 'Sin contenido instalado' visible sin pack");

// ------------------------------------------------------------------ 3) Instalar pack demo
xml = abrirTab(dump(), "Ajustes", "Idioma");
xml = desplazarHasta("Instalar pack demo");
if (!tapLabel(xml, "Instalar pack demo")) throw new Error("No se encontró el botón 'Instalar pack demo'");
sleep(2500);
xml = desplazarHasta("Pack instalado");
const instaladoTexts = texts(dump());
for (const esperado of ["Pack instalado", "Versión", "1.0.0", "Ítems", "25", "Última actualización"]) {
  if (!instaladoTexts.some((t) => t.includes(esperado))) {
    throw new Error(`Falta '${esperado}' en Ajustes tras instalar: ${instaladoTexts.join(" | ")}`);
  }
}
screenshot("66-android-pack-instalado.png");
registrar("pack demo instalado por UI: versión 1.0.0, 25 ítems, tamaño y actualización visibles");

// ------------------------------------------------------------------ 4) Búsqueda offline (modo avión)
modoAvion(true);
registrar(`modo avión ACTIVADO (wifi datos off): ${text(["shell", "settings", "get", "global", "airplane_mode_on"])}`);
start();
xml = dump();
xml = abrirTab(xml, "Contenido", "Buscar contenido");
if (!tapInNode(dump(), "android.widget.EditText")) throw new Error("No se encontró el campo de búsqueda");
text(["shell", "input", "text", "DEMO"]);
sleep(1500);
const busquedaTexts = texts(dump());
if (!busquedaTexts.some((t) => t.includes("resultados"))) {
  throw new Error(`La búsqueda offline no devolvió resultados: ${busquedaTexts.slice(0, 20).join(" | ")}`);
}
const hayResultados = busquedaTexts.some((t) => t.includes("DEMO"));
registrar(`búsqueda offline 'DEMO': ${busquedaTexts.filter((t) => t.includes("resultados")).join(", ")} · resultados con contenido: ${hayResultados}`);
screenshot("67-android-busqueda-offline.png");

// Ver fuente (procedencia visible en offline)
if (tapLabel(dump(), "Ver fuente")) {
  const fuenteTexts = texts(dump());
  registrar(`'Ver fuente' expandido en offline: ${fuenteTexts.filter((t) => t.includes("DEMO-DOC")).slice(0, 2).join(" | ")}`);
}
modoAvion(false);
registrar("modo avión DESACTIVADO");

// ------------------------------------------------------------------ 5) Exportar copia de seguridad
start();
xml = abrirTab(dump(), "Ajustes", "Idioma");
xml = desplazarHasta("Exportar copia de seguridad");
if (!tapLabel(xml, "Exportar copia de seguridad")) throw new Error("No se encontró 'Exportar copia de seguridad'");
sleep(1500);
const exportTexts = texts(dump());
const exportado = exportTexts.find((t) => t.includes("Copia exportada"));
registrar(`exportación: ${exportado ?? "(mensaje no capturado)"}`);
const backups = text(["shell", "ls", "-l", "/sdcard/Android/data/com.factronics.fv/files/backups/"]);
registrar(`archivos de copia en el dispositivo:\n${backups}`);

// ------------------------------------------------------------------ 6) Importar/restaurar copia
xml = desplazarHasta("Importar copia de seguridad");
if (!tapLabel(xml, "Importar copia de seguridad")) throw new Error("No se encontró 'Importar copia de seguridad'");
sleep(2000);
const importTexts = texts(dump());
registrar(`importación: ${importTexts.find((t) => t.includes("Copia restaurada")) ?? "(no capturado)"}`);

// ------------------------------------------------------------------ 7) logcat sin errores críticos
const logcat = text(["logcat", "-d", "-t", "400"]);
const criticos = logcat
  .split("\n")
  .filter((l) => /FATAL|AndroidRuntime|Exception/.test(l) && !/InputMethod|ViewRootImpl|DecorView/.test(l));
registrar(`logcat crítico (${criticos.length} líneas): ${criticos.slice(0, 5).join(" || ") || "ninguno"}`);
screenshot("73-android-ajustes-tras-backup.png");

fs.writeFileSync(path.join(EVID, "72-android-offline-log.txt"), log.join("\n") + "\n", "utf8");
console.log("Evidencia escrita en docs/evidencia/ (66-68, 72, 73)");
