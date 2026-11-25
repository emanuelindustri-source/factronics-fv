# PROJECT_STATE — F&V (by Factronics)

**Última actualización:** 2026-11-25 · **Versión:** 0.2.0 · **Fase actual:** F1.1 completada

## Estado resumido

| Área | Estado |
|---|---|
| Preflight | ✅ Completo (pagefile configurado, pendiente de **reinicio del PC**) |
| Seguridad | ✅ Sin secretos en repo, gitleaks instalado y en CI, keystore generado + backup offline. ⚠️ Revocar el token comprometido del chat anterior (acción del usuario en GitHub Settings) |
| Repositorio | ✅ Monorepo; repos `factronics-fv` (público) + `factronics-fv-content` (privado) |
| Marca | ✅ F&V, logo SVG, icono adaptativo + monochrome, splash, tokens |
| Android | ✅ Walking skeleton (Compose + M3) instalada y probada en teléfono real |
| PWA | ✅ Walking skeleton offline (manifest, SW, IndexedDB, instalable), probada con Playwright |
| Portal | ✅ Publicado en GitHub Pages con tracker desde PROGRESS.json |
| Esquema de contenido | ✅ **F1.1:** 15 entidades, `source_ref` obligatorio (8 campos), JSON Schema + validador (`npm run validate:content`), IDs estables, versionado semántico, migraciones declarativas, tipos compartidos, pack demo (25 ítems, 100 % con fuente) — ADR-0006 |
| CI | ✅ gitleaks + **job `content` (validate:content + tests)** + Android + PWA + Portal; Pages en verde |

## Decisiones abiertas / próximos pasos

1. **F1.2 — Internacionalización real** (siguiente fase, ver `docs/handoff/FASE_1.2.md`).
2. Usuario pendiente: **reiniciar el PC** para activar el pagefile de 8–16 GB.
3. Usuario pendiente: **revocar el token de GitHub comprometido** y guardar las credenciales del keystore en su gestor de contraseñas.
4. Contenido: solo demo hasta nueva autorización escrita pieza por pieza (ADR-0003). La documentación real (`1880C`) está **local y fuera de git** en `VIDEOJET_DOCS_ENTRADA/01_CIJ/` (inventario local incluido) como insumo futuro de la ingesta (F4.x).

## Reglas vigentes

Ver `AGENTS.md` y `docs/plan/PLAN_MAESTRO.md`. Resumen: una fase = un entregable probado; **sin fuente no se publica** (el validador lo hace cumplir por CI); no inventar; sin secretos en git; certificados = programa interno de Factronics (no oficial de Videojet); accesibilidad y privacidad desde el inicio.
