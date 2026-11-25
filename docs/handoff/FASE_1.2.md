# HANDOFF — FASE 1.2 · Internacionalización real

**Para:** chat nuevo · **Modelo recomendado:** DeepSeek V4.1 Flash · **Esfuerzo:** medio (i18n, según PLAN_MAESTRO §6; si aparecen decisiones de arquitectura de datos o migraciones, escalar a MiMo-V2.6-Pro con esfuerzo alto)

> Copia el bloque de abajo tal cual en un chat nuevo de OpenCode.

```text
PROYECTO F&V (by Factronics) — FASE 1.2 · INTERNACIONALIZACIÓN REAL

Actúa como ARQUITECTO DE SOFTWARE e INGENIERO DE LOCALIZACIÓN. Trabajas para Khristyan Hidalgo, técnico de servicio de campo de FACTRONICS, C.A. (Venezuela), distribuidor autorizado de VIDEOJET. Khristyan NO programa ni usa Blender: tú ejecutas todos los comandos, scripts, builds, pruebas y publicación. Él solo decide, autoriza y valida.

PRIMERO LEE (en el repo C:\Factronics_VJ_Ecosystem): AGENTS.md, PROJECT_STATE.md, PROGRESS.json, docs/adr/ (incluido ADR-0006) y docs/plan/PLAN_MAESTRO.md. El estado real está en PROGRESS.json y PROJECT_STATE.md; si algo contradice este prompt, gana el estado del repo y lo documentas en un ADR.

CONTEXTO: F0 completada (walking skeleton Android+PWA+portal, CI en verde) y F1.1 completada (esquema canónico de contenido y procedencia: 15 entidades, source_ref obligatorio, validadores npm run validate:content, IDs estables, migraciones, pack demo — ADR-0006). La app Android (Compose) y la PWA (React/TS) ya tienen i18n mínimo (es/en) heredado del walking skeleton. Esta fase lo lleva a internacionalización real.

OBJETIVO: internacionalización completa y verificable de Android y PWA, con español de Venezuela como idioma principal.

ALCANCE (y solo esto):
1. 11 idiomas reales: es-VE (principal), en, pt-BR, pt-PT, it, de, fr, zh-Hans, ja, ko, hi. Latín SOLO como easter egg de interfaz/logros (nunca contenido técnico).
2. Android: locales_config, recursos por idioma, selector de idioma in-app (persistente, sin exigir reinicio del sistema), formato de fechas/números/porcentajes por locale.
3. PWA: i18next completo con detección + selector persistente, formatos de fecha/número por locale (Intl), mismas claves que Android.
4. Pseudo-locale (es-XA) para detectar textos hardcodeados y desbordes; prueba de que ningún texto literal queda fuera del sistema de traducción.
5. Separación estricta: textos de UI (traducibles) vs textos técnicos del contenido (vienen de los packs de contenido de F1.1, NO se traducen en esta fase — i18n de contenido es F1.4+).
6. Glosario de términos técnicos (es → idiomas) en docs/plan/GLOSARIO.md: al menos 30 términos del dominio (cabezal, cartucho, tinta, make-up, número de parte, código de error, etc.) con la traducción propuesta y estado "pendiente de revisión" salvo las aprobadas por Khristyan.

NO HAGAS: no traduzcas contenido técnico real (solo UI); no publiques contenido de Videojet/Factronics (ADR-0003); no inventes traducciones de términos técnicos como definitivas (glosario con estado "pendiente de revisión"); no toques el esquema de contenido de F1.1 salvo que sea imprescindible (y en ese caso, ADR + migración declarada); ningún secreto en el repo; no uses ni repitas el token de GitHub comprometido (autenticación solo por gh auth login / keyring).

GATE (todo verde o bloqueo documentado):
- Smoke test en los 11 locales + latín en Android y PWA: la UI renderiza completa en cada uno.
- 0 textos hardcodeados en pantallas (pseudo-locale es-XA revela cualquier literal faltante).
- Formato de fecha/número correcto en al menos es-VE, en-US, de-DE, ja-JP (pruebas automáticas).
- Capturas de 3 idiomas (es-VE, ja, hi) en Android y PWA guardadas en docs/evidencia/.
- Tests unitarios de i18n (claves completas por idioma: ningún locale con claves faltantes ni sobrantes; paridad de claves Android ↔ PWA).
- CI en verde (añadir job o pasos de i18n); gitleaks limpio.

PRUEBAS: unitarias de paridad de claves y formatos; ejecución en Windows local; teléfono real (adb install) para al menos 2 idiomas si el dispositivo está disponible; PWA con Playwright en 3 idiomas.

PROCESO DE FASE (obligatorio): 1) leer estado; 2) preflight rápido (node --version, git status, CI verde); 3) implementar solo el alcance; 4) probar; 5) evidencia en docs/evidencia/; 6) actualizar PROGRESS.json (F1.2 → completada), PROJECT_STATE.md, CHANGELOG.md y el tracker del portal; 7) commit + push + tag fase-1.2; 8) escribir docs/handoff/FASE_1.3.md con el prompt exacto de la siguiente fase (F1.3 · Motor de tema y festividades); 9) cierre en español claro: qué se logró, evidencias, riesgos y cómo probarlo.

REGLAS (no negociables): una fase = un entregable probado; prohibido inventar; propiedad intelectual primero; ante ambigüedad, ADR y opción más segura; accesibilidad (contraste AA, TalkBack, 200 % de fuente) no se degrada; no declarar terminado nada no ejecutado.

AL TERMINAR: entrégame en español: 1) qué se logró y qué no; 2) evidencias y rutas; 3) riesgos/decisiones (ADR si hubo); 4) cómo probarlo sin código; 5) el PROMPT EXACTO de la Fase 1.3 en bloque de código, con modelo y esfuerzo recomendados.

Modelo recomendado para esta fase: DeepSeek V4.1 Flash, esfuerzo MEDIO (i18n según PLAN_MAESTRO §6). Si la fase toca contratos de datos, migraciones de esquema o seguridad, escala a MiMo-V2.6-Pro con esfuerzo ALTO.
```
