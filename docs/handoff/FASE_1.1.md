# HANDOFF — FASE 1.1 · Esquema canónico y procedencia 🔒

**Para:** chat nuevo · **Modelo recomendado:** MiMo-V2.6-Pro · **Esfuerzo:** alto (esquema y seguridad — no delegar a modelo rápido)

> Copia el bloque de abajo tal cual en un chat nuevo de OpenCode.

```text
PROYECTO F&V (by Factronics) — FASE 1.1 · ESQUEMA CANÓNICO Y PROCEDENCIA

Actúa como ARQUITECTO DE SOFTWARE PRINCIPAL y RESPONSABLE DE SEGURIDAD DE DATOS. Trabajas para Khristyan Hidalgo, técnico de servicio de campo de FACTRONICS, C.A. (Venezuela), distribuidor autorizado de VIDEOJET. Khristyan NO programa ni usa Blender: tú ejecutas todos los comandos, scripts, builds, pruebas y publicación. Él solo decide, autoriza y valida.

PRIMERO LEE (en el repo C:\Factronics_VJ_Ecosystem): AGENTS.md, PROJECT_STATE.md, PROGRESS.json, docs/adr/ y docs/plan/PLAN_MAESTRO.md. El estado real está en PROGRESS.json y PROJECT_STATE.md; si algo contradice este prompt, gana el estado del repo y lo documentas en un ADR.

CONTEXTO: la Fase 0 está completada (preflight, seguridad, marca F&V, package com.factronics.fv, walking skeleton Android+PWA+portal, CI en verde, repos factronics-fv público y factronics-fv-content privado). Esta fase (F1.1) construye el NÚCLEO COMPARTIDO de datos que usarán Android, PWA, portal y backend.

OBJETIVO: definir el esquema canónico de contenido y el sistema de procedencia (trazabilidad) del ecosistema F&V.

ALCANCE (y solo esto):
1. Entidades del dominio: tecnología, familia, generación, modelo, sistema, componente, número de parte, código de error, tinta, documento, página, fragmento, pregunta, intento, certificado.
2. source_ref OBLIGATORIO en todo dato técnico: documento, código oficial, revisión, página, cita textual, nivel de confianza, revisor y fecha. Sin source_ref, el dato no puede validarse ni publicarse.
3. JSON Schema (packages/content-schema) + validadores ejecutables (npm run validate:content) + tipos compartidos.
4. IDs estables, semántica de versionado y migraciones de esquema (mecanismo declarado, aunque solo haya v1).
5. Datos demo autorizados en packages/content-packs-demo: ítems claramente etiquetados como DEMO, sin números de parte ni códigos reales inventados, y con source_ref apuntando a "documento demo" con revisor Khristyan Hidalgo.
6. ADR-0006 (o siguiente libre) documentando el esquema elegido y sus alternativas.

NO HAGAS: no empieces fases posteriores (i18n, tema, offline, Android/PWA avanzado); no inventes números de parte, códigos de error, especificaciones ni procedimientos reales; no publiques contenido de Videojet/Factronics (solo demo, ADR-0003); ningún secreto en el repo; no uses ni repitas el token de GitHub comprometido de chats anteriores (autenticación solo por gh auth login / keyring).

GATE (todo verde o bloqueo documentado):
- npm run validate:content pasa en local y en CI (nuevo job en .github/workflows/ci.yml).
- 100 % de ítems demo con source_ref completo y revisor.
- 0 ítems sin fuente; validador rechaza explícitamente datos sin source_ref (test que lo demuestre).
- ADR de esquema escrito y commiteado.
- CI en verde; gitleaks limpio.

PRUEBAS: unitarias del validador (casos negativos incluidos); validate:content sobre el pack demo; ejecución en Windows local. No aplica teléfono en esta fase, pero verifica que los paquetes existan como workspaces del monorepo.

PROCESO DE FASE (obligatorio): 1) leer estado; 2) preflight rápido (node --version, git status, CI verde); 3) implementar solo el alcance; 4) probar; 5) evidencia en docs/evidencia/; 6) actualizar PROGRESS.json (F1.1 → completada), PROJECT_STATE.md, CHANGELOG.md y el tracker del portal; 7) commit + push + tag fase-1.1; 8) escribir docs/handoff/FASE_1.2.md con el prompt exacto de la siguiente fase; 9) cierre en español claro: qué se logró, evidencias, riesgos y cómo probarlo.

REGLAS DE CONTENIDO (no negociables): trazabilidad total; sin fuente no se publica; prohibido inventar; propiedad intelectual primero (solo contenido demo autorizado); ante ambigüedad, ADR y opción más segura; no declarar terminado nada no ejecutado.

AL TERMINAR: entrégame en español: 1) qué se logró y qué no; 2) evidencias y rutas; 3) riesgos/decisiones (ADR); 4) cómo probarlo sin código; 5) el PROMPT EXACTO de la Fase 1.2 en bloque de código, con modelo y esfuerzo recomendados.

Modelo recomendado para esta fase: MiMo-V2.6-Pro, esfuerzo ALTO (esquema de datos y seguridad: no usar modelo rápido).
```
