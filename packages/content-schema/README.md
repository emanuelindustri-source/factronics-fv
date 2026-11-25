# @factronics-fv/content-schema — Esquema canónico y procedencia (F&V)

Núcleo compartido de datos del ecosistema F&V (by Factronics). Define **qué es un dato
técnico válido** y **cómo se prueba de dónde salió**. Lo consumirán Android, PWA, portal y
backend. Decisiones y alternativas: `docs/adr/ADR-0006-esquema-canonico-y-procedencia.md`.

## La regla reina

> **SIN FUENTE NO SE VALIDA NI SE PUBLICA.**

Todo ítem de contenido — sin excepciones — lleva `source_ref` con **8 campos obligatorios**:

| Campo | Qué es |
|---|---|
| `documento` | Título del documento de origen tal como aparece en él |
| `codigo_oficial` | Código oficial del documento (en packs demo: `DEMO-…`) |
| `revision` | Revisión del documento (`A`, `AB`, `Rev C`…) |
| `pagina` | Página de la cita (`pagina_fin` opcional para rangos) |
| `cita_textual` | Cita textual que respalda el dato (mín. 10 caracteres) |
| `confianza` | `alta` \| `media` \| `baja` |
| `revisor` | Persona que verificó el dato contra la fuente |
| `fecha_revision` | Fecha ISO de la revisión |

El validador rechaza un ítem sin `source_ref` con la regla `FALTA-PROCEDENCIA` y una
procedencia incompleta con `SOURCE-REF-INCOMPLETO`. Hay tests que lo demuestran.

## Estructura

- `schemas/` — 17 JSON Schema (draft 2020-12): `base` (definiciones comunes), 15 entidades
  y `pack` (manifiesto). Es la fuente declarativa de verdad.
- `src/constants.mjs` — tipos, prefijos de ID, mapa de referencias, campos de `source_ref`.
- `src/validate.mjs` — motor: JSON Schema **+** reglas semánticas (ver abajo).
- `src/migrate.mjs` — mecanismo declarativo de migraciones de esquema (semver).
- `src/load.mjs` — carga de packs desde disco.
- `src/cli.mjs` — CLI: `validate`, `migrate`, `version`.
- `src/types.ts` — tipos TypeScript compartidos (1:1 con los esquemas).
- `test/` — 30 tests, incluidos los casos negativos.

## Comandos

```powershell
# desde la raíz del monorepo
npm run validate:content     # valida packages/content-packs-demo
npm test                     # tests del validador y del pack demo
npm run migrate:content      # migra un pack a la versión vigente (reporta; --write guarda)

# directamente sobre cualquier pack
node packages/content-schema/src/cli.mjs validate <packDir> [--json]
node packages/content-schema/src/cli.mjs migrate <packDir> [--write]
```

## Reglas semánticas (además del JSON Schema)

| Regla | Rechaza |
|---|---|
| `FALTA-PROCEDENCIA` | Ítem sin `source_ref` (**la regla reina**) |
| `SOURCE-REF-INCOMPLETO` | `source_ref` sin alguno de los 8 campos |
| `SOURCE-REF-AUTO` | `source_ref.documento_id` apuntando al propio ítem |
| `SOURCE-REF-PAGINAS` | `pagina_fin < pagina` |
| `ID-FORMATO` / `ID-TIPO` / `ID-DUPLICADO` | IDs malformados, con prefijo incorrecto o repetidos |
| `REFERENCIA-NO-RESUELTA` / `REFERENCIA-TIPO` | Referencias rotas o al tipo equivocado |
| `COHERENCIA-PAGINA` | Fragmento cuya página pertenece a otro documento |
| `DEMO-ETIQUETA` / `DEMO-CODIGO` | Pack demo sin etiqueta `DEMO` o con códigos que no empiezan por `DEMO-` |
| `CERTIFICADO-PROGRAMA` / `CERTIFICADO-AVISO` | Certificado que no es "programa interno" o sin el aviso de no oficialidad |
| `PREGUNTA-RESPUESTA` | Respuesta correcta fuera de las opciones |
| `SCHEMA-VERSION` | Ítem con versión de esquema distinta al manifiesto |
| `ARCHIVO-TIPO` | Ítem en un archivo que no corresponde a su tipo |

## IDs estables y versionado

- Forma: `<prefijo>:<slug-kebab-case>` (p. ej. `prt:demo-0001`). Prefijos: `tec fam gen
  mod sis cmp prt err ink doc pag frag qst att crt`. **Inmutable** una vez publicado.
- Cambios de contenido → incrementan `revision` (entero). Los cambios de esquema → semver
  de `schema_version`: MAJOR exige migración declarada; los packs más nuevos que la
  herramienta se rechazan.
- Migraciones: registrar en `MIGRATIONS` objetos `{desde, hasta, descripcion, aplicar}`;
  el runner encadena y normaliza versiones. Ver `test/migrate.test.mjs`.

## Tipos compartidos

`src/types.ts` declara `SourceRef`, `ItemBase`, las 15 entidades, `PackManifest` y el
union `Item`, alineados 1:1 con `schemas/`. Si cambia el esquema, cambia la versión y se
declara migración (ADR-0006).
