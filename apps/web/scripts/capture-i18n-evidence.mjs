#!/usr/bin/env node
// F&V (by Factronics) — capturas de evidencia de la PWA en 3 idiomas (gate F1.2).
// Requiere el preview de la PWA en http://localhost:4173 (npm run preview).
//
// Uso: node scripts/capture-i18n-evidence.mjs

import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, "../../../docs/evidencia");
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const base = "http://localhost:4173/";

async function shot(tag, file, settings = false, special = false) {
  const context = await browser.newContext({ viewport: { width: 420, height: 900 } });
  await context.addInitScript(
    ([language, unlock]) => {
      localStorage.setItem("fv.lang", language);
      localStorage.setItem("fv.special", unlock ? "1" : "0");
    },
    [tag, special]
  );
  const page = await context.newPage();
  await page.goto(base);
  await page.waitForTimeout(500);
  if (settings) {
    await page.locator(".nav button").nth(2).click();
    await page.waitForTimeout(300);
    // Solo para la captura: oculta la barra fija para no tapar el ejemplo de formato.
    await page.addStyleTag({ content: ".nav { display: none !important; }" });
    await page.screenshot({ path: path.join(OUT, file), fullPage: true });
  } else {
    await page.screenshot({ path: path.join(OUT, file), fullPage: true });
  }
  await context.close();
  console.log(`Captura: ${file}`);
}

await shot("es-VE", "19-pwa-es-VE.png");
await shot("ja", "20-pwa-ja.png");
await shot("hi", "21-pwa-hi.png");
await shot("es-VE", "22-pwa-ajustes-es-VE.png", true);
await shot("es-XA", "26-pwa-pseudo.png", false, true);

await browser.close();
console.log("Evidencia PWA capturada.");
