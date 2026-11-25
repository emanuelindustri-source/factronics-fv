# Changelog — F&V (by Factronics)

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [0.3.0] — 2026-11-25 — Fase 1.2 · Internacionalización real

Cerrada y etiquetada `fase-1.2`. Verificada en Windows, PWA y **teléfono real Xiaomi Redmi
22101316G (Android 14 / API 34)**.

### Añadido
- **Catálogo único de textos de interfaz** en `packages/i18n` (`@factronics-fv/i18n`): **67 claves × 13 locales** (es-VE base, en, pt-BR, pt-PT, it, de, fr, zh-Hans, ja, ko, hi + latín `la` y pseudo-local `es-XA`). Una sola fuente de verdad para Android y PWA.
- **Generador determinista** (`npm run i18n:build`): escribe los 13 `strings.xml`, `locales_config.xml`, los JSON de i18next y su índice. `npm run i18n:check` falla si hay *drift*.
- **Android:** `locales_config` (11 idiomas reales), selector in-app con 48 dp y semántica de radio, persistencia sin reinicio del sistema, integración con el idioma por aplicación de Android 13+, formatos de número/porcentaje/fecha por locale (`java.text`) y pantalla de ejemplo en Ajustes.
- **PWA:** i18next con detección (elección guardada → navegador → es-VE), selector persistente en `localStorage` + IndexedDB, `Intl` para número/porcentaje/fecha, `html lang` dinámico y ejemplo de formato.
- **Pseudo-local `es-XA`** generado desde es-VE (acentos, `⟦…⟧`, +35 % de longitud) y **detector de literales** (`scan-hardcoded.mjs`) para Compose y TSX, con validación de claves `t()` y recursos `R.string.*`.
- **Easter egg:** 7 pulsaciones sobre la versión desbloquean latín y pseudo-local. El latín es solo interfaz/logros, nunca contenido técnico.
- **Glosario** `docs/plan/GLOSARIO.md`: 40 términos del dominio en 11 idiomas, todos **pendientes de revisión** (ninguno aprobado).
- **ADR-0007:** catálogo único, generación, detección, `values-qps` para el pseudo (evita secuestrar dispositivos en español), separación UI/contenido y límites de la revisión nativa.
- **CI:** nuevo job `i18n` (`i18n:check`), tests unitarios Android en el job `android` y Playwright i18n en el job `web`.
- **Evidencia:** capturas PWA es-VE/ja/hi, Ajustes y pseudo; logs de i18n, Vitest, Playwright, tests Android, contenido y gitleaks.

### Corregido
- Deriva y literales del walking skeleton: textos de equipo, fuentes, versión, iniciales del avatar y selector es/en pasan al sistema de traducción o a recursos `translatable="false"` documentados.
- Android: el pseudo-local en `values-es-rXA` era elegido por **cualquier** teléfono en español; se movió a `values-qps` y se añadió mapeo `resourceTag`.

### Verificado en dispositivo
- Smoke Android **13/13 locales** en Redmi 22101316G (API 34): es-VE, en, pt-BR, pt-PT, it, de, fr, zh-Hans, ja, ko, hi, la y es-XA. Informe en `docs/evidencia/28-android-smoke-i18n.json`.
- Selector por UI real (Ajustes → English → Español) y persistencia tras cerrar/abrir: `docs/evidencia/28b-android-selector.txt`.
- Capturas Android es-VE/ja/hi, pseudo y latín; tras `pm clear` arranca en es-VE (regresión del pseudo `qps` cubierta).

### Pendiente posterior (no bloquea F1.2)
- Revisión por hablantes nativos de las traducciones de interfaz.
- Aprobación término por término del glosario (40 términos, todos pendientes).

## [0.2.0] — 2026-11-25 — Fase 1.1 · Esquema canónico y procedencia

### Añadido
- **Núcleo compartido de datos** en `packages/content-schema` (`@factronics-fv/content-schema` v1.0.0): los **15 tipos de entidad** del dominio (tecnología, familia, generación, modelo, sistema, componente, número de parte, código de error, tinta, documento, página, fragmento, pregunta, intento, certificado) con JSON Schema draft 2020-12 (17 esquemas) y **tipos TypeScript compartidos** (`src/types.ts`).
- **Procedencia obligatoria (`source_ref`)** en todo dato técnico: documento, código oficial, revisión, página, cita textual, nivel de confianza, revisor y fecha. **Sin fuente no se valida ni se publica**: el validador rechaza explícitamente datos sin `source_ref` (regla `FALTA-PROCEDENCIA`), con tests que lo demuestran.
- **Validadores ejecutables:** `npm run validate:content` (CLI con reglas semánticas: IDs estables, referencias resueltas, coherencia documento/página, certificados con aviso de no oficialidad, respuestas dentro de opciones), `npm test` (36 pruebas, casos negativos incluidos) y `npm run migrate:content`.
- **IDs estables** (`<prefijo>:<slug>`, inmutables), **versionado semántico del esquema** (`schema_version`) y **migraciones declarativas** (registro `MIGRATIONS`, runner encadenado; los packs más nuevos que la herramienta se rechazan). Mecanismo probado con migraciones sintéticas; solo existe v1.
- **Pack demo autorizado** en `packages/content-packs-demo`: 25 ítems que cubren las 15 entidades, claramente etiquetados `DEMO`, con códigos inequívocamente `DEMO-` (sin números de parte ni códigos reales inventados) y `source_ref` completo apuntando al documento demo con revisor Khristyan Hidalgo. Reglas automáticas que blindan el pack: etiqueta `DEMO` obligatoria y prefijo `DEMO-` en todo código.
- **Fixtures compartidos** en `packages/shared-fixtures`: casos válidos e inválidos (sin fuente, sin revisor, sin cita, IDs malformados, códigos no-DEMO, certificado sin aviso...) reutilizables por las apps.
- **Workspaces del monorepo** (`package.json` raíz, `workspaces: ["packages/*"]`); `apps/*` conservan su `npm ci` independiente (verificado).
- **CI:** nuevo job `content` en `.github/workflows/ci.yml` que ejecuta `npm ci`, `npm run validate:content` y `npm test` en cada push/PR.

### Documentado
- **ADR-0006** Esquema canónico de contenido y sistema de procedencia (decisiones y 7 alternativas rechazadas).
- Evidencia de ejecución en `docs/evidencia/` (15–18): validación del pack demo, 36 tests, rechazo explícito por CLI de datos sin fuente, workspaces verificados.
- Handoff `docs/handoff/FASE_1.2.md` con el prompt exacto de la siguiente fase.

### Seguridad / propiedad intelectual
- La documentación real del equipo (`1880C`) se copió **solo localmente** a `VIDEOJET_DOCS_ENTRADA/01_CIJ/` (gitignored, con inventario local). Nada de contenido ni códigos reales en el repo público (ADR-0003).

## [0.1.0] — 2026-11-25 — Fase 0 · Fundaciones

### Añadido
- **0.1 Preflight:** verificación real de hardware/software (Windows 10 LTSC, i3-1215U, 23,7 GB RAM, 74,75 GB libres), JDK 17 Temurin, Android SDK 35 + build-tools 35.0.0, adb, teléfono Xiaomi API 34 conectado, Blender 4.5.16 headless, Python 3.13 vía `uv`, Node 24, pnpm 12, Git/gh, 7-Zip, gitleaks 8.30.1. Instalación de `uv`, `pnpm` y `gitleaks`. Archivo de paginación configurado a 8–16 GB (pendiente de reinicio). Resultados en `docs/plan/PREFLIGHT.md`.
- **0.2 Seguridad y repositorio:** monorepo con estructura del PLAN_MAESTRO, `.gitignore` (contenido propietario y secretos fuera de git), `AGENTS.md`, `PROJECT_STATE.md`, `PROGRESS.json`, ADRs 0001–0005, carpeta local `VIDEOJET_DOCS_ENTRADA` con estructura y LEEME, keystore de Android `fv-release.keystore` (RSA 4096) con backup offline en `C:\Factronics_VJ_Backups`, CI con gitleaks + build Android/PWA/portal y despliegue a GitHub Pages. Advertencia y pasos de revocación del token de GitHub comprometido (uso prohibido).
- **0.3 Marca y walking skeleton:** nombre definitivo **F&V** (package `com.factronics.fv`, ADR-0001), logo SVG con marca de pulso, icono adaptativo (foreground/background/monochrome), splash, tokens de color/tipografía/movimiento, accesibilidad base (contraste AA, objetivos 48 dp, TalkBack, movimiento reducido). App Android (Compose + Material 3 + navegación) con pantallas Inicio/Perfil/Ajustes/Acerca de, idioma es/en y tema claro/oscuro/Material You. PWA offline (React + TS + Vite + Dexie + i18next + Workbox) con manifest, service worker, IndexedDB e instalación. Portal público (Astro) con historia citada, equipo, tracker desde `PROGRESS.json` y descarga del APK.

### Seguridad
- Ningún secreto en el repositorio. Token comprometido del chat anterior: **uso prohibido**, revocación a cargo del dueño de la cuenta (pasos entregados).
- Keystore con contraseña generada aleatoriamente; credenciales entregadas solo por archivo local para el gestor de contraseñas del usuario.

### Documentado
- ADR-0001 Nombre y package · ADR-0002 Toolchain de build · ADR-0003 Contenido demo · ADR-0004 Repositorios · ADR-0005 Seguridad (token y keystore).
