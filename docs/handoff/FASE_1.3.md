# HANDOFF — FASE 1.3 · Motor de tema y festividades

> **BORRADOR — no ejecutar todavía.** F1.2 no está cerrada: falta el smoke Android en
> teléfono y las capturas `23..28`. No iniciar F1.3 hasta que exista el tag `fase-1.2`,
> `PROGRESS.json` marque F1.2 como `completada` y la evidencia Android esté en
> `docs/evidencia/`.

**Para:** chat nuevo · **Modelo recomendado:** **MiMo-V2.6-Pro** · **Esfuerzo:** **ALTO**
(Compose, tokens de color, cálculo de fechas y accesibilidad; PLAN_MAESTRO §6).

```text
PROYECTO F&V (by Factronics) — FASE 1.3 · MOTOR DE TEMA Y FESTIVIDADES

Actúa como ARQUITECTO DE UI/UX E INGENIERO ANDROID/FRONTEND. Trabajas para Khristyan Hidalgo, técnico de servicio de campo de FACTRONICS, C.A. (Venezuela), distribuidor autorizado de VIDEOJET. Khristyan NO programa ni usa Blender: tú ejecutas todos los comandos, scripts, builds, pruebas y publicación. Él solo decide, autoriza y valida.

PRIMERO LEE (en C:\Factronics_VJ_Ecosystem): AGENTS.md, PROJECT_STATE.md, PROGRESS.json, docs/adr/ (ADR-0003, 0006 y 0007), docs/plan/PLAN_MAESTRO.md y docs/handoff/FASE_1.2.md. Verifica que exista el tag git `fase-1.2` y que `docs/evidencia/28-android-smoke-i18n.json` esté en verde. Si F1.2 no está cerrada, DETENTE y repórtalo: no se adelantan fases.

CONTEXTO: F0 (walking skeleton Android + PWA + portal), F1.1 (esquema canónico de contenido, `source_ref` obligatorio, validador, pack demo — ADR-0006) y F1.2 (i18n real: 11 idiomas + latín easter egg + pseudo-local es-XA; catálogo único de 67 claves en `packages/i18n`; generación de recursos Android/PWA; selector persistente; formatos por locale; ADR-0007) están completas. La app ya tiene tokens de color, tema claro/oscuro/sistema, Material You en Android 12+ y respeto a movimiento reducido.

OBJETIVO: motor de tema y festividades completo, verificable, con contraste AA garantizado, sin romper Material You, con reloj inyectable y opt-out total.

ALCANCE (y solo esto):
1. Tokens de color centralizados (Android Compose y PWA CSS/TS) con variantes claro/oscuro y estados; auditoría de contraste AA (texto normal y grande) documentada.
2. Color dinámico Android 12+ (Material You) que conviva con el tema de marca; fallback correcto en Android 8–11; la PWA sigue `prefers-color-scheme` + selector.
3. Capa de festividad desacoplada del tema base: Navidad, Reyes, San Valentín, Carnaval, Día de la Madre, Día del Padre, Día del Niño, Halloween e Independencia (Venezuela), con:
   - reglas por país/zona horaria y “enésimo día de la semana” (p. ej. segundo domingo de mayo),
   - cálculo de Carnaval/Semana Santa con algoritmo declarado y probado,
   - override manual (forzar una festividad o “sin festividad”),
   - opt-out global y “modo sobrio” (sin partículas/sonidos/animaciones),
   - prioridad y conflicto entre festividades documentados.
4. Assets: iconos/SVG/partículas y sonidos opcionales; nada copiado de Videojet/Factronics (ADR-0003); licencias y autoría documentadas; tamaños y tiers para gama baja.
5. Aplicación en Android y PWA: el tema festivo afecta acentos, ilustración de Inicio y detalles, nunca la legibilidad ni los controles; sin romper el layout con fuente al 200 %, sin RTL (fuera de alcance).
6. Textos nuevos SOLO de interfaz: añadirlos al catálogo `packages/i18n` (13 locales) y ejecutar `npm run i18n:check`; no hardcodear nada. Nada de contenido técnico.
7. Persistencia local de preferencias (tema/festividad/opt-out) sin exigir reinicio del sistema; valores por defecto seguros y reversibles.
8. Accesibilidad: contraste AA, TalkBack (nombres de festividad/override), movimiento reducido respetado, objetivos de 48 dp, sin parpadeos ni sonidos automáticos.
9. Ética: nada de loot boxes, notificaciones culpabilizadoras ni rachas imposibles; las festividades son cosméticas y siempre desactivables.

NO HAGAS: no toques el esquema de contenido de F1.1 ni los packs (si algo lo exigiera: ADR + migración declarada); no traduzcas contenido técnico; no publiques material de Videojet/Factronics; no inventes fechas, historia ni tradiciones: las fechas fijas deben tener fuente citada y las móviles algoritmo documentado; lo dudoso queda “pendiente de validación”; ningún secreto en el repo; no uses ni repitas el token de GitHub comprometido (solo `gh auth login`/keyring).

GATE (todo verde o bloqueo documentado):
- Tests con reloj inyectado para 12 combinaciones fecha/país/zona horaria, incluidos cambio de año, 29 de febrero, DST y conflictos de prioridad.
- Contraste AA verificado por prueba automática (o auditoría con herramienta) en todos los temas/festividades, claro y oscuro.
- El usuario puede desactivar festividades y activar modo sobrio; se persiste y se revierte sin reinicio.
- Material You sigue funcionando en Android 12+ y el fallback de marca en versiones anteriores.
- Capturas de: tema base claro/oscuro, Navidad, Carnaval, Halloween y modo sobrio (Android y PWA) en docs/evidencia/.
- `npm run i18n:check`, tests Android y PWA, `npm run validate:content`, build de portal y gitleaks en verde; CI en verde.
- Prueba en teléfono real (`adb install -r`) de al menos 2 festividades + opt-out, si el dispositivo está disponible.

PRUEBAS: unitarias de reglas de fecha y prioridad; tests de contraste; tests de persistencia; Compose/UI cuando aporte; Playwright para PWA (fechas inyectadas por reloj falso); ejecución real en Windows; teléfono real cuando esté disponible. Guarda evidencia en docs/evidencia/ (numeración desde 36).

PROCESO DE FASE (obligatorio): 1) leer estado y confirmar cierre de F1.2; 2) preflight (node --version, git status, CI verde, adb devices); 3) implementar solo el alcance; 4) probar; 5) evidencia; 6) actualizar PROGRESS.json (F1.3 → completada), PROJECT_STATE.md, CHANGELOG.md y el tracker del portal; 7) commit + push + tag `fase-1.3`; 8) escribir docs/handoff/FASE_1.4.md con el prompt exacto de la siguiente fase (F1.4 · Offline, packs y contratos de sincronización); 9) cierre en español claro: qué se logró y qué no, evidencias y rutas, riesgos/decisiones (ADR si hubo), cómo probarlo sin código y el prompt exacto de F1.4.

REGLAS (no negociables): una fase = un entregable probado; prohibido inventar fechas o tradiciones; propiedad intelectual primero; ante ambigüedad, ADR y opción más segura; accesibilidad (AA, TalkBack, 200 %, movimiento reducido) no se degrada; no declarar terminado nada no ejecutado.

AL TERMINAR: entrégame en español: 1) qué se logró y qué no; 2) evidencias y rutas; 3) riesgos/decisiones (ADR si hubo); 4) cómo probarlo sin código; 5) el PROMPT EXACTO de la Fase 1.4 en bloque de código, con modelo y esfuerzo recomendados.

Modelo recomendado para esta fase: MiMo-V2.6-Pro, esfuerzo ALTO (Compose + cálculo de fechas + accesibilidad). Si la fase toca contratos de datos, migraciones de esquema, RLS o seguridad, mantén MiMo-V2.6-Pro y esfuerzo ALTO.
```
