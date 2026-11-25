// Pruebas E2E de la PWA: carga, persistencia en IndexedDB y modo offline.
// Uso: npx playwright test  (requiere: npx playwright install chromium)
import { test, expect } from "@playwright/test";

test("la PWA carga y muestra el saludo", async ({ page }) => {
  await page.goto("http://localhost:4173/");
  await expect(page.getByText("Hola, F&V")).toBeVisible();
});

test("el perfil persiste en IndexedDB tras recargar", async ({ page }) => {
  await page.goto("http://localhost:4173/");
  await page.getByRole("button", { name: "Perfil" }).click();
  const input = page.getByLabel("Nombre");
  await input.fill("Khristyan Hidalgo");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Guardado en este dispositivo")).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "Perfil" }).click();
  await expect(page.getByLabel("Nombre")).toHaveValue("Khristyan Hidalgo");
});

test("funciona sin conexión y con service worker instalado", async ({ page, context }) => {
  await page.goto("http://localhost:4173/");
  // Esperar a que el service worker registre
  await page.waitForFunction(() => navigator.serviceWorker?.ready !== undefined);
  await page.evaluate(() => navigator.serviceWorker.ready);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText("Hola, F&V")).toBeVisible();

  const swCount = await page.evaluate(
    () => navigator.serviceWorker?.getRegistrations().then((r) => r.length) ?? 0
  );
  expect(swCount).toBeGreaterThan(0);
  await context.setOffline(false);
});

test("el cambio de idioma funciona", async ({ page }) => {
  await page.goto("http://localhost:4173/");
  await page.getByRole("button", { name: "Ajustes" }).click();
  await page.getByText("English").click();
  await page.getByRole("button", { name: "Home" }).click();
  await expect(page.getByText("Hello, F&V")).toBeVisible();
});
