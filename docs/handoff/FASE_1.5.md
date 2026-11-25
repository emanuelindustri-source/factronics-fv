# HANDOFF — FASE 2.1 · Shell nativo Android

> **Handoff activo.** F1.4 cerrada con el tag `fase-1.4`: almacén offline de packs
> (Android + PWA), instalación atómica con hash/firma/rollback, contratos de sync
> con fixtures y servidor simulado, backup/export/import verificable, offline real
> con estado vacío claro y evidencia en teléfono real. Se puede iniciar F2.1.

**Para:** chat nuevo · **Modelo recomendado:** **MiMo-V2.6-Pro** · **Esfuerzo:** **ALTO**
(nativo Android, Compose y navegación; PLAN_MAESTRO §6).

```text
PROYECTO F&V (by Factronics) — FASE 2.1 · SHELL NATIVO ANDROID

Actúa como INGENIERO ANDROID NATIVO (Kotlin + Jetpack Compose). Trabajas para Khristyan Hidalgo, técnico de servicio de campo de FACTRONICS, C.A. (Venezuela), distribuidor autorizado de VIDEOJET. Khristyan NO programa ni usa Blender: tú ejecutas todos los comandos, scripts, builds, pruebas y publicación. Él solo decide, autoriza y valida.

PRIMERO LEE (en C:\Factronics_VJ_Ecosystem): AGENTS.md, PROJECT_STATE.md, PROGRESS.json, docs/adr/ (ADR-0003, 0006, 0007, 0008 y 0009), docs/plan/PLAN_MAESTRO.md y docs/handoff/FASE_1.4.md. Verifica que exista el tag git `fase-1.4` y que la evidencia F1.4 esté en verde. Si F1.4 no está cerrada, DETENTE y repórtalo: no se adelantan fases.

CONTEXTO: F0 (walking skeleton Android + PWA + portal), F1.1 (esquema canónico de contenido con 15 entidades, source_ref obligatorio, JSON Schema, validador, IDs estables y migraciones — ADR-0006), F1.2 (i18n real: 11 idiomas + latín + pseudo-local, catálogo único de 148 claves × 13 locales, selector persistente — ADR-0007), F1.3 (motor de tema y festividades con reloj inyectado, 27 fixtures, contraste AA, Material You, opt-out y modo sobrio — ADR-0008) y F1.4 (almacén offline de packs con instalación atómica + hash + firma ECDSA + rollback, contratos de sync versionados con delta/tombstones/idempotencia, backup/export/import verificable, búsqueda offline por ID/tipo/tecnología y estado vacío claro — ADR-0009) están completas. La app Android tiene navegación básica (home/profile/content/settings/about), tema por capas sobre Material You y el almacén FilePackStore de F1.4.

OBJETIVO: consolidar el shell nativo Android sobre el que se construyen las pantallas de F2.x: arquitectura de navegación completa, edge-to-edge, splash, predictive back, adaptativo teléfono/tablet, estados de carga/error/vacío reutilizables y calidad de base (rotación, dark mode, sin crashes).

ALCANCE (y solo esto):
1. Arquitectura de navegación completa con Navigation Compose: rutas tipadas, argumentos, deep links internos, estado de navegación restaurable (rotación y proceso muerto), barra inferior accesible (48 dp, semántica de radio) y transiciones que respetan movimiento reducido.
2. Shell visual: edge-to-edge completo (barras e insets correctos en gestos y 3 botones), splash nativo con la marca F&V (core-splashscreen ya integrado), predictive back (android:enableOnBackInvokedCallback) con gesto verificado, y adaptativo teléfono/tablet (paneles o columnas según ancho, sin layouts rotos).
3. Estados de carga/error/vacío reutilizables (componentes Compose con semántica y textos del catálogo i18n): loading accesible (sin spinners decorativos sin etiqueta), error con reintento, vacío con acción. Usarlos en Home, Contenido y Ajustes donde aplique.
4. Calidad de base: rotación en todas las pantallas sin perder estado; dark mode correcto (contraste AA intacto, F1.3); TalkBack navegable (orden de foco, objetivos 48 dp, sin focos fantasma); fuente 200 % sin cortes; sin memory leaks en el ciclo de vida (tests o verificación por herramientas).
5. Ajustes de experiencia: consistencia de títulos/secciones, idioma y tema aplicándose sin reinicio (ya existente de F1.2/F1.3: no regresarlo), y cero textos hardcodeados (todo por `packages/i18n`, 148 claves × 13 locales; si hacen falta claves nuevas, añadirlas a los 13 catálogos y `npm run i18n:check` en verde).
6. Rendimiento de arranque base: medición de cold start (adb + logcat o Macrobenchmark si el tiempo lo permite) y eliminación de trabajo obvio en el hilo principal (FilePackStore ya es IO explícito; mantenerlo fuera de composition).

NO HAGAS: no cambies el esquema canónico de F1.1 ni el contrato de sync de F1.4 (ADR-0006/ADR-0009) salvo ADR + migración; no implementes perfiles reales (F2.2), home definitivo (F2.3) ni baseline profiles completos (F2.4); no traduzcas contenido técnico; no publiques material de Videojet/Factronics; no inventes códigos, partes, fechas ni compatibilidades; no implementes Supabase/RLS/auth (F8); no uses ni repitas el token de GitHub comprometido (solo `gh auth login`/keyring); no metas secretos ni keystore en el repo.

GATE (todo verde o bloqueo documentado):
- APK instalada en teléfono real (`adb install -r`) con navegación completa por las 5 secciones, rotación sin pérdida de estado ni crashes y dark mode verificado.
- Predictive back y edge-to-edge verificados en el teléfono (gesto de vuelta, insets en gestos y 3 botones).
- TalkBack navegable (captura o log de foco) y fuente 200 % sin cortes en las pantallas del shell.
- Tablet o ventana ancha: layout adaptado verificado (emulador, tamaño de ventana o captura); sin layouts rotos.
- Estados de carga/error/vacío presentes y traducidos; `npm run i18n:check` en verde (13 locales).
- Tests Android en verde (los 44 de F1.4 no se rompen + los nuevos del shell), `npm run validate:content`, Vitest/Playwright, build de portal y gitleaks en verde; CI en verde.
- Evidencia en docs/evidencia/ (numeración desde 74): capturas del shell, rotación, dark mode, tablet/ancho, TalkBack o fuente 200 %, y log de cold start/logcat sin errores.

PRUEBAS: unitarias de navegación/estados (JVM o instrumentación según aplique), dispositivo físico (Xiaomi Redmi 22101316G, Android 14 / API 34, disponible por adb), Playwright/Vitest sin regresiones (la PWA no se toca salvo i18n compartido), ejecución en Windows.

PROCESO DE FASE (obligatorio): 1) leer estado y confirmar cierre de F1.4; 2) preflight (node --version, git status, CI verde, adb devices, build base); 3) implementar solo el alcance; 4) probar; 5) evidencia; 6) actualizar PROGRESS.json (F2.1 → completada), PROJECT_STATE.md, CHANGELOG.md y el tracker del portal; 7) commit + push + tag `fase-2.1`; 8) escribir docs/handoff/FASE_2.2.md con el prompt exacto de la siguiente fase (F2.2 · Perfil completo local); 9) cierre en español claro: qué se logró y qué no, evidencias y rutas, riesgos/decisiones (ADR si hubo), cómo probarlo sin código y el prompt exacto de F2.2.

REGLAS (no negociables): una fase = un entregable probado; sin fuente no se publica; prohibido inventar; propiedad intelectual primero; ante ambigüedad, ADR y opción más segura; accesibilidad (AA, TalkBack, 200 %, movimiento reducido) no se degrada; no declarar terminado nada no ejecutado.

AL TERMINAR: entrégame en español: 1) qué se logró y qué no; 2) evidencias y rutas; 3) riesgos/decisiones (ADR si hubo); 4) cómo probarlo sin código; 5) el PROMPT EXACTO de la Fase 2.2 en bloque de código, con modelo y esfuerzo recomendados.

Modelo recomendado para esta fase: MiMo-V2.6-Pro, esfuerzo ALTO (nativo Android, Compose y navegación). No delegar RLS, firma, keystore ni auth a un modelo rápido.
```
