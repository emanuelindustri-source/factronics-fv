# shared-fixtures — Casos de prueba compartidos (F&V)

Fixtures JSON reutilizables para probar el validador de contenido y, más adelante,
las apps Android/PWA/portal. Todos los datos son **demo ficticios** (prefijo `DEMO-`):
no contienen números de parte, códigos ni especificaciones reales (ADR-0003).

## Estructura

- `content/validos/` — ítems bien formados, con `source_ref` completo (revisor: Khristyan Hidalgo).
- `content/invalidos/` — violaciones deliberadas, una por archivo, para los casos negativos:
  - `item-sin-source-ref.json` → **sin fuente no se valida ni se publica** (regla FALTA-PROCEDENCIA).
  - `item-source-ref-sin-revisor.json` → procedencia incompleta (SOURCE-REF-INCOMPLETO).
  - `item-source-ref-sin-cita.json` → procedencia incompleta (SOURCE-REF-INCOMPLETO).
  - `item-id-invalido.json` → ID malformado (ID-FORMATO).
  - `item-id-tipo-incoherente.json` → prefijo del ID no corresponde al tipo (ID-TIPO).
  - `item-sin-etiqueta-demo.json` → ítem de pack demo sin etiqueta DEMO (DEMO-ETIQUETA).
  - `item-codigo-no-demo.json` → código sin prefijo DEMO- en pack demo (DEMO-CODIGO).
  - `pregunta-respuesta-fuera.json` → respuesta fuera de las opciones (PREGUNTA-RESPUESTA).
  - `certificado-sin-aviso.json` → certificado sin el aviso obligatorio (CERTIFICADO-AVISO).
- `content/manifestos/` — manifiestos de pack para tests de migración y demo.

Los tests que los usan están en `packages/content-schema/test/`.
