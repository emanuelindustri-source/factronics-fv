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
