#!/usr/bin/env node
// F&V (by Factronics) — capturas PWA de tema y festividades (F1.3).
// Requiere `npm run preview` en http://localhost:4173.
//
// Uso: node scripts/capture-festivity-evidence.mjs
// Salida: docs/evidencia/42..47

import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, "../../../docs/evidencia");
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const base = "http://localhost:4173/";

async function shot({ file, theme, festivity, sober }) {
  const context = await browser.newContext({ viewport: { width: 420, height: 900 } });
  await context.addInitScript(() => localStorage.setItem("fv.lang", "es-VE"));
  const page = await context.newPage();
  await page.goto(base);
  await page.locator(".nav button").nth(2).click();
  await page.getByLabel("Claro", { exact: true }).check();
  if (theme === "dark") await page.getByLabel("Oscuro", { exact: true }).check();
  if (festivity !== "auto") {
    await page.locator("#festivity-override").selectOption(festivity);
  }
  if (sober) await page.getByLabel("Modo sobrio").check();
  await page.locator(".nav button").nth(0).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, file), fullPage: true });
  await context.close();
  console.log(`Captura: ${file}`);
}

await shot({ file: "42-pwa-tema-claro.png", theme: "light", festivity: "auto", sober: false });
await shot({ file: "43-pwa-tema-oscuro.png", theme: "dark", festivity: "auto", sober: false });
await shot({ file: "44-pwa-navidad.png", theme: "light", festivity: "christmas", sober: false });
await shot({ file: "45-pwa-carnaval.png", theme: "light", festivity: "carnival", sober: false });
await shot({ file: "46-pwa-halloween.png", theme: "light", festivity: "halloween", sober: false });
await shot({ file: "47-pwa-modo-sobrio.png", theme: "light", festivity: "christmas", sober: true });

await browser.close();
console.log("Evidencia PWA de festividades capturada.");
