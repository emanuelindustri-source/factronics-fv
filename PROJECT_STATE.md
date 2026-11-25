# PROJECT_STATE — F&V (by Factronics)

**Última actualización:** 2026-11-25 · **Versión:** 0.4.0 · **Fase actual:** F1.3 completada

## Estado resumido

| Área | Estado |
|---|---|
| Preflight | ✅ Completo (pagefile configurado, pendiente de **reinicio del PC**) |
| Seguridad | ✅ Sin secretos en repo, gitleaks limpio (local y CI), keystore + backup offline. ⚠️ Revocar el token comprometido del chat anterior (acción del usuario en GitHub Settings) |
| Repositorio | ✅ Monorepo; repos `factronics-fv` (público) + `factronics-fv-content` (privado) |
| Marca | ✅ F&V, logo SVG, icono adaptativo + monochrome, splash, tokens |
| Android | ✅ **F1.2:** 11 idiomas + latín + pseudo, smoke 13/13. **F1.3:** tema por capas sobre Material You, 9 festividades, opt-out/sobrio, arte vectorial y persistencia; 14/14 tests, evidencia en Redmi real |
| PWA | ✅ **F1.2:** i18next + selector + `Intl`, 21/21 E2E. **F1.3:** variables CSS festivas, arte SVG, Ajustes y persistencia; 51/51 Vitest y 22/22 Playwright |
| Portal | ✅ Publicado en GitHub Pages con tracker desde PROGRESS.json (3 fases completadas) |
| Esquema de contenido | ✅ **F1.1:** 15 entidades, `source_ref` obligatorio (8 campos), JSON Schema + validador, IDs estables, versionado semántico, migraciones declarativas, tipos compartidos, pack demo (25 ítems, 100 % con fuente) — ADR-0006. **Sin cambios en F1.3.** |
| i18n | ✅ **F1.2/F1.3:** catálogo único de **83 claves × 13 locales**, generación Android/PWA, pseudo-local `es-XA`, 0 literales, glosario de 40 términos pendiente de revisión, ADR-0007 |
| Tema y festividades | ✅ **F1.3:** motor inyectable (27 fixtures), Pascua/Carnaval, enésimos domingos, prioridad, contraste AA, Material You, arte original, opt-out y modo sobrio — ADR-0008 |
| CI | ✅ gitleaks + `content` + `i18n` + Android (build + 14 tests) + PWA (build + 51 Vitest + 22 Playwright) + Portal |

## Próximos pasos

1. **F1.4 — Offline, packs y contratos de sincronización** (siguiente fase; prompt en `docs/handoff/FASE_1.4.md`). Modelo recomendado: MiMo-V2.6-Pro, esfuerzo ALTO.
2. Validación cultural de las fechas venezolanas de Día de la Madre/Padre/Niño (F1.3 las deja como convención, no como oficiales).
3. Revisión por hablantes nativos de las 83 cadenas de interfaz y aprobación término por término del glosario (hoy todo “pendiente de revisión”).
4. Usuario pendiente: **reiniciar el PC** para activar el pagefile de 8–16 GB.
5. Usuario pendiente: **revocar el token de GitHub comprometido** y guardar las credenciales del keystore en su gestor de contraseñas.
6. Contenido: solo demo hasta nueva autorización escrita pieza por pieza (ADR-0003). La documentación real (`1880C`) está **local y fuera de git** en `VIDEOJET_DOCS_ENTRADA/01_CIJ/`. Las fotos, los renders 3D y el buscador de números de parte corresponden a F4.x/F6.x/F10.x, no a F1.3.

## Reglas vigentes

Ver `AGENTS.md` y `docs/plan/PLAN_MAESTRO.md`. Resumen: una fase = un entregable probado;
**sin fuente no se publica** (el validador lo hace cumplir por CI); no inventar; sin
secretos en git; certificados = programa interno de Factronics (no oficial de Videojet);
accesibilidad y privacidad desde el inicio.
