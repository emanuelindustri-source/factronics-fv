// Pruebas E2E de la PWA (F1.2): 11 idiomas + latín + pseudo-local, persistencia,
// formatos por locale, offline y easter egg.
// Uso: npm run build && npx playwright test  (requiere: npx playwright install chromium)
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ABOUT_SOURCES_VALUE, ABOUT_TEAM_NAMES } from "../src/constants";
import { ALL_LOCALES, REAL_LOCALES } from "../src/supported-locales";
import {
  formatDate,
  formatInteger,
  formatNumber,
  formatPercent,
  SAMPLE_DATE,
  SAMPLE_NUMBER,
  SAMPLE_PERCENT
} from "../src/format";

// Playwright ejecuta en Node: se leen los JSON directamente (sin import attributes).
const catalogs: Record<string, { translation: Record<string, string> }> = Object.fromEntries(
  ALL_LOCALES.map((locale) => [
    locale.tag,
    {
      translation: JSON.parse(
        readFileSync(
          fileURLToPath(new URL(`../src/locales/${locale.tag}.json`, import.meta.url)),
          "utf8"
        )
      ) as Record<string, string>
    }
  ])
);;

async function openWithLanguage(page: import("@playwright/test").Page, tag: string) {
  await page.addInitScript((language) => {
    localStorage.setItem("fv.lang", language);
    localStorage.setItem("fv.special", "1");
  }, tag);
  await page.goto("http://localhost:4173/");
}

test("la PWA carga en es-VE y muestra el saludo", async ({ page }) => {
  await openWithLanguage(page, "es-VE");
  await expect(page.getByText(catalogs["es-VE"].translation["home.greeting"])).toBeVisible();
});

test("el perfil persiste en IndexedDB tras recargar", async ({ page }) => {
  await openWithLanguage(page, "es-VE");
  await page.locator(".nav button").nth(2).click();
  const input = page.getByLabel(catalogs["es-VE"].translation["profile.nameLabel"]);
  await input.fill("Khristyan Hidalgo");
  await page.getByRole("button", { name: catalogs["es-VE"].translation["profile.save"] }).click();
  await expect(page.getByText(catalogs["es-VE"].translation["profile.saved"])).toBeVisible();

  await page.reload();
  await page.locator(".nav button").nth(2).click();
  await expect(page.getByLabel(catalogs["es-VE"].translation["profile.nameLabel"])).toHaveValue(
    "Khristyan Hidalgo"
  );
});

test("funciona sin conexión y con service worker instalado", async ({ page, context }) => {
  await openWithLanguage(page, "es-VE");
  await page.waitForFunction(() => navigator.serviceWorker?.ready !== undefined);
  await page.evaluate(() => navigator.serviceWorker.ready);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText(catalogs["es-VE"].translation["home.greeting"])).toBeVisible();

  const swCount = await page.evaluate(
    () => navigator.serviceWorker?.getRegistrations().then((r) => r.length) ?? 0
  );
  expect(swCount).toBeGreaterThan(0);
  await context.setOffline(false);
});

test("el selector de idioma es persistente (japonés tras recargar)", async ({ page }) => {
  await page.goto("http://localhost:4173/");
  await page.locator(".nav button").nth(3).click();
  await page.getByText("日本語", { exact: true }).click();
  await page.locator(".nav button").nth(0).click();
  await expect(page.getByText(catalogs.ja.translation["home.greeting"])).toBeVisible();

  await page.reload();
  await expect(page.getByText(catalogs.ja.translation["home.greeting"])).toBeVisible();
});

test("los formatos de Ajustes siguen el locale elegido", async ({ page }) => {
  await openWithLanguage(page, "es-VE");
  await page.locator(".nav button").nth(3).click();
  await expect(page.getByText(formatNumber(SAMPLE_NUMBER, "es-VE"))).toBeVisible();
  await expect(page.getByText(formatPercent(SAMPLE_PERCENT, "es-VE"))).toBeVisible();
  await expect(page.getByText(formatDate(SAMPLE_DATE, "es-VE"))).toBeVisible();
});

test.describe("detección en el primer arranque", () => {
  test.use({ locale: "es-MX" });

  test("un navegador en español arranca en español de Venezuela", async ({ page }) => {
    await page.goto("http://localhost:4173/");
    await expect(page.getByText(catalogs["es-VE"].translation["home.greeting"])).toBeVisible();
  });
});

test.describe("detección de otro idioma soportado", () => {
  test.use({ locale: "en-GB" });

  test("un navegador en inglés arranca en inglés", async ({ page }) => {
    await page.goto("http://localhost:4173/");
    await expect(page.getByText(catalogs.en.translation["home.greeting"])).toBeVisible();
  });
});

// --- Smoke de los 11 idiomas reales + latín ---
for (const locale of [...REAL_LOCALES, ALL_LOCALES.find((l) => l.tag === "la")!]) {
  test(`smoke ${locale.tag}: la interfaz renderiza completa`, async ({ page }) => {
    const catalog = catalogs[locale.tag].translation;
    await openWithLanguage(page, locale.tag);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(catalog["home.greeting"]);
    const navButtons = page.locator(".nav button");
    await expect(navButtons).toHaveCount(5);
    for (const key of ["nav.home", "nav.content", "nav.profile", "nav.settings", "nav.about"]) {
      await expect(page.getByRole("button", { name: catalog[key] })).toBeVisible();
    }

    const body = await page.locator("body").innerText();
    expect(body).not.toContain("⟦");
    expect(body).not.toContain("{days}");
    expect(body).not.toContain("home.greeting");
    expect(body).not.toContain("undefined");
  });
}

test("el pseudo-local revela que no quedan literales fuera del catálogo", async ({ page }) => {
  await openWithLanguage(page, "es-XA");

  const allowlist = new Set([
    ...Object.values(catalogs["es-XA"].translation).filter((value) => !value.startsWith("⟦")),
    ...ALL_LOCALES.map((locale) => locale.label),
    ABOUT_TEAM_NAMES,
    ABOUT_SOURCES_VALUE,
    "KH",
    "Khristyan Hidalgo",
    "Factronics, C.A.",
    formatNumber(SAMPLE_NUMBER, "es-XA"),
    formatPercent(SAMPLE_PERCENT, "es-XA"),
    formatDate(SAMPLE_DATE, "es-XA"),
    formatInteger(0, "es-XA"),
    formatInteger(1, "es-XA")
  ]);

  let pseudoLines = 0;
  for (let tab = 0; tab < 5; tab += 1) {
    await page.locator(".nav button").nth(tab).click();
    const texts: string[] = await page.evaluate(() =>
      Array.from(document.querySelectorAll("h1,h2,h3,p,span,b,strong,label,button"))
        .filter((element) => element.children.length === 0)
        .map((element) => element.textContent?.trim() ?? "")
        .filter((text) => text.length > 0)
    );
    for (const text of texts) {
      const clean = text.replace(/^[●✓]\s*/, "");
      if (allowlist.has(clean)) continue;
      if (/^[\d\s.,:/%+\-–—\u00A0]+$/.test(clean)) continue;
      if (clean.includes("⟦")) {
        pseudoLines += 1;
        continue;
      }
      throw new Error(`Texto sin pseudo-localizar en la pestaña ${tab}: "${text}"`);
    }
  }
  // Hay muchas más cadenas pseudo que valores de datos/excepciones.
  expect(pseudoLines).toBeGreaterThan(40);
});

test("el easter egg desbloquea latín y pseudo-local tras 7 pulsaciones", async ({ page }) => {
  await openWithLanguage(page, "es-VE");
  await page.locator(".nav button").nth(4).click();
  const version = page.locator("button.version-link");
  for (let i = 0; i < 7; i += 1) {
    await version.click();
  }
  await page.locator(".nav button").nth(3).click();
  await expect(page.getByText("Latina · easter egg")).toBeVisible();
  await expect(page.getByText("Pseudo-local · QA")).toBeVisible();

  // El desbloqueo persiste tras recargar (localStorage).
  await page.reload();
  await page.locator(".nav button").nth(3).click();
  await expect(page.getByText("Latina · easter egg")).toBeVisible();
});

test("festividad forzada, tema claro/oscuro y modo sobrio", async ({ page }) => {
  await openWithLanguage(page, "es-VE");
  await page.locator(".nav button").nth(3).click();

  // Forzar Navidad y comprobar el atributo + la etiqueta de Inicio.
  await page.locator("#festivity-override").selectOption("christmas");
  await expect(page.locator("html")).toHaveAttribute("data-festivity", "christmas");
  await page.locator(".nav button").nth(0).click();
  await expect(page.getByText("Tema festivo: Navidad")).toBeVisible();

  // Persistencia en IndexedDB tras recargar.
  await page.waitForTimeout(300);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-festivity", "christmas");

  // Modo sobrio: sin festividad y sin animaciones.
  await page.locator(".nav button").nth(3).click();
  await page.getByLabel("Modo sobrio").check();
  await expect(page.locator("html")).toHaveAttribute("data-sober", "true");
  await expect(page.locator("html")).not.toHaveAttribute("data-festivity");

  // Desactivar festividades también las suprime.
  await page.getByLabel("Modo sobrio").uncheck();
  await page.getByLabel("Festividades", { exact: true }).uncheck();
  await expect(page.locator("html")).not.toHaveAttribute("data-festivity");

  // Tema claro/oscuro explícito.
  await page.getByLabel("Claro", { exact: true }).check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByLabel("Oscuro", { exact: true }).check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
