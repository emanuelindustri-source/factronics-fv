# Evidencia â€” Fase 0 (2026-11-25)

Todas las capturas fueron tomadas automÃ¡ticamente por el agente en las pruebas reales.

## Android (telÃ©fono real Xiaomi 22101316G, Android 14 / API 34)

| Archivo | QuÃ© demuestra |
|---|---|
| `01-android-home.png` / `05-android-home-2.png` | Pantalla Inicio ("Hola, F&V") en modo oscuro Material You |
| `02-android-perfil.png` / `07-android-modo-claro-perfil.png` | Perfil demo (avatar iniciales, nivel/medallas/racha) |
| `03-android-ajustes.png` | Ajustes: idioma es/en, tema, color dinÃ¡mico, festividades (deshabilitada, F1.3) |
| `04-android-acerca-de.png` | Acerca de: versiÃ³n, equipo de validaciÃ³n, fuentes, disclaimer |
| `06-android-modo-claro-home.png` | Tema claro (contraste AA) |
| `08-android-landscape.png` | RotaciÃ³n horizontal sin crash |
| `09-android-fuente-200.png` | Escala de fuente 200 % sin cortes de texto |
| `10-android-talkback-home.png` / `11-android-talkback-perfil.png` | TalkBack activo (foco de accesibilidad), luego desactivado |

- `adb install -r` â†’ **Success**; `am start` â†’ `com.factronics.fv/.MainActivity` en primer plano.
- `adb logcat` filtrado por FATAL/AndroidRuntime/Exception: **0 errores crÃ­ticos**.

## PWA (Playwright + Chromium)

| Archivo | QuÃ© demuestra |
|---|---|
| `12-pwa-online.png` | PWA cargada (manifest + service worker registrados) |
| `13-pwa-offline.png` | **Recarga sin conexiÃ³n**: la app renderiza completa offline (IndexedDB + SW) |

- `playwright test`: **4/4 en verde** (carga, persistencia IndexedDB tras recarga, offline con SW, cambio de idioma).

## Portal (Astro â†’ GitHub Pages)

| Archivo | QuÃ© demuestra |
|---|---|
| `14-portal.png` | Portal completo: hero, quÃ© es F&V, descargas, tracker desde PROGRESS.json, historia con fuentes, equipo, privacidad |

- Publicado en: https://emanuelindustri-source.github.io/factronics-fv/ (verificado en vivo)

## CI / Seguridad

- GitHub Actions run 45593996788: **Android âœ… PWA âœ… Portal âœ… Gitleaks âœ…** (CI en verde).
- Gitleaks local 8.30.1: "no leaks found".
- Firma probada con `fv-release.keystore` (alias `fv`): `apksigner verify` â†’ certificado `CN=F&V by Factronics`.
- SHA-256 del APK publicado en la release `fase-0`.

---

# Evidencia â€” Fase 1.1 Â· Esquema canÃ³nico y procedencia (2026-11-25)

EjecuciÃ³n real en Windows local (Node v24.22.3). No aplica telÃ©fono en esta fase.

| Archivo | QuÃ© demuestra |
|---|---|
| `15-validate-content.txt` | `npm run validate:content` sobre el pack demo: **25 Ã­tems Â· 100 % con source_ref Â· 0 sin fuente Â· 0 errores** |
| `16-tests-validador.txt` | `npm test`: **36/36 en verde** (30 del validador + 6 del pack demo), incluidos los casos negativos |
| `17-rechazo-sin-fuente.txt` | Rechazo explÃ­cito por CLI de un Ã­tem sin fuente: regla `FALTA-PROCEDENCIA â€” SIN FUENTE NO SE PUBLICA` (+ backstop `JSON-SCHEMA`) |
| `18-workspaces-monorepo.txt` | `npm ls --workspaces`: los 3 paquetes existen como workspaces (`content-schema`, `content-packs-demo`, `shared-fixtures`); `npm ci` de `apps/web` y `apps/portal` sigue independiente |

## Gate de F1.1 verificado

- `npm run validate:content` en verde en local y en CI (job `content` nuevo en `.github/workflows/ci.yml`).
- 100 % de los Ã­tems demo con `source_ref` completo y revisor (Khristyan Hidalgo) â€” probado por test.
- 0 Ã­tems sin fuente: el validador rechaza explÃ­citamente datos sin `source_ref` â€” test `un Ã­tem SIN source_ref se rechaza explÃ­citamente` + `17-rechazo-sin-fuente.txt`.
- ADR-0006 escrito (`docs/adr/ADR-0006-esquema-canonico-y-procedencia.md`).
- Gitleaks limpio y CI en verde (ver `PROJECT_STATE.md` para el enlace al run).

## Nota de propiedad intelectual

Los documentos reales (`1880C`) se copiaron solo a `VIDEOJET_DOCS_ENTRADA/01_CIJ/`
(local, **fuera de git**) con su inventario local. Nada de su contenido ni cÃ³digos estÃ¡ en
el repo pÃºblico: los Ã­tems demo usan exclusivamente cÃ³digos `DEMO-` (ADR-0003).

---

# Evidencia â€” Fase 1.2 Â· InternacionalizaciÃ³n real (2026-11-25)

EjecuciÃ³n real en Windows local. **Estado: cÃ³digo y pruebas automÃ¡ticas en verde; el smoke
en telÃ©fono fÃ­sico quedÃ³ pendiente porque el dueÃ±o retirÃ³ el dispositivo del equipo de
pruebas.** No se declara la fase cerrada hasta ejecutar `23..28`.

## PWA â€” capturas reales (Playwright + Chromium)

| Archivo | QuÃ© demuestra |
|---|---|
| `19-pwa-es-VE.png` | Inicio en espaÃ±ol de Venezuela (idioma principal) |
| `20-pwa-ja.png` | Inicio en japonÃ©s (texto, navegaciÃ³n y chips renderizados) |
| `21-pwa-hi.png` | Inicio en hindi (devanagari renderizado, sin tofu) |
| `22-pwa-ajustes-es-VE.png` | Selector con los 11 idiomas, ejemplo de nÃºmero/porcentaje/fecha por locale |
| `26-pwa-pseudo.png` | Pseudo-local `es-XA`: todo el texto va marcado `âŸ¦â€¦âŸ§` y alargado (revela literales y desbordes) |

- `npx playwright test` â†’ **21/21 en verde**: 11 idiomas reales + latÃ­n, detecciÃ³n de
  navegador (es-MXâ†’es-VE, en-GBâ†’en), persistencia tras recarga, formatos, offline y
  easter egg de 7 pulsaciones. Log: `33-playwright-i18n.txt`.
- `npm run test` (Vitest) â†’ **17/17 en verde** (catÃ¡logo, detecciÃ³n y formatos).
  Log: `32-vitest-i18n.txt`.

## Android â€” verificaciÃ³n automÃ¡tica completada, dispositivo pendiente

| Archivo | QuÃ© demuestra |
|---|---|
| `34-android-unit-tests.txt` | `:app:testDebugUnitTest` en verde: formatos es-VE/en-US/de-DE/ja-JP y paridad de las 13 carpetas de recursos |
| `23-android-es-VE.png` | **Pendiente** de capturar en dispositivo (script listo) |
| `24-android-ja.png` | **Pendiente** de capturar en dispositivo |
| `25-android-hi.png` | **Pendiente** de capturar en dispositivo |
| `27-android-pseudo.png` | **Pendiente** de capturar en dispositivo |
| `28-android-smoke-i18n.json` | **Pendiente**: informe del smoke de 13 locales |

Comando exacto para completar el gate cuando el telÃ©fono vuelva a estar conectado:

```powershell
cd C:\Factronics_VJ_Ecosystem\apps\android
.\gradlew.bat :app:assembleDebug
adb install -r app\build\outputs\apk\debug\app-debug.apk
cd C:\Factronics_VJ_Ecosystem
node tools\smoke-i18n-android.mjs
```

El script fija cada idioma con el receptor **solo-debug** `DEBUG_SET_LANG`, reinicia la app,
lee la jerarquÃ­a con `uiautomator`, comprueba el saludo y la ausencia de literales/claves,
y captura las pantallas. Hallazgo ya corregido: el pseudo-local usa `values-qps` (no
`values-es-rXA`) para no secuestrar los telÃ©fonos en espaÃ±ol.

## CatÃ¡logo, paridad y CI

| Archivo | QuÃ© demuestra |
|---|---|
| `29-i18n-check.txt` | `npm run i18n:check`: 13 idiomas, 67 claves, salidas Android/PWA al dÃ­a, pseudo derivado, **0 textos hardcodeados** |
| `30-validate-content-f12.txt` | El esquema de contenido de F1.1 sigue intacto: **25/25 Ã­tems con fuente, 0 errores** |
| `31-content-tests-f12.txt` | Tests del contenido siguen en verde (no se tocÃ³ el esquema) |
| `35-gitleaks.txt` | Gitleaks 8.30.1: **no leaks found** |

Tests de i18n: 10/10 (claves completas, sin sobrantes, paridad Androidâ†”PWA, pseudo
determinista, marcadores, recursos existentes y escÃ¡ner de literales).

## Glosario y decisiones

- `docs/plan/GLOSARIO.md`: **40 tÃ©rminos** del dominio en 11 idiomas, **todos â€œpendiente de
  revisiÃ³nâ€** (ninguno aprobado aÃºn).
- `docs/adr/ADR-0007-internacionalizacion.md`: catÃ¡logo Ãºnico, generaciÃ³n, detecciÃ³n,
  easter egg, pseudo `qps` y separaciÃ³n UI/contenido.
- `VIDEOJET_DOCS_ENTRADA/` se revisÃ³ **solo a nivel de inventario** para el vocabulario
  genÃ©rico; no se copiÃ³ contenido tÃ©cnico ni cÃ³digos al repo.

## Lo que falta para cerrar F1.2 (bloqueo documentado)

1. Smoke Android en los 13 locales + capturas es-VE/ja/hi (requiere el telÃ©fono).
2. Prueba en telÃ©fono real del cambio de idioma en la UI (2 idiomas) y regreso al espaÃ±ol.
3. RevisiÃ³n por hablantes nativos de las 67 cadenas (queda como tarea del equipo; la app
   lo declara en Acerca de).
