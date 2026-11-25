# Changelog — F&V (by Factronics)

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [0.5.0] — 2026-11-25 — Fase 1.4 · Offline, packs y contratos de sincronización

Cerrada y etiquetada `fase-1.4`. Verificada en Windows, PWA y **teléfono real Xiaomi Redmi
22101316G (Android 14 / API 34)**.

### Añadido
- **Contrato de sincronización v1** (`packages/sync-contracts`, `@factronics-fv/sync-contracts`):
  manifiesto de pack (`sync-manifest.json` con SHA-256 por archivo y `min_client_version`),
  firma digital (`signature.json`), bundle de instalación `.fvpack`, deltas con
  `sequence`/`base_version`/tombstones y backup `fv-backup/1`. Esquemas JSON Schema
  versionados + servidor simulado (entrega normal, duplicados, fuera de orden, delta
  faltante, reconexión tipo offline 24 h) con demostración de convergencia. **No se
  tocó el esquema canónico de F1.1** (ADR-0009).
- **Paridad de plataforma probada**: la misma semántica en JavaScript (referencia,
  81 tests), TypeScript/PWA (133 tests) y Kotlin/Android (44 tests), contra los
  mismos fixtures compartidos (`packages/shared-fixtures/sync/`) y vectores
  criptográficos byte a byte (serialización canónica + compatibilidad de firma).
- **Android — almacén offline `FilePackStore`**: versión de esquema local + migraciones
  declarativas con rollback, índices de búsqueda por ID/tipo/tecnología, y transacciones
  atómicas por staging + journal + rename (una interrupción nunca deja un pack a medias;
  probado con fallos inyectados paso a paso y disco lleno `DISCO-LLENO`).
- **PWA — almacén Dexie v2** (`packs`, `contentItems`, `tombstones`, `syncState`): el
  upgrade v1→v2 conserva el perfil; transacciones IndexedDB = atomicidad (probado con
  throw inyectado); round-trip de backup byte a byte.
- **Instalación de packs atómica y reversible**: staging → verificación de integridad
  (SHA-256) → firma ECDSA P-256 contra truststore → validación de las reglas de F1.1
  (mismos nombres de regla: `FALTA-PROCEDENCIA`, `DEMO-CODIGO`…) → activación. Rechaza
  pack corrupto, hash inválido, firma inválida, versión futura (nunca se adivina),
  downgrade y versión mínima de cliente no cumplida. Códigos de error estables con
  cadenas traducidas.
- **Pack demo firmado**: `packages/content-packs-demo/bundle/pack-fv-demo.fvpack`
  (25 ítems, 15 entidades) generado por `tools/pack-bundle.mjs`, que solo empaqueta
  packs que pasan `validate:content`. Clave DEMO privada en `_private/` (fuera de git);
  en el repo solo la clave pública etiquetada como DEMO (ADR-0005/ADR-0009).
- **Backup/export/import local** (`fv-backup/1`): checksum SHA-256 canónico, límite
  50 MiB, restauración en almacenamiento limpio en Android y PWA, rechazo de archivos
  corruptos. **Privacidad por diseño**: solo packs, estado de sync y preferencias no
  personales; el esquema prohíbe datos personales (probado con un intento de `name`).
- **Offline real y estado vacío claro**: la app abre, busca y navega sin red con el
  pack instalado (verificado en modo avión en el teléfono y con `setOffline` en la
  PWA); sin pack muestra "Sin contenido instalado" sin contenido inventado.
- **UI**: pestaña "Contenido" (Android y PWA) con búsqueda por texto/tipo/tecnología y
  "Ver fuente" (documento, código oficial, revisión, página, cita); sección
  "Contenido sin conexión" en Ajustes con versión, tamaño, última actualización, ítems
  y acciones (instalar pack demo, exportar/restaurar copia, limpiar).
- **i18n**: catálogo ampliado a **148 claves × 13 locales** (incluidos los 22 códigos de
  error del contrato), paridad y `npm run i18n:check` en verde; cero literales.
- **Tests y herramientas**: `tools/pack-bundle.mjs` (empaquetado + firma + `--check` de
  deriva), `tools/gen-sync-vectors.mjs` (vectores criptográficos compartidos),
  `tools/f14-content-evidence.mjs` (evidencia automatizada en teléfono), fixtures
  compartidos de bundles/deltas/backup/búsqueda/migraciones y E2E Playwright de
  contenido (estado vacío, instalación, búsqueda offline, round-trip de backup,
  rechazo de corrupto).

### Corregido
- **Clave duplicada en el pack demo** (`crt:demo-0001` declaraba `estado` dos veces):
  defecto real detectado por el parser estricto de Android (JSON.parse lo silenciaba).
  El estado de emisión es `estado_emision` (ADR-0006); contenido demo corregido y
  regenerado el bundle firmado. Regla documentada: los packs no admiten claves
  duplicadas (RFC 8259).
- La sección "Ver fuente" mostraba el número de página bajo la etiqueta "Revisión";
  ahora muestra documento, código oficial, revisión y página con sus etiquetas correctas.
- Los E2E de F1.2/F1.3 fijaban la barra de 4 pestañas por índice; actualizados al
  shell de 5 secciones (añade "Contenido").

### Pendiente posterior (no bloquea F1.4)
- Room/FTS para búsquedas grandes en Android (F4.4; la interfaz de `FilePackStore`
  está preparada — ver ADR-0009 §3).
- Clave de firma de producción para packs reales (F4.3/F11.1; fuera del repo).
- Selector de archivos nativo (SAF) en Android: hoy la copia se exporta/restaura desde
  el directorio de la app vía `adb`/gestor de archivos.
- Supabase y sync real entre dispositivos: F8 sobre este mismo contrato.

## [0.4.0] — 2026-11-25 — Fase 1.3 · Motor de tema y festividades

Cerrada y etiquetada `fase-1.3`. Verificada en Windows, PWA y **teléfono real Xiaomi Redmi
22101316G (Android 14 / API 34)**.

### Añadido
- **Motor de festividades con reloj inyectado** (`festivities.ts` y `FestivityEngine.kt`): fechas fijas con ventana, Pascua/Carnaval (Meeus/Jones/Butcher), enésimos domingos de Venezuela, prioridad en conflictos, filtro por país, override manual, opt-out y modo sobrio.
- **27 fixtures compartidos** Android↔PWA en `packages/shared-fixtures/theme/festivities-fixtures.json`: 29 de febrero, cambio de año, zonas horarias, DST, conflicto Carnaval/San Valentín y casos de opt-out.
- **Android:** temas por capa sobre Material You (solo acentos/contenedores), tokens neutros de superficie, 9 paletas festivas, arte vectorial original, sección de Ajustes con switches y selector de festividad, persistencia sin reinicio y refresco de fecha cada minuto.
- **PWA:** variables CSS de festividad, arte SVG propio, sección de Ajustes accesible, persistencia en IndexedDB, `data-festivity`/`data-sober` y recálculo cada minuto.
- **Contraste AA:** `palettes.json` compartido, contraste calculado en Vitest y JUnit para todas las festividades (claro/oscuro) y el tema base; CSS sincronizado por prueba.
- **Evidencia:** capturas Android (claro, oscuro, Navidad, Carnaval, Halloween, sobrio, Material You) y PWA (6 estados); logs de opt-out por UI y persistencia.
- **ADR-0008:** reglas, prioridades, paletas, fechas y límites; días de familia venezolanos marcados como pendientes de validación cultural.

### Corregido
- Tokens de superficie por defecto de Material 3 (lavandas) reemplazados por neutros de marca, sin romper Material You ni el contraste.
- El tema festivo no sustituye el esquema base: solo acentos y contenedores, para no degradar fondos, texto ni controles.

### Pendiente posterior (no bloquea F1.3)
- Validación cultural de las fechas de Día de la Madre/Padre/Niño por Factronics.
- Partículas/sonidos opcionales (F1.3 usa arte estático para respetar movimiento reducido y batería).
- Revisión nativa de las traducciones de interfaz.

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
