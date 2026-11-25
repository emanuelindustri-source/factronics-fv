# PROJECT_STATE — F&V (by Factronics)

**Última actualización:** 2026-11-25 · **Versión:** 0.5.0 · **Fase actual:** F1.4 completada

## Estado resumido

| Área | Estado |
|---|---|
| Preflight | ✅ Completo (pagefile configurado, pendiente de **reinicio del PC**) |
| Seguridad | ✅ Sin secretos en repo, gitleaks limpio (local y CI), keystore + backup offline. ⚠️ Revocar el token comprometido del chat anterior (acción del usuario en GitHub Settings) |
| Repositorio | ✅ Monorepo; repos `factronics-fv` (público) + `factronics-fv-content` (privado) |
| Marca | ✅ F&V, logo SVG, icono adaptativo + monochrome, splash, tokens |
| Android | ✅ **F1.2:** 11 idiomas + latín + pseudo, smoke 13/13. **F1.3:** tema por capas, 9 festividades, opt-out/sobrio, 14/14 tests. **F1.4:** almacén offline `FilePackStore` (atómico con journal/rollback, índices ID/tipo/tecnología, migraciones), instalación de packs con hash+firma+validación F1.1, backup/export/import, búsqueda offline y estado vacío; 44/44 tests JVM, evidencia en Redmi real |
| PWA | ✅ **F1.2:** i18next + selector + `Intl`, 21/21 E2E. **F1.3:** variables CSS festivas, 51/51 Vitest y 22/22 Playwright. **F1.4:** almacén Dexie v2 (upgrade conserva perfil), contrato de sync en TS, packs/backup/búsqueda offline; 133/133 Vitest y 26/26 Playwright |
| Portal | ✅ Publicado en GitHub Pages con tracker desde PROGRESS.json (4 fases completadas) |
| Esquema de contenido | ✅ **F1.1:** 15 entidades, `source_ref` obligatorio, JSON Schema + validador, IDs estables, migraciones — ADR-0006. **Sin cambios en F1.4** (la capa de sync vive en archivos nuevos, ADR-0009). Corregida una clave duplicada en el ítem demo `crt:demo-0001` |
| i18n | ✅ **F1.2–F1.4:** catálogo único de **148 claves × 13 locales** (incluye los códigos de error del contrato), pseudo-local `es-XA`, 0 literales, ADR-0007 |
| Tema y festividades | ✅ **F1.3:** motor inyectable (27 fixtures), contraste AA, Material You, opt-out/modo sobrio — ADR-0008 |
| Offline y sincronización | ✅ **F1.4:** contrato v1 (manifiesto/firma/bundle `.fvpack`/delta/tombstones/backup `fv-backup/1`), paridad JS/TS/Kotlin con fixtures y vectores compartidos, servidor simulado con convergencia, instalación atómica con rollback, integridad SHA-256 + firma ECDSA P-256, backup con privacidad por diseño — ADR-0009. Supabase/sync real: F8 |
| CI | ✅ gitleaks + `content` (validate:content + 123 tests de paquetes) + i18n + Android (build + 44 tests) + PWA (build + 133 Vitest + 26 Playwright) + Portal |

## Próximos pasos

1. **F2.1 — Shell nativo Android** (siguiente fase; prompt en `docs/handoff/FASE_1.5.md`). Modelo recomendado: MiMo-V2.6-Pro, esfuerzo ALTO.
2. Usuario pendiente: **reiniciar el PC** para activar el pagefile de 8–16 GB.
3. Usuario pendiente: **revocar el token de GitHub comprometido** y guardar las credenciales del keystore en su gestor de contraseñas.
4. Validación cultural de las fechas venezolanas de Día de la Madre/Padre/Niño y revisión nativa de las 148 cadenas de interfaz.
5. Room/FTS en Android cuando la búsqueda lo exija (F4.4); clave de firma de producción de packs (F4.3/F11.1, fuera del repo).
6. Contenido: solo demo hasta nueva autorización escrita pieza por pieza (ADR-0003). La documentación real (`1880C`) está **local y fuera de git** en `VIDEOJET_DOCS_ENTRADA/01_CIJ/`.

## Reglas vigentes

Ver `AGENTS.md` y `docs/plan/PLAN_MAESTRO.md`. Resumen: una fase = un entregable probado;
**sin fuente no se publica** (el validador lo hace cumplir por CI); no inventar; sin
secretos en git; certificados = programa interno de Factronics (no oficial de Videojet);
accesibilidad y privacidad desde el inicio.
