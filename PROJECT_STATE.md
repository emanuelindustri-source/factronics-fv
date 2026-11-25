# PROJECT_STATE — F&V (by Factronics)

**Última actualización:** 2026-11-25 · **Versión:** 0.3.0 · **Fase actual:** F1.2 completada

## Estado resumido

| Área | Estado |
|---|---|
| Preflight | ✅ Completo (pagefile configurado, pendiente de **reinicio del PC**) |
| Seguridad | ✅ Sin secretos en repo, gitleaks limpio (local y CI), keystore + backup offline. ⚠️ Revocar el token comprometido del chat anterior (acción del usuario en GitHub Settings) |
| Repositorio | ✅ Monorepo; repos `factronics-fv` (público) + `factronics-fv-content` (privado) |
| Marca | ✅ F&V, logo SVG, icono adaptativo + monochrome, splash, tokens |
| Android | ✅ Walking skeleton + **F1.2:** 11 idiomas + latín + pseudo-local, `locales_config`, selector persistente verificado por UI, formatos por locale, tests unitarios y **smoke 13/13 en Redmi real** |
| PWA | ✅ Offline instalable + **F1.2:** i18next con detección y selector persistente, `Intl`, 21/21 E2E en verde (11 idiomas + latín + pseudo) |
| Portal | ✅ Publicado en GitHub Pages con tracker desde PROGRESS.json |
| Esquema de contenido | ✅ **F1.1:** 15 entidades, `source_ref` obligatorio (8 campos), JSON Schema + validador (`npm run validate:content`), IDs estables, versionado semántico, migraciones declarativas, tipos compartidos, pack demo (25 ítems, 100 % con fuente) — ADR-0006. **Sin cambios en F1.2.** |
| i18n | ✅ **F1.2:** catálogo único de 67 claves × 13 locales (`packages/i18n`), generación Android/PWA, pseudo-local `es-XA`, 0 literales, glosario de 40 términos (todos pendientes de revisión), ADR-0007 |
| CI | ✅ gitleaks + `content` + **`i18n`** + Android (build + tests) + PWA (build + tests + Playwright) + Portal |

## Próximos pasos

1. **F1.3 — Motor de tema y festividades** (siguiente fase; prompt en `docs/handoff/FASE_1.3.md`). Modelo recomendado: MiMo-V2.6-Pro, esfuerzo ALTO.
2. Revisión por hablantes nativos de las 67 cadenas de interfaz y aprobación término por término del glosario (hoy todo “pendiente de revisión”).
3. Usuario pendiente: **reiniciar el PC** para activar el pagefile de 8–16 GB.
4. Usuario pendiente: **revocar el token de GitHub comprometido** y guardar las credenciales del keystore en su gestor de contraseñas.
5. Contenido: solo demo hasta nueva autorización escrita pieza por pieza (ADR-0003). La documentación real (`1880C`) está **local y fuera de git** en `VIDEOJET_DOCS_ENTRADA/01_CIJ/`; en F1.2 solo se usó su inventario para vocabulario genérico del glosario, sin copiar contenido. Las fotos, los renders 3D y el buscador de números de parte corresponden a F4.x/F6.x/F10.x, no a esta fase.

## Reglas vigentes

Ver `AGENTS.md` y `docs/plan/PLAN_MAESTRO.md`. Resumen: una fase = un entregable probado;
**sin fuente no se publica** (el validador lo hace cumplir por CI); no inventar; sin
secretos en git; certificados = programa interno de Factronics (no oficial de Videojet);
accesibilidad y privacidad desde el inicio.
