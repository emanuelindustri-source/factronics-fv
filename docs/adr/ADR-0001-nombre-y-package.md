# ADR-0001 — Nombre del producto y package Android

- **Fecha:** 2026-11-25 · **Estado:** Aceptada · **Decisor:** Khristyan Hidalgo (creador)

## Contexto

El PLAN_MAESTRO trabajaba con el nombre provisional “JetPulse (by Factronics)” y package `com.factronics.jetpulse`. En la Fase 0 se consultó al creador por el nombre definitivo (decisión bloqueante: el package no se puede cambiar después del primer release).

## Decisión

El producto se llama **“F&V”** (marca visible en app y portal). El package Android queda **`com.factronics.fv`** (el carácter “&” no es válido en packages de Android; se usa `fv`). El subtítulo institucional es “by Factronics”.

El plan y documentos históricos conservan el nombre “JetPulse” como codinombre de planificación; el producto se publica como **F&V**.

## Consecuencias

- Nombre de repos coherentes: `factronics-fv` / `factronics-fv-content` (ver ADR-0004).
- El significado exacto de las siglas “F&V” no fue especificado por el creador: queda como marca registrada por él y **no se le atribuye ningún significado inventado** en la app ni en el portal.
- Versionado desde `0.1.0` (Fase 0).
