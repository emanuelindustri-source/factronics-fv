# Pack demo F&V — contenido DEMO autorizado

**Estado:** solo contenido demo (ADR-0003). **Revisor de todos los ítems:** Khristyan Hidalgo.

Este pack existe para probar el **esquema canónico** y la **procedencia** del ecosistema F&V.
TODOS los datos son ficticios de práctica:

- Todo ítem lleva la etiqueta `DEMO`.
- Todos los códigos empiezan por `DEMO-` (`DEMO-DOC-…`, `DEMO-PRT-…`, `DEMO-ERR-…`, `DEMO-INK-…`).
  **No corresponden a ningún número de parte, código de error o insumo real**, y tampoco son
  inventados "disfrazados": el prefijo `DEMO-` los marca inequívocamente como ficticios.
- Todos los ítems tienen `source_ref` completo (documento, código oficial, revisión, página,
  cita textual, confianza, revisor y fecha) apuntando al **documento demo** autorizado.
- Ningún nombre de modelo, serie o fabricante real aparece en este pack.

> El contenido técnico real (manuales, boletines, listas de partes de Videojet/Factronics) **no
> vive aquí**: está en `VIDEOJET_DOCS_ENTRADA/` (local, fuera de git) y en el repo privado
> `factronics-fv-content`, y solo entra al producto con autorización escrita y revisión humana.

## Estructura

- `pack.json` — manifiesto (`demo: true`, `schema_version`, versión del contenido).
- `items/<tipo>.json` — un archivo por tipo de entidad (15 tipos; este pack usa los 15).

## Validación

```powershell
# desde la raíz del monorepo
npm run validate:content

# o directamente
node packages/content-schema/src/cli.mjs validate packages/content-packs-demo
```

## Cobertura del pack

Incluye al menos un ítem de cada entidad del dominio: tecnología, familia, generación,
modelo, sistema, componente, número de parte, código de error, tinta, documento, página,
fragmento, pregunta (3 de los 7 tipos), intento y certificado — todos encadenados por
referencias coherentes (catálogo → modelo → sistema → componente → parte; documento →
página → fragmento; pregunta → intento → certificado).
