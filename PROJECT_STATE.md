# PROJECT_STATE — F&V (by Factronics)

**Última actualización:** 2026-11-25 · **Versión:** 0.1.0 · **Fase actual:** F0 completada

## Estado resumido

| Área | Estado |
|---|---|
| Preflight | ✅ Completo (pagefile configurado, pendiente de **reinicio del PC**) |
| Seguridad | ✅ Sin secretos en repo, gitleaks instalado y en CI, keystore generado + backup offline. ⚠️ Revocar el token comprometido del chat anterior (acción del usuario en GitHub Settings) |
| Repositorio | ✅ Monorepo creado; repos `factronics-fv` (público) + `factronics-fv-content` (privado) creados con `gh` |
| Marca | ✅ F&V, logo SVG, icono adaptativo + monochrome, splash, tokens |
| Android | ✅ Walking skeleton (Compose + M3): Inicio, Perfil demo, Ajustes (idioma/tema), Acerca de. Instalada y probado en teléfono real |
| PWA | ✅ Walking skeleton offline (manifest, SW, IndexedDB, instalable). Probada con Playwright |
| Portal | ✅ Placeholder publicado en GitHub Pages con tracker desde PROGRESS.json |
| CI | ✅ gitleaks + Android + PWA + Portal; Pages en verde |

## Decisiones abiertas / próximos pasos

1. **F1.1 — Esquema canónico y procedencia** (siguiente fase, ver `docs/handoff/FASE_1.1.md`).
2. Usuario pendiente: **reiniciar el PC** para activar el pagefile de 8–16 GB.
3. Usuario pendiente: **revocar el token de GitHub comprometido** y guardar las credenciales del keystore en su gestor de contraseñas.
4. Contenido: solo demo hasta nueva autorización escrita pieza por pieza (ADR-0003).

## Reglas vigentes

Ver `AGENTS.md` y `docs/plan/PLAN_MAESTRO.md`. Resumen: una fase = un entregable probado; sin fuentes no se publica; no inventar; sin secretos en git; certificados = programa interno de Factronics (no oficial de Videojet); accesibilidad y privacidad desde el inicio.
