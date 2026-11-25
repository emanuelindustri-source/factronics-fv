# F&V (by Factronics)

Aplicación de estudio, diagnóstico y herramientas de campo para técnicos de **Factronics, C.A.** y tecnologías **Videojet** (CIJ, TTO, Láser).

- **Android nativo** (Kotlin + Jetpack Compose + Material 3) — package `com.factronics.fv`
- **PWA offline** (React + TypeScript + Vite + Dexie)
- **Portal público** (Astro + GitHub Pages)
- **Backend** (Supabase, en fases posteriores)

> Estado actual: **F1.2 (internacionalización real) completada**: 11 idiomas + latín y
> pseudo-local, verificada en Redmi real y PWA. F1.1 completada. Consulta el tracker en el
> portal o en [`PROGRESS.json`](PROGRESS.json).

## Repositorios

| Repo | Contenido |
|---|---|
| `factronics-fv` (este, público) | Código, portal y contenido demo autorizado |
| `factronics-fv-content` (privado) | Documentos reales, extracciones y claves (nunca en el público) |

## Estructura

```text
apps/android      Android nativo (Kotlin/Compose)
apps/web          PWA offline (React/TS/Vite)
apps/portal       Portal público (Astro → GitHub Pages)
packages/         Esquema de contenido, packs demo, fixtures e i18n (catálogo de idiomas)
tools/            Ingesta, Blender headless, informes
supabase/         Migraciones, RLS, Edge Functions (fase F8+)
docs/             ADRs, plan, legal, handoff, evidencia
releases/         Manifiestos (los APK/AAB se publican por GitHub Releases)
VIDEOJET_DOCS_ENTRADA/   LOCAL, fuera de git (documentos propietarios)
_private/               LOCAL, fuera de git (keystore, secretos)
```

## Reglas rápidas

1. Nada de contenido propietario de Videojet/Factronics en este repo.
2. Todo dato técnico necesita fuente y revisor. No inventar.
3. Ningún secreto en el repo.
4. Los certificados son del programa **interno** de Factronics, no de Videojet.

Instrucciones completas para agentes: [`AGENTS.md`](AGENTS.md) · Plan: [`docs/plan/PLAN_MAESTRO.md`](docs/plan/PLAN_MAESTRO.md)
