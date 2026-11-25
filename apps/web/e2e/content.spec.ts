// Pruebas E2E de contenido offline (F1.4): estado vacío claro, instalación del
// pack demo con verificación de hash+firma, búsqueda sin red, backup
// export/limpiar/restaurar y rechazo de copias corruptas.
// Uso: npm run build && npx playwright test e2e/content.spec.ts
import { test, expect, type Page } from "@playwright/test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const t: Record<string, string> = JSON.parse(
  readFileSync(fileURLToPath(new URL("../src/locales/es-VE.json", import.meta.url)), "utf8")
);

async function openApp(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("fv.lang", "es-VE");
    localStorage.setItem("fv.special", "1");
  });
  await page.goto("http://localhost:4173/");
}

async function abrirTab(page: Page, label: string) {
  await page.getByRole("button", { name: label, exact: true }).click();
  await page.waitForTimeout(300);
}

async function instalarDemo(page: Page) {
  await abrirTab(page, t["nav.settings"]);
  await page.getByRole("button", { name: t["packs.installDemo"] }).click();
  await expect(page.getByText(t["packs.installedOk"])).toBeVisible();
}

test("estado vacío claro sin pack instalado (sin contenido inventado)", async ({ page }) => {
  await openApp(page);
  await abrirTab(page, t["nav.content"]);
  await expect(page.getByRole("heading", { name: t["search.title"] })).toBeVisible();
  await expect(page.getByText(t["packs.status.none.title"])).toBeVisible();
  await expect(page.getByText(t["packs.status.none.desc"])).toBeVisible();
  await page.screenshot({ path: "../../docs/evidencia/71-pwa-estado-vacio.png", fullPage: true });
});

test("instalar pack demo y buscar offline (modo avión)", async ({ page, context }) => {
  await openApp(page);
  await instalarDemo(page);

  // Estado del pack en Ajustes: versión, tamaño, actualización e ítems.
  await expect(page.getByText(t["packs.status.installed"], { exact: true })).toBeVisible();
  await expect(page.getByText("1.0.0")).toBeVisible();
  await expect(page.getByText("25", { exact: true })).toBeVisible();
  await page.screenshot({ path: "../../docs/evidencia/69-pwa-pack-instalado.png", fullPage: true });

  // Búsqueda online.
  await abrirTab(page, t["nav.content"]);
  await page.locator("#content-search").fill("DEMO");
  await expect(page.getByText(/25/).first()).toBeVisible();
  await expect(page.getByText(new RegExp(t["search.results"].replace("{total}", "\\d+")))).toBeVisible();

  // Ver fuente (procedencia del contenido demo).
  await page.getByRole("button", { name: t["search.item.source"] }).first().click();
  await expect(page.getByText(/DEMO-DOC/).first()).toBeVisible();

  // Sin red: la app abre y busca con el pack instalado.
  await context.setOffline(true);
  await page.reload();
  await abrirTab(page, t["nav.content"]);
  await page.locator("#content-search").fill("DEMO");
  await expect(page.getByText(new RegExp(t["search.results"].replace("{total}", "\\d+")))).toBeVisible();
  await page.screenshot({ path: "../../docs/evidencia/70-pwa-busqueda-offline.png", fullPage: true });
  await context.setOffline(false);
});

test("backup: exportar, limpiar y restaurar (round-trip)", async ({ page }) => {
  await openApp(page);
  await instalarDemo(page);

  // Exportar copia de seguridad (descarga real del archivo fv-backup).
  const descarga = page.waitForEvent("download");
  await page.getByRole("button", { name: t["packs.export"] }).click();
  const archivo = await descarga;
  const dir = mkdtempSync(join(tmpdir(), "fv-backup-"));
  const ruta = join(dir, "fv-backup-test.json");
  await archivo.saveAs(ruta);
  await expect(page.getByText(new RegExp(t["packs.exported"].replace("{name}", ".*")))).toBeVisible();

  // Limpiar contenido → estado vacío.
  await page.getByRole("button", { name: t["packs.clear"] }).click();
  await expect(page.getByText(t["packs.removed"])).toBeVisible();
  await expect(page.getByText(t["packs.status.none.title"])).toBeVisible();

  // Restaurar la copia → mismo contenido (almacén limpio).
  await page.locator('input[type="file"]').setInputFiles(ruta);
  await expect(page.getByText(t["packs.imported"])).toBeVisible();
  await expect(page.getByText("25", { exact: true })).toBeVisible();

  // La búsqueda vuelve a encontrar los 25 ítems.
  await abrirTab(page, t["nav.content"]);
  await page.locator("#content-search").fill("DEMO");
  await expect(page.getByText(new RegExp(t["search.results"].replace("{total}", "\\d+")))).toBeVisible();
});

test("backup corrupto se rechaza sin restaurar nada", async ({ page }) => {
  await openApp(page);
  await instalarDemo(page);

  const descarga = page.waitForEvent("download");
  await page.getByRole("button", { name: t["packs.export"] }).click();
  const archivo = await descarga;
  const dir = mkdtempSync(join(tmpdir(), "fv-backup-corrupto"));
  const ruta = join(dir, "fv-backup-corrupto.json");
  await archivo.saveAs(ruta);

  // Un bit alterado (idioma cambiado sin recalcular el checksum) ⇒ rechazo.
  const texto = readFileSync(ruta, "utf8").replace('"es-VE"', '"es-VX"');
  const corrupta = join(dir, "fv-backup-alterado.json");
  writeFileSync(corrupta, texto, "utf8");

  await page.locator('input[type="file"]').setInputFiles(corrupta);
  await expect(page.getByText(t["errors.backupCorrupt"])).toBeVisible();

  // El contenido instalado sigue intacto (nunca se restaura a medias).
  await expect(page.getByText("25", { exact: true })).toBeVisible();
});
