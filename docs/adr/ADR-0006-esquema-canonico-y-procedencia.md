# ADR-0006 — Esquema canónico de contenido y sistema de procedencia

- **Fecha:** 2026-11-25 · **Estado:** Aceptada · **Decisor:** Khristyan Hidalgo
- **Fase:** F1.1 — Esquema canónico y procedencia
- **Relacionados:** ADR-0003 (contenido demo), ADR-0004 (repositorios), ADR-0005 (seguridad)

## Contexto

F1.1 debe definir el núcleo compartido de datos que consumirán Android, PWA, portal y
backend. Las restricciones que gobiernan la decisión son las reglas no negociables del
proyecto: **trazabilidad total** (todo dato técnico lleva documento, código oficial,
revisión, página, cita textual, confianza, revisor y fecha), **sin fuente no se publica**,
**prohibido inventar** códigos o especificaciones, y **propiedad intelectual primero**
(solo contenido demo autorizado en el repo público). Además, la documentación real del
equipo (carpeta `1880C`, local y gitignored) impone requisitos concretos: documentos con
código oficial y revisión, variantes por idioma, boletines, dibujos, IPB con números de
parte, y salto exacto a página.

## Decisión

Un **esquema documental de packs de contenido** validado con **JSON Schema draft 2020-12**
más una **capa de reglas semánticas**, en el paquete `packages/content-schema`
(`@factronics-fv/content-schema` v1.0.0), con los datos demo en
`packages/content-packs-demo` y fixtures compartidos en `packages/shared-fixtures`.

1. **15 entidades del dominio**, cada una con su JSON Schema: tecnología, familia,
   generación, modelo, sistema, componente, número de parte, código de error, tinta,
   documento, página, fragmento, pregunta, intento, certificado.
2. **`source_ref` obligatorio en todo ítem** (sin excepciones), con 8 campos requeridos:
   `documento`, `codigo_oficial`, `revision`, `pagina`, `cita_textual`, `confianza`
   (alta/media/baja), `revisor` y `fecha_revision`. Opcional: `pagina_fin` y
   `documento_id` (referencia al ítem documento; prohibida la autorreferencia). El
   validador rechaza explícitamente cualquier dato sin `source_ref` (regla
   `FALTA-PROCEDENCIA`) y cualquier procedencia incompleta (`SOURCE-REF-INCOMPLETO`).
3. **IDs estables** con forma `<prefijo>:<slug-kebab-case>` (`tec:`, `fam:`, `gen:`,
   `mod:`, `sis:`, `cmp:`, `prt:`, `err:`, `ink:`, `doc:`, `pag:`, `frag:`, `qst:`,
   `att:`, `crt:`). El ID **nunca cambia**; los cambios de contenido incrementan
   `revision` (entero ≥ 1). El validador exige unicidad y coherencia prefijo↔tipo.
4. **Versionado semántico del esquema** (`schema_version`, semver): MAJOR = incompatible
   (requiere migración declarada), MINOR = adiciones compatibles, PATCH = correcciones
   sin impacto en datos. El manifiesto del pack (`pack.json`) y cada ítem declaran la
   versión con la que fueron escritos; discrepancias se corrigen con
   `npm run migrate:content` y el validador las rechaza hasta tanto.
5. **Migraciones declarativas**: registro `MIGRATIONS` (vacío en v1) de transformaciones
   `{desde, hasta, aplicar(pack)}` encadenadas. Un pack **más nuevo** que la herramienta
   se rechaza (nunca se "adivina"); un pack más viejo sin ruta declarada también. El
   mecanismo está probado con migraciones sintéticas en `test/migrate.test.mjs`.
6. **Packs demo blindados** (reglas semánticas automáticas): manifiesto `demo: true`,
   etiqueta `DEMO` obligatoria en cada ítem y **todo código debe empezar por `DEMO-`**
   (partes, errores, tintas, documentos y `source_ref`). Así se hace cumplir "nada real,
   nada inventado" por máquina, no por buena voluntad.
7. **Certificados**: campo `programa` debe declarar "programa interno" de Factronics y
   `aviso` debe decir "No es una certificación oficial de Videojet Technologies"
   (verificación semántica). Un certificado que se declare oficial se rechaza.
8. **Campos renombrados por colisión** (encontrada por los tests): la revisión del
   documento es `revision_documento` (la `revision` entera del ítem conserva su nombre) y
   el estado de emisión del certificado es `estado_emision` (el ciclo de vida del ítem
   conserva `estado`).
9. **Workspaces del monorepo**: `package.json` raíz con `workspaces: ["packages/*"]` y el
   script `npm run validate:content`. `apps/*` quedan **fuera** de los workspaces a
   propósito: conservan su `npm ci` independiente en CI (verificado localmente con
   `npm ci --dry-run`).
10. **Validadores ejecutables**: `npm run validate:content` (CLI con salida de errores por
    regla, `--json` disponible), `npm test` (36 pruebas: casos negativos incluidos) y
    `npm run migrate:content`. Nuevo job `content` en `.github/workflows/ci.yml`.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| **Esquema relacional (SQL) primero** | Requiere servidor/base desde el día 1; el producto es offline-first con packs portables. Se perdería la portabilidad de los packs entre Android, PWA y portal. Las relaciones del dominio quedan cubiertas por referencias por ID validadas. |
| **Markdown + frontmatter YAML** | Cómmodo para humanos, débil para validación máquina: sin tipos estrictos, sin rechazo garantizado de datos sin fuente y con frontmatter propenso a errores silenciosos. La trazabilidad exigiría convenciones no verificables. |
| **XML / DITA** | Estándar de documentación técnica maduro, pero pesado para el equipo (herramientas, curva de aprendizaje, transformaciones) y difícil de consumir directamente desde Kotlin/TS sin capas extra. |
| **JSON plano sin `source_ref` obligatorio** | Más simple, pero viola la regla "sin fuente no se publica": el riesgo de publicar datos sin trazabilidad es inaceptable (certificados, números de parte, diagnósticos). |
| **Un JSON Schema por ítem sin capa semántica** | El JSON Schema solo valida estructura: no detecta IDs duplicados, referencias rotas, códigos reales en packs demo ni certificados que se declaran oficiales. Se eligió esquema **+** reglas semánticas, ambas probadas. |
| **IDs numéricos autoincrementales (1, 2, 3…)** | No son estables entre entornos ni legibles en auditoría; dificultan el "ver fuente" y los diffs. Se eligieron IDs semánticos con prefijo de tipo. |
| **Un único archivo JSON gigante por pack** | Difícil de revisar y de hacer merge. Se eligió `pack.json` + `items/<tipo>.json`, auditable y amigable con revisión humana. |

## Sobre los documentos reales (1880C)

La carpeta `1880C` (manuales, boletines, dibujos, IPB y procedimientos de un equipo real)
se copió a `VIDEOJET_DOCS_ENTRADA/01_CIJ/` — **local y gitignored** — como insumo futuro de
la ingesta (F4.x). Sus metadatos (código oficial + revisión + variantes de idioma) motivan
los campos `codigo_oficial`, `revision_documento`, `idioma` y `tipo_documento` (incluye
`ipb`, `boletin`, `dibujo`, `procedimiento`...). Ningún contenido ni código real de esos
documentos se transcribió al repo público: el pack demo usa exclusivamente códigos `DEMO-`
y el inventario detallado queda solo en la carpeta local.

## Consecuencias

- Todo producto (apps, portal, backend) consume packs validados: si no pasa
  `validate:content`, no entra. La procedencia es verificable por CI en cada commit.
- Los datos demo son la plantilla de oro: cuando se autorice contenido real (ADR-0003),
  entra como pack `demo: false` en el repo privado con el mismo `source_ref`.
- Cualquier cambio incompatible del esquema exige bump MAJOR + migración declarada + tests:
  los packs viejos nunca se rompen en silencio.
- El costo: más campos obligatorios al crear ítems (aceptable: la trazabilidad es el
  requisito central del producto) y dependencia de `ajv`/`ajv-formats` en `content-schema`.
