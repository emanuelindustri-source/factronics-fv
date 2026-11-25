// Captura de evidencia de la PWA y el portal (Fase 0).
// Uso: node scripts/capture-evidence.mjs  (requiere servidores preview activos)
import { chromium } from "@playwright/test";

const out = "../../docs/evidencia";
const browser = await chromium.launch();

// --- PWA ---
const pwa = await browser.newPage({ viewport: { width: 420, height: 900 } });
await pwa.goto("http://localhost:4173/");
await pwa.waitForTimeout(800);
await pwa.screenshot({ path: `${out}/12-pwa-online.png`, fullPage: true });

// Perfil con datos en IndexedDB
await pwa.getByRole("button", { name: "Perfil" }).click();
await pwa.getByLabel("Nombre").fill("Khristyan Hidalgo");
await pwa.getByRole("button", { name: "Guardar" }).click();
await pwa.waitForTimeout(400);

// Offline: recarga sin red
await pwa.context().setOffline(true);
await pwa.reload();
await pwa.waitForTimeout(800);
await pwa.screenshot({ path: `${out}/13-pwa-offline.png`, fullPage: true });
await pwa.context().setOffline(false);
await pwa.close();

// --- Portal ---
const portal = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await portal.goto("http://localhost:4321/factronics-fv/");
await portal.waitForTimeout(800);
await portal.screenshot({ path: `${out}/14-portal.png`, fullPage: true });
await portal.close();

await browser.close();
console.log("Evidencia capturada");
