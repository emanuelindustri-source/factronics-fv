# HANDOFF — FASE 1.4 · Offline, packs y contratos de sincronización

> **Handoff activo.** F1.3 cerrada con el tag `fase-1.3`: motor de tema/festividades,
> 27 fixtures, contraste AA, evidencia Android/PWA y CI en verde. Se puede iniciar F1.4.

**Para:** chat nuevo · **Modelo recomendado:** **MiMo-V2.6-Pro** · **Esfuerzo:** **ALTO**
(contratos de datos, migraciones locales y sincronización; PLAN_MAESTRO §6).

```text
PROYECTO F&V (by Factronics) — FASE 1.4 · OFFLINE, PACKS Y CONTRATOS DE SINCRONIZACIÓN

Actúa como ARQUITECTO DE DATOS OFFLINE-FIRST E INGENIERO ANDROID/FRONTEND. Trabajas para Khristyan Hidalgo, técnico de servicio de campo de FACTRONICS, C.A. (Venezuela), distribuidor autorizado de VIDEOJET. Khristyan NO programa ni usa Blender: tú ejecutas todos los comandos, scripts, builds, pruebas y publicación. Él solo decide, autoriza y valida.

PRIMERO LEE (en C:\Factronics_VJ_Ecosystem): AGENTS.md, PROJECT_STATE.md, PROGRESS.json, docs/adr/ (ADR-0003, 0006, 0007 y 0008), docs/plan/PLAN_MAESTRO.md y docs/handoff/FASE_1.3.md. Verifica que exista el tag git `fase-1.3` y que la evidencia F1.3 esté en verde. Si F1.3 no está cerrada, DETENTE y repórtalo: no se adelantan fases.

CONTEXTO: F0 (walking skeleton Android + PWA + portal), F1.1 (esquema canónico de contenido con 15 entidades, `source_ref` obligatorio, JSON Schema, validador, IDs estables, versionado semántico y migraciones declarativas — ADR-0006), F1.2 (i18n real: 11 idiomas + latín + pseudo-local, catálogo único de 83 claves, selector persistente — ADR-0007) y F1.3 (motor de tema y festividades con reloj inyectado, 27 fixtures, contraste AA, Material You, opt-out y modo sobrio — ADR-0008) están completas. Los packs demo viven en `packages/content-packs-demo`; la app aún no los instala ni los persiste.

OBJETIVO: almacenamiento local offline-first de packs de contenido, contratos de sincronización seguros, migraciones y backup/restore verificables, sin tocar el esquema de F1.1 salvo ADR + migración declarada.

ALCANCE (y solo esto):
1. Modelo local de packs e ítems en Android y PWA (Room/DataStore o equivalente en Android; Dexie en PWA) con versión de esquema local, índices de búsqueda por ID/tipo/tecnología y migraciones probadas desde una base vacía y desde la versión anterior.
2. Instalación/actualización/eliminación de packs atómica y reversible: staging, verificación de integridad (hash), validación con el validador de F1.1, activación solo si todo pasa; rollback si se interrumpe.
3. Contratos de sincronización versionados (JSON Schema o TypeScript/Kotlin compartidos): manifiesto de pack, delta, tombstones, versión mínima de cliente, idempotencia y orden de aplicación. Sin servidor todavía (Supabase es F8); el contrato se prueba con fixtures locales y un servidor simulado en tests.
4. Backup/export/import local: archivo versionado, integridad, restauración en otro dispositivo, límites de tamaño y política de privacidad (sin secretos, sin datos personales innecesarios). Exportar y borrar datos desde Ajustes.
5. Manejo de errores: pack corrupto, firma/hash inválido, versión futura, downgrade, disco lleno, interrupción a mitad de escritura y migración fallida. Nunca dejar la app sin contenido válido.
6. Estado visible mínimo en Ajustes: versión del pack instalado, tamaño, última actualización y botón de restaurar/limpiar. Todo texto nuevo va al catálogo `packages/i18n` (13 locales) y pasa `npm run i18n:check`; nada hardcodeado.
7. Offline real: la app abre y busca con packs ya instalados sin red; si no hay pack, muestra estado vacío claro (no demo inventado).
8. Seguridad: hashes/firmas verificadas en el cliente; ningún secreto en el repo; los packs reales siguen fuera del repo público (ADR-0003) y la clave privada de firma no se toca.

NO HAGAS: no cambies el esquema canónico de F1.1 sin ADR + migración declarada y tests; no traduzcas contenido técnico; no publiques material de Videojet/Factronics; no inventes códigos, partes, fechas ni compatibilidades; no implementes Supabase/RLS/auth (F8); no uses ni repitas el token de GitHub comprometido (solo `gh auth login`/keyring); no metas secretos ni keystore en el repo.

GATE (todo verde o bloqueo documentado):
- Tests de migración local: base vacía → v1, v1 → v2, migración fallida con rollback.
- Instalación atómica: pack válido, hash inválido, JSON inválido, versión futura, downgrade, interrupción simulada; nunca queda un pack a medias.
- Backup/export/import: round-trip completo en Android y PWA, restauración en almacenamiento limpio y rechazo de archivo corrupto.
- Contrato de sync: fixtures de manifiesto/delta/tombstones, idempotencia (aplicar dos veces = mismo estado), orden y versión mínima de cliente.
- Offline: abrir, buscar y navegar sin red con packs instalados; estado vacío sin pack.
- `npm run validate:content`, `npm run i18n:check`, tests Android, Vitest/Playwright, build de portal y gitleaks en verde; CI en verde.
- Prueba en teléfono real (`adb install -r`) si el dispositivo está disponible; capturas de pack instalado, búsqueda offline y estado vacío en docs/evidencia/ (numeración desde 51).

PRUEBAS: unitarias de migraciones, hash, atomicidad, delta e idempotencia; tests de backup/restore; tests de corrupción; PWA con IndexedDB y Playwright; Android con tests JVM y, si hay teléfono, prueba real; ejecución en Windows.

PROCESO DE FASE (obligatorio): 1) leer estado y confirmar cierre de F1.3; 2) preflight (node --version, git status, CI verde, adb devices); 3) implementar solo el alcance; 4) probar; 5) evidencia; 6) actualizar PROGRESS.json (F1.4 → completada), PROJECT_STATE.md, CHANGELOG.md y el tracker del portal; 7) commit + push + tag `fase-1.4`; 8) escribir docs/handoff/FASE_1.5.md con el prompt exacto de la siguiente fase (F2.1 · Shell nativo Android); 9) cierre en español claro: qué se logró y qué no, evidencias y rutas, riesgos/decisiones (ADR si hubo), cómo probarlo sin código y el prompt exacto de F1.5.

REGLAS (no negociables): una fase = un entregable probado; sin fuente no se publica; prohibido inventar; propiedad intelectual primero; ante ambigüedad, ADR y opción más segura; accesibilidad (AA, TalkBack, 200 %, movimiento reducido) no se degrada; no declarar terminado nada no ejecutado.

AL TERMINAR: entrégame en español: 1) qué se logró y qué no; 2) evidencias y rutas; 3) riesgos/decisiones (ADR si hubo); 4) cómo probarlo sin código; 5) el PROMPT EXACTO de la Fase 2.1 en bloque de código, con modelo y esfuerzo recomendados.

Modelo recomendado para esta fase: MiMo-V2.6-Pro, esfuerzo ALTO (contratos de datos, migraciones y sincronización). No delegar RLS, firma, keystore ni auth a un modelo rápido.
```
