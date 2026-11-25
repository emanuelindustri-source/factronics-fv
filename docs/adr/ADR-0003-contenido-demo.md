# ADR-0003 — Contenido demo únicamente (propiedad intelectual)

- **Fecha:** 2026-11-25 · **Estado:** Aceptada · **Decisor:** Khristyan Hidalgo

## Contexto

Los manuales, diagramas, boletines y listas de partes de Videojet/Factronics son material propietario. El plan exige autorización escrita antes de publicar cualquier pieza real.

## Decisión

El creador confirmó: **solo contenido demo autorizado** se publica. Ningún material real de Videojet/Factronics se sube al repo público ni al portal en esta fase ni en las siguientes sin autorización escrita, pieza por pieza.

- `VIDEOJET_DOCS_ENTRADA/` queda **local y en .gitignore**.
- El repo privado `factronics-fv-content` será el único destino del contenido real, y solo con autorización documentada.
- El contenido demo (textos de ejemplo, datos de práctica) debe estar claramente etiquetado como demo y no debe contener números de parte ni códigos reales falsos que puedan confundirse con datos oficiales.

## Consecuencias

- La app y el portal de la Fase 0 muestran únicamente textos demo/autorizados con fuente.
- Historia institucional: solo resúmenes con cita de factronics.com.ve; sin textos largos copiados.
