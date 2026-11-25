# ADR-0009 — Almacenamiento offline, contratos de sincronización e integridad de packs

- **Fecha:** 2026-11-25 · **Estado:** Aceptada · **Decisor:** Khristyan Hidalgo
- **Fase:** F1.4 — Offline, packs y contratos de sincronización
- **Relacionados:** ADR-0003 (contenido demo), ADR-0005 (seguridad), ADR-0006 (esquema canónico), ADR-0007 (i18n), ADR-0008 (tema y festividades)

## Contexto

F1.4 exige: modelo local de packs e ítems en Android y PWA con versión de esquema
local y migraciones; instalación/actualización/eliminación atómica y reversible con
verificación de integridad (hash) y validación de F1.1; contratos de sincronización
versionados (manifiesto, delta, tombstones, versión mínima de cliente, idempotencia,
orden) probados con fixtures y servidor simulado; backup/export/import local
verificable y con política de privacidad; manejo de errores (pack corrupto, hash/firma
inválidos, versión futura, downgrade, disco lleno, escritura interrumpida, migración
fallida) sin dejar la app jamás sin contenido válido; estado visible en Ajustes;
offline real; y hashes/firmas verificados en el cliente sin secretos en el repo.

Restricciones duras: **no tocar el esquema canónico de F1.1 sin ADR + migración
declarada**; Supabase/RLS/auth son de F8; los packs reales siguen fuera del repo
público (ADR-0003) y **la clave privada de firma de producción no se toca** (ADR-0005).

## Decisión

### 1. El contrato de sincronización vive en archivos NUEVOS, sin tocar F1.1

El pack de contenido de F1.1 (`pack.json` + `items/<tipo>.json`) no cambia ni un
campo. La capa de sincronización se añade **alrededor**:

- `sync-manifest.json` — `contract_version`, `pack_id`, `pack_version`,
  `schema_version`, `min_client_version`, `demo`, `creado`, `responsable`,
  `items_total` y `files[]` con **SHA-256 + tamaño por archivo**.
- `signature.json` — firma digital sobre el SHA-256 de `sync-manifest.json`
  (`alg`, `key_id`, `signed`, `sig`).
- **Bundle `.fvpack`** (`fvpack/1`) — unidad de instalación/distribución: manifiesto +
  firma + archivos completos como cadenas UTF-8 exactas (el hash es verificable byte
  a byte). Es el formato que instalan las apps, que firma la herramienta de
  empaquetado y que viaja en el backup.
- **Delta** — `base_version`, `delta_version`, `sequence`, `min_client_version`,
  `upserts[]` (archivo completo con hash) y `tombstones[]` (borrado lógico por ID).
- **Backup** (`fv-backup/1`) — packs + estado de sincronización + preferencias no
  personales, con `checksum` SHA-256 sobre la serialización canónica.

Esquemas JSON Schema (draft 2020-12) en `packages/sync-contracts/schemas/`.
Un `pack.json` de F1.1 **no necesita migración**: el esquema canónico queda intacto.

### 2. Especificación ejecutable + implementaciones paritarias (patrón ADR-0008)

- `packages/sync-contracts` (`@factronics-fv/sync-contracts`) es la **referencia**:
  tipos, validación, semántica de instalación/delta/backup, servidor simulado y
  81 tests (`node --test`).
- La PWA (TypeScript) y Android (Kotlin) implementan la misma semántica con los
  **mismos códigos de error y nombres de regla**, probadas contra los **fixtures
  compartidos** de `packages/shared-fixtures/sync/` (`sync-cases.json`,
  `crypto-vectors.json`). Las tres plataformas deben dar idénticos resultados.
- El servidor simulado reproduce entregas reales (normal, duplicados, fuera de orden,
  delta faltante, reconexión tipo "offline 24 h") y demuestra convergencia.
  Supabase llega en F8 sobre este mismo contrato.

### 3. Almacenamiento Android: `FilePackStore` (equivalente a Room, por ahora)

`Room/DataStore o equivalente` (alcance). Se eligió un **almacén de archivos propio
con transacciones** (`apps/android/.../data/pack/FilePackStore.kt`):

- `store.json` con `local_schema_version` + **registro de migraciones declarativas**
  (mismo concepto que las migraciones de contenido de F1.1: `{desde, hasta, aplicar}`).
- Índices de búsqueda por **ID / tipo / tecnología** reconstruidos al abrir.
- Atomicidad por **staging + journal + rename** con recuperación por **rollback**:
  una interrupción en cualquier paso deja el estado anterior consistente (o, si el
  commit de `store.json` ya se escribió, el nuevo íntegro). Probado con inyección de
  fallos paso a paso y con disco lleno (`DISCO-LLENO`).

*Por qué no Room ahora:* Room+KSP añade toolchain (KSP↔Kotlin 2.0.21, Robolectric)
y sus pruebas de migración requieren emulación/instrumentación; el alcance F1.4 es la
semántica offline (integridad, atomicidad, migraciones, sync, backup), que es agnóstica
al almacén y se prueba de forma determinista en JVM puro. La interfaz de
`FilePackStore` está preparada para una implementación Room/FTS cuando la búsqueda lo
exija (F4.4, buscador con FTS). Si Khristyan prefiere Room ya, el cambio es local a
este archivo y sus tests.

*Alternativas descartadas:* SharedPreferences (sin estructura ni transacciones),
SQLite cruda (mismo alcance que FilePackStore sin la ventaja de revisiones de
archivos), JSON único gigante (sin atomicidad parcial).

### 4. Almacenamiento PWA: Dexie v2

Se extiende la base `fv-db` existente a `version(2)` con tablas `packs`,
`contentItems`, `tombstones` y `syncState`. El upgrade v1→v2 **preserva el perfil**
(probado). Las transacciones de IndexedDB dan la atomicidad (escritura parcial =
abort). Pruebas con `fake-indexeddb` (unitarias) y Playwright (navegador real).

### 5. Integridad: SHA-256 por archivo + firma ECDSA P-256

- **Hash:** SHA-256 (UTF-8) por archivo, declarado en `sync-manifest.json` y
  verificado al instalar y al aplicar cada delta.
- **Firma:** **ECDSA P-256 + SHA-256** ("SHA256withECDSA"), DER en base64, clave
  pública SPKI DER en base64 dentro de un `truststore.json`. Se eligió ECDSA P-256 y
  **no Ed25519** porque Ed25519 solo está disponible desde Android 13 (el proyecto
  soporta minSdk 26); el campo `alg` del contrato permite migrar de algoritmo sin
  romper clientes. La firma cubre el SHA-256 de `sync-manifest.json`, que a su vez
  cubre los archivos: cadena completa de integridad.
- **Serialización canónica** (claves ordenadas, enteros, escapado mínimo) para los
  checksums del backup, con **vectores compartidos** que fijan bytes exactos y se
  reproducen en JS, TS y Kotlin (prueba de compatibilidad de plataforma también para
  la firma: el vector generado por Node verifica en Kotlin y viceversa).

### 6. Claves: disciplina ADR-0005

- La clave **DEMO** de packs se genera una vez y vive **solo** en
  `_private/demo-signing/` (gitignored). En el repo público solo hay la **clave
  pública** (`bundle/truststore.json`, etiquetada `demo: true`).
- Las pruebas generan claves **efímeras** en tiempo de ejecución (nunca en git).
- La **clave de producción** de packs reales llega en F4.3/F11.1, se guarda fuera del
  repo y este contrato solo la usa vía entorno. No se toca en F1.4.

### 7. Instalación atómica y manejo de errores

Orden de validación (mismo en las 3 plataformas): estructura → contract_version →
min_client_version → schema_version futura (se rechaza, **nunca se adivina**) →
downgrade (bloqueado; reinstalar la misma versión es no-op) → hashes → firma →
reglas de contenido de F1.1 → activación transaccional. Códigos de error estables:
`PACK-CORRUPTO`, `HASH-INVALIDO`, `FIRMA-AUSENTE`, `FIRMA-INVALIDA`,
`CLAVE-DESCONOCIDA`, `VERSION-FUTURA`, `DOWNGRADE`, `VERSION-CLIENTE`,
`CONTENIDO-INVALIDO`, `ORDEN-INVALIDO`, `BASE-DESCUADRE`, `TOMBSTONE-CONFLICTO`,
`RESPALDO-CORRUPTO`, `RESPALDO-DEMASIADO-GRANDE`, `DISCO-LLENO`,
`ESCRITURA-INTERRUMPIDA`, `MIGRACION-FALLIDA`. Cada uno tiene su cadena traducida
(13 locales). Sin pack instalado la app muestra **estado vacío claro**, sin
contenido inventado.

### 8. Semántica de deltas

Orden estricto por `sequence` (sin saltos: `ORDEN-INVALIDO` hasta que llegue el
faltante); **idempotencia** (aplicar dos veces = mismo estado; re-entrega = no-op);
`base_version` debe coincidir con lo instalado (`BASE-DESCUADRE`); sin downgrade;
**tombstones definitivos** (un ID eliminado no resucita: `TOMBSTONE-CONFLICTO`); el
resultado debe seguir pasando las reglas de contenido o no se aplica nada.

### 9. Backup con privacidad por diseño

`fv-backup/1` contiene SOLO packs, estado de sync y preferencias no personales
(idioma, tema, festividades). El esquema JSON **prohíbe otras propiedades** en
`settings` (un intento de meter `name` se rechaza — probado). Sin secretos. Límite
50 MiB (`RESPALDO-DEMASIADO-GRANDE`). Restauración en almacenamiento limpio = mismo
estado (probado en Android y PWA). Cadena de verificación en la restauración: firma
de origen **siempre**; hashes de archivos exigibles solo si el pack nunca recibió
deltas (cada delta ya verificó sus hashes al aplicarse).

### 10. Validación en cliente = reglas semánticas de F1.1 con paridad probada

El validador completo de F1.1 (ajv + reglas) sigue siendo **obligatorio** en CI y en
la herramienta de empaquetado (`tools/pack-bundle.mjs` no empaqueta un pack que no
pase `validate:content`). Las apps validan al instalar/importar **sin red** con las
mismas reglas semánticas y los **mismos nombres de regla** (`FALTA-PROCEDENCIA`,
`DEMO-CODIGO`, `CERTIFICADO-AVISO`…), verificadas contra fixtures compartidos: los
casos negativos de procedencia se rechazan igual en JS, TS y Kotlin.

### 11. JSON estricto: claves duplicadas se rechazan

El parser estricto de Android rechaza claves duplicadas en JSON (`PACK-CORRUPTO`).
Esto **detectó un defecto real** en el pack demo (`crt:demo-0001` tenía `estado`
dos veces, resido de la renombración a `estado_emision` de ADR-0006): corregido el
contenido demo. RFC 8259: los nombres deben ser únicos; un parser laxo (JSON.parse)
silencia el problema tomando el último valor. Se documenta: los packs NO deben
contener claves duplicadas y la prueba de Android actúa como detector en CI.

## Alternativas consideradas (resumen)

| Alternativa | Por qué no |
|---|---|
| Room + KSP ahora | Riesgo de toolchain y pruebas de migración pesadas sin aportar a la semántica F1.4; se aplaza a F4.4 con interfaz preparada (ver §3) |
| Ed25519 para packs | Solo disponible desde Android 13; minSdk es 26. `alg` permite migrar |
| Hash dentro de pack.json | Tocaría el esquema de F1.1 (exige ADR + migración); la capa externa es indistinguible en seguridad |
| Backup sin checksum | Un bit corrompido se restauraría como válido |
| Permitir downgrade | Un pack viejo pisaría contenido nuevo en silencio; se bloquea |
| Clave privada en el repo (aunque sea demo) | Viola ADR-0005; vive en `_private/` gitignored |
| Validar solo en servidor | El producto es offline-first: la validación en cliente es obligatoria |

## Consecuencias

- Cualquier app futura (o F8) habla este contrato: bundles `.fvpack`, deltas por
  `sequence` y backups `fv-backup/1`. Cambios incompatibles = bump de
  `contract_version` con rechazo explícito en clientes viejos.
- Los paquetes reales se empaquetarán con `tools/pack-bundle.mjs` + clave de
  producción (fuera del repo) y se distribuirán como `.fvpack` (F8/F11.1).
- El costo: dos implementaciones (Kotlin/TS) además de la referencia JS, sostenidas
  por fixtures compartidos. Aceptable: es el mismo mecanismo de paridad que ADR-0008
  y evita atar el contrato a un solo runtime.
- La numeración de evidencia de F1.4 arranca en **58** (el rango 51–57 ya lo ocupó la
  evidencia de cierre de F1.3; el handoff decía "desde 51" por redactarse antes).
