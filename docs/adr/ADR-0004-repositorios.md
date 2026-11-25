# ADR-0004 — Nombres y visibilidad de los repositorios

- **Fecha:** 2026-11-25 · **Estado:** Aceptada · **Decisor:** Khristyan Hidalgo

## Contexto

El plan sugería `factronics-jetpulse` (público) + `factronics-jetpulse-content` (privado). El creador eligió la estructura **público + privado** y, además, renombró el producto a **F&V** (ADR-0001).

## Decisión

- **`factronics-fv`** — PÚBLICO: código, portal y contenido demo autorizado.
- **`factronics-fv-content`** — PRIVADO: documentos reales, extracciones y claves.

Los nombres siguen el nombre definitivo del producto para no generar confusión futura. Si el creador prefiere los nombres del plan original, los repos se renombran con `gh repo rename` (decisión reversible, coste nulo).

## Consecuencias

- Portal público en GitHub Pages desde `factronics-fv`.
- El contenido propietario jamás se mezcla con el repo público (reforzado por `.gitignore` y gitleaks en CI).
