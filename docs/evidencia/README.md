# Evidencia — Fase 0 (2026-11-25)

Todas las capturas fueron tomadas automáticamente por el agente en las pruebas reales.

## Android (teléfono real Xiaomi 22101316G, Android 14 / API 34)

| Archivo | Qué demuestra |
|---|---|
| `01-android-home.png` / `05-android-home-2.png` | Pantalla Inicio ("Hola, F&V") en modo oscuro Material You |
| `02-android-perfil.png` / `07-android-modo-claro-perfil.png` | Perfil demo (avatar iniciales, nivel/medallas/racha) |
| `03-android-ajustes.png` | Ajustes: idioma es/en, tema, color dinámico, festividades (deshabilitada, F1.3) |
| `04-android-acerca-de.png` | Acerca de: versión, equipo de validación, fuentes, disclaimer |
| `06-android-modo-claro-home.png` | Tema claro (contraste AA) |
| `08-android-landscape.png` | Rotación horizontal sin crash |
| `09-android-fuente-200.png` | Escala de fuente 200 % sin cortes de texto |
| `10-android-talkback-home.png` / `11-android-talkback-perfil.png` | TalkBack activo (foco de accesibilidad), luego desactivado |

- `adb install -r` → **Success**; `am start` → `com.factronics.fv/.MainActivity` en primer plano.
- `adb logcat` filtrado por FATAL/AndroidRuntime/Exception: **0 errores críticos**.

## PWA (Playwright + Chromium)

| Archivo | Qué demuestra |
|---|---|
| `12-pwa-online.png` | PWA cargada (manifest + service worker registrados) |
| `13-pwa-offline.png` | **Recarga sin conexión**: la app renderiza completa offline (IndexedDB + SW) |

- `playwright test`: **4/4 en verde** (carga, persistencia IndexedDB tras recarga, offline con SW, cambio de idioma).

## Portal (Astro → GitHub Pages)

| Archivo | Qué demuestra |
|---|---|
| `14-portal.png` | Portal completo: hero, qué es F&V, descargas, tracker desde PROGRESS.json, historia con fuentes, equipo, privacidad |

- Publicado en: https://emanuelindustri-source.github.io/factronics-fv/ (verificado en vivo)

## CI / Seguridad

- GitHub Actions run 45593996788: **Android ✅ PWA ✅ Portal ✅ Gitleaks ✅** (CI en verde).
- Gitleaks local 8.30.1: "no leaks found".
- Firma probada con `fv-release.keystore` (alias `fv`): `apksigner verify` → certificado `CN=F&V by Factronics`.
- SHA-256 del APK publicado en la release `fase-0`.

---

# Evidencia — Fase 1.1 · Esquema canónico y procedencia (2026-11-25)

Ejecución real en Windows local (Node v24.22.3). No aplica teléfono en esta fase.

| Archivo | Qué demuestra |
|---|---|
| `15-validate-content.txt` | `npm run validate:content` sobre el pack demo: **25 ítems · 100 % con source_ref · 0 sin fuente · 0 errores** |
| `16-tests-validador.txt` | `npm test`: **36/36 en verde** (30 del validador + 6 del pack demo), incluidos los casos negativos |
| `17-rechazo-sin-fuente.txt` | Rechazo explícito por CLI de un ítem sin fuente: regla `FALTA-PROCEDENCIA — SIN FUENTE NO SE PUBLICA` (+ backstop `JSON-SCHEMA`) |
| `18-workspaces-monorepo.txt` | `npm ls --workspaces`: los 3 paquetes existen como workspaces (`content-schema`, `content-packs-demo`, `shared-fixtures`); `npm ci` de `apps/web` y `apps/portal` sigue independiente |

## Gate de F1.1 verificado

- `npm run validate:content` en verde en local y en CI (job `content` nuevo en `.github/workflows/ci.yml`).
- 100 % de los ítems demo con `source_ref` completo y revisor (Khristyan Hidalgo) — probado por test.
- 0 ítems sin fuente: el validador rechaza explícitamente datos sin `source_ref` — test `un ítem SIN source_ref se rechaza explícitamente` + `17-rechazo-sin-fuente.txt`.
- ADR-0006 escrito (`docs/adr/ADR-0006-esquema-canonico-y-procedencia.md`).
- Gitleaks limpio y CI en verde (ver `PROJECT_STATE.md` para el enlace al run).

## Nota de propiedad intelectual

Los documentos reales (`1880C`) se copiaron solo a `VIDEOJET_DOCS_ENTRADA/01_CIJ/`
(local, **fuera de git**) con su inventario local. Nada de su contenido ni códigos está en
el repo público: los ítems demo usan exclusivamente códigos `DEMO-` (ADR-0003).

---

# Evidencia — Fase 1.2 · Internacionalización real (2026-11-25)

Ejecución real en Windows local. **Estado: código y pruebas automáticas en verde; el smoke
en teléfono físico quedó pendiente porque el dueño retiró el dispositivo del equipo de
pruebas.** No se declara la fase cerrada hasta ejecutar `23..28`.

## PWA — capturas reales (Playwright + Chromium)

| Archivo | Qué demuestra |
|---|---|
| `19-pwa-es-VE.png` | Inicio en español de Venezuela (idioma principal) |
| `20-pwa-ja.png` | Inicio en japonés (texto, navegación y chips renderizados) |
| `21-pwa-hi.png` | Inicio en hindi (devanagari renderizado, sin tofu) |
| `22-pwa-ajustes-es-VE.png` | Selector con los 11 idiomas, ejemplo de número/porcentaje/fecha por locale |
| `26-pwa-pseudo.png` | Pseudo-local `es-XA`: todo el texto va marcado `⟦…⟧` y alargado (revela literales y desbordes) |

- `npx playwright test` → **21/21 en verde**: 11 idiomas reales + latín, detección de
  navegador (es-MX→es-VE, en-GB→en), persistencia tras recarga, formatos, offline y
  easter egg de 7 pulsaciones. Log: `33-playwright-i18n.txt`.
- `npm run test` (Vitest) → **17/17 en verde** (catálogo, detección y formatos).
  Log: `32-vitest-i18n.txt`.

## Android — verificación automática completada, dispositivo pendiente

| Archivo | Qué demuestra |
|---|---|
| `34-android-unit-tests.txt` | `:app:testDebugUnitTest` en verde: formatos es-VE/en-US/de-DE/ja-JP y paridad de las 13 carpetas de recursos |
| `23-android-es-VE.png` | **Pendiente** de capturar en dispositivo (script listo) |
| `24-android-ja.png` | **Pendiente** de capturar en dispositivo |
| `25-android-hi.png` | **Pendiente** de capturar en dispositivo |
| `27-android-pseudo.png` | **Pendiente** de capturar en dispositivo |
| `28-android-smoke-i18n.json` | **Pendiente**: informe del smoke de 13 locales |

Comando exacto para completar el gate cuando el teléfono vuelva a estar conectado:

```powershell
cd C:\Factronics_VJ_Ecosystem\apps\android
.\gradlew.bat :app:assembleDebug
adb install -r app\build\outputs\apk\debug\app-debug.apk
cd C:\Factronics_VJ_Ecosystem
node tools\smoke-i18n-android.mjs
```

El script fija cada idioma con el receptor **solo-debug** `DEBUG_SET_LANG`, reinicia la app,
lee la jerarquía con `uiautomator`, comprueba el saludo y la ausencia de literales/claves,
y captura las pantallas. Hallazgo ya corregido: el pseudo-local usa `values-qps` (no
`values-es-rXA`) para no secuestrar los teléfonos en español.

## Catálogo, paridad y CI

| Archivo | Qué demuestra |
|---|---|
| `29-i18n-check.txt` | `npm run i18n:check`: 13 idiomas, 67 claves, salidas Android/PWA al día, pseudo derivado, **0 textos hardcodeados** |
| `30-validate-content-f12.txt` | El esquema de contenido de F1.1 sigue intacto: **25/25 ítems con fuente, 0 errores** |
| `31-content-tests-f12.txt` | Tests del contenido siguen en verde (no se tocó el esquema) |
| `35-gitleaks.txt` | Gitleaks 8.30.1: **no leaks found** |

Tests de i18n: 10/10 (claves completas, sin sobrantes, paridad Android↔PWA, pseudo
determinista, marcadores, recursos existentes y escáner de literales).

- **CI run 45612145712: 6/6 jobs en verde** (Gitleaks, Contenido, i18n, Android build +
  tests, PWA build + Vitest + Playwright, Portal); **Pages en verde** (run 45612145635).
- Gitleaks en CI: “no leaks found”.

## Glosario y decisiones

- `docs/plan/GLOSARIO.md`: **40 términos** del dominio en 11 idiomas, **todos “pendiente de
  revisión”** (ninguno aprobado aún).
- `docs/adr/ADR-0007-internacionalizacion.md`: catálogo único, generación, detección,
  easter egg, pseudo `qps` y separación UI/contenido.
- `VIDEOJET_DOCS_ENTRADA/` se revisó **solo a nivel de inventario** para el vocabulario
  genérico; no se copió contenido técnico ni códigos al repo.

## Lo que falta para cerrar F1.2 (bloqueo documentado)

1. Smoke Android en los 13 locales + capturas es-VE/ja/hi (requiere el teléfono).
2. Prueba en teléfono real del cambio de idioma en la UI (2 idiomas) y regreso al español.
3. Revisión por hablantes nativos de las 67 cadenas (queda como tarea del equipo; la app
   lo declara en Acerca de).
