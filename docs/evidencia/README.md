# Evidencia — Fase 0 (2026-11-25)

Todas las capturas fueron tomadas automáticamente por el agente en las pruebas reales.

## Android (teléfono real Xiaomi 22101316G, Android 14 / API 34)

| Archivo | Qué demuestra |
|---|---|
| `01-android-home.png` / `05-android-home-2.png` | Pantalla Inicio ("Hola, F&V") en modo oscuro Material You |
| `02-android-perfil.png` / `07-android-modo-claro-perfil.png` | Perfil demo (avatar iniciales, nivel/medallas/racha) |
| `03-android-ajustes.png` | Ajustes: idioma es/en, tema, color dinámico, festividades (deshabilitada, F1.3) |
| `04-android-acerca-de.png` | Acerca de: versión, equipo de validación, fuentes, disclaimer |
| `06-android-modo-claro-home.png` | Tema claro (contraste AA) |
| `08-android-landscape.png` | Rotación horizontal sin crash |
| `09-android-fuente-200.png` | Escala de fuente 200 % sin cortes de texto |
| `10-android-talkback-home.png` / `11-android-talkback-perfil.png` | TalkBack activo (foco de accesibilidad), luego desactivado |

- `adb install -r` → **Success**; `am start` → `com.factronics.fv/.MainActivity` en primer plano.
- `adb logcat` filtrado por FATAL/AndroidRuntime/Exception: **0 errores críticos**.

## PWA (Playwright + Chromium)

| Archivo | Qué demuestra |
|---|---|
| `12-pwa-online.png` | PWA cargada (manifest + service worker registrados) |
| `13-pwa-offline.png` | **Recarga sin conexión**: la app renderiza completa offline (IndexedDB + SW) |

- `playwright test`: **4/4 en verde** (carga, persistencia IndexedDB tras recarga, offline con SW, cambio de idioma).

## Portal (Astro → GitHub Pages)

| Archivo | Qué demuestra |
|---|---|
| `14-portal.png` | Portal completo: hero, qué es F&V, descargas, tracker desde PROGRESS.json, historia con fuentes, equipo, privacidad |

- Publicado en: https://emanuelindustri-source.github.io/factronics-fv/ (verificado en vivo)

## CI / Seguridad

- GitHub Actions run 45593996788: **Android ✅ PWA ✅ Portal ✅ Gitleaks ✅** (CI en verde).
- Gitleaks local 8.30.1: "no leaks found".
- Firma probada con `fv-release.keystore` (alias `fv`): `apksigner verify` → certificado `CN=F&V by Factronics`.
- SHA-256 del APK publicado en la release `fase-0`.

---

# Evidencia — Fase 1.1 · Esquema canónico y procedencia (2026-11-25)

Ejecución real en Windows local (Node v24.22.3). No aplica teléfono en esta fase.

| Archivo | Qué demuestra |
|---|---|
| `15-validate-content.txt` | `npm run validate:content` sobre el pack demo: **25 ítems · 100 % con source_ref · 0 sin fuente · 0 errores** |
| `16-tests-validador.txt` | `npm test`: **36/36 en verde** (30 del validador + 6 del pack demo), incluidos los casos negativos |
| `17-rechazo-sin-fuente.txt` | Rechazo explícito por CLI de un ítem sin fuente: regla `FALTA-PROCEDENCIA — SIN FUENTE NO SE PUBLICA` (+ backstop `JSON-SCHEMA`) |
| `18-workspaces-monorepo.txt` | `npm ls --workspaces`: los 3 paquetes existen como workspaces (`content-schema`, `content-packs-demo`, `shared-fixtures`); `npm ci` de `apps/web` y `apps/portal` sigue independiente |

## Gate de F1.1 verificado

- `npm run validate:content` en verde en local y en CI (job `content` nuevo en `.github/workflows/ci.yml`).
- 100 % de los ítems demo con `source_ref` completo y revisor (Khristyan Hidalgo) — probado por test.
- 0 ítems sin fuente: el validador rechaza explícitamente datos sin `source_ref` — test `un ítem SIN source_ref se rechaza explícitamente` + `17-rechazo-sin-fuente.txt`.
- ADR-0006 escrito (`docs/adr/ADR-0006-esquema-canonico-y-procedencia.md`).
- Gitleaks limpio y CI en verde (ver `PROJECT_STATE.md` para el enlace al run).

## Nota de propiedad intelectual

Los documentos reales (`1880C`) se copiaron solo a `VIDEOJET_DOCS_ENTRADA/01_CIJ/`
(local, **fuera de git**) con su inventario local. Nada de su contenido ni códigos está en
el repo público: los ítems demo usan exclusivamente códigos `DEMO-` (ADR-0003).

---

# Evidencia — Fase 1.2 · Internacionalización real (2026-11-25)

Ejecución real en Windows local y en teléfono **Xiaomi Redmi 22101316G (Android 14 / API 34)**.
**Estado: F1.2 cerrada; los 13 locales renderizan y el selector se verificó por UI real.**

## PWA — capturas reales (Playwright + Chromium)

| Archivo | Qué demuestra |
|---|---|
| `19-pwa-es-VE.png` | Inicio en español de Venezuela (idioma principal) |
| `20-pwa-ja.png` | Inicio en japonés (texto, navegación y chips renderizados) |
| `21-pwa-hi.png` | Inicio en hindi (devanagari renderizado, sin tofu) |
| `22-pwa-ajustes-es-VE.png` | Selector con los 11 idiomas, ejemplo de número/porcentaje/fecha por locale |
| `26-pwa-pseudo.png` | Pseudo-local `es-XA`: todo el texto va marcado `⟦…⟧` y alargado (revela literales y desbordes) |

- `npx playwright test` → **21/21 en verde**: 11 idiomas reales + latín, detección de
  navegador (es-MX→es-VE, en-GB→en), persistencia tras recarga, formatos, offline y
  easter egg de 7 pulsaciones. Log: `33-playwright-i18n.txt`.
- `npm run test` (Vitest) → **17/17 en verde** (catálogo, detección y formatos).
  Log: `32-vitest-i18n.txt`.

## Android — verificado en teléfono real

| Archivo | Qué demuestra |
|---|---|
| `34-android-unit-tests.txt` | `:app:testDebugUnitTest` en verde: formatos es-VE/en-US/de-DE/ja-JP y paridad de las 13 carpetas de recursos |
| `23-android-es-VE.png` | Inicio en español de Venezuela en el Redmi |
| `24-android-ja.png` | Inicio en japonés en el Redmi |
| `25-android-hi.png` | Inicio en hindi (devanagari) en el Redmi |
| `27-android-pseudo.png` | Pseudo-local `es-XA` en Android: todo marcado `⟦…⟧`, desbordes visibles |
| `27b-android-latina.png` | Latín (`la`) renderizado desde el selector (easter egg) |
| `23b-android-ajustes-es-VE.png` | Ajustes: los 11 idiomas + latín/pseudo desbloqueados |
| `28-android-smoke-i18n.json` | Informe del smoke: **13/13 locales OK**, 17 textos por locale |
| `28b-android-selector.txt` | Selector por UI real: es-VE → English → Español (Venezuela), persistencia tras cerrar y abrir |

- `node tools\smoke-i18n-android.mjs` → **13/13 en verde** (es-VE, en, pt-BR, pt-PT, it, de,
  fr, zh-Hans, ja, ko, hi, la, es-XA). Comprueba saludo del locale, ausencia de claves
  crudas/marcadores sin interpolar y, en pseudo, que todo el texto esté pseudo-localizado.
- `node tools\ui-locale-check.mjs` → **selector real verificado** sin usar el hook de debug
  (taps en Ajustes y en las filas de idioma). El idioma persiste tras `force-stop`.
- Hallazgo corregido: el pseudo-local usa `values-qps` (no `values-es-rXA`) para no
  secuestrar los teléfonos en español. Verificado tras `pm clear`: arranca en es-VE.

## Catálogo, paridad y CI

| Archivo | Qué demuestra |
|---|---|
| `29-i18n-check.txt` | `npm run i18n:check`: 13 idiomas, 67 claves, salidas Android/PWA al día, pseudo derivado, **0 textos hardcodeados** |
| `30-validate-content-f12.txt` | El esquema de contenido de F1.1 sigue intacto: **25/25 ítems con fuente, 0 errores** |
| `31-content-tests-f12.txt` | Tests del contenido siguen en verde (no se tocó el esquema) |
| `35-gitleaks.txt` | Gitleaks 8.30.1: **no leaks found** |

Tests de i18n: 10/10 (claves completas, sin sobrantes, paridad Android↔PWA, pseudo
determinista, marcadores, recursos existentes y escáner de literales).

- **CI run 45612145712: 6/6 jobs en verde** (Gitleaks, Contenido, i18n, Android build +
  tests, PWA build + Vitest + Playwright, Portal); **Pages en verde** (run 45612145635).
- Gitleaks en CI: “no leaks found”.

## Glosario y decisiones

- `docs/plan/GLOSARIO.md`: **40 términos** del dominio en 11 idiomas, **todos “pendiente de
  revisión”** (ninguno aprobado aún).
- `docs/adr/ADR-0007-internacionalizacion.md`: catálogo único, generación, detección,
  easter egg, pseudo `qps` y separación UI/contenido.
- `VIDEOJET_DOCS_ENTRADA/` se revisó **solo a nivel de inventario** para el vocabulario
  genérico; no se copió contenido técnico ni códigos al repo.

## Pendiente posterior a F1.2 (no bloquea la fase)

1. Revisión por hablantes nativos de las 83 cadenas; la app lo declara en Acerca de.
2. Aprobación término por término del glosario (hoy todo “pendiente de revisión”).
3. Futuras fases: ingesta real (F4.x), 3D/simulador (F6.x), números de parte (F10.2).

---

# Evidencia — Fase 1.3 · Motor de tema y festividades (2026-11-25)

Verificado en Windows, PWA y **Redmi 22101316G (Android 14 / API 34)**.

## Android — teléfono real

| Archivo | Qué demuestra |
|---|---|
| `36-android-tema-claro.png` | Tema base claro con tokens neutros de marca (sin lavandas de M3) |
| `37-android-tema-oscuro.png` | Tema base oscuro |
| `38-android-navidad.png` | Navidad forzada: árbol, etiqueta y acentos rojos |
| `39-android-carnaval.png` | Carnaval forzado: confeti y acentos morados |
| `40-android-halloween.png` | Halloween forzado: calabaza y acentos naranjas |
| `41-android-modo-sobrio.png` | Modo sobrio: Navidad suprimida, tema base, sin arte |
| `50-android-material-you.png` | Material You + Navidad: fondo dinámico y acentos festivos conviven |
| `48-android-festividades.txt` | Comprobación automática de los 6 estados |
| `49-android-festividad-ui.txt` | Opt-out y modo sobrio por UI real + persistencia tras reiniciar |

- `:app:testDebugUnitTest` → **14/14 en verde**: motor de festividades (4), paletas/contraste (3),
  formatos (5) y recursos (2).
- Material You verificado en Android 12+; el fallback de marca aplica en versiones anteriores.

## PWA — Playwright

| Archivo | Qué demuestra |
|---|---|
| `42-pwa-tema-claro.png` | Tema base claro |
| `43-pwa-tema-oscuro.png` | Tema base oscuro |
| `44-pwa-navidad.png` | Navidad: arte, etiqueta y acentos |
| `45-pwa-carnaval.png` | Carnaval |
| `46-pwa-halloween.png` | Halloween |
| `47-pwa-modo-sobrio.png` | Modo sobrio: sin festividad ni animaciones |

- Vitest → **51/51**: 30 del motor/fixtures, 4 de contraste/paletas, 17 de i18n/formatos.
- Playwright → **22/22**: incluye forzar festividad, persistencia tras recarga, modo sobrio,
  desactivar festividades y tema claro/oscuro.

## Logs y CI

| Archivo | Qué demuestra |
|---|---|
| `51-i18n-check-f13.txt` | 13 idiomas, **83 claves**, salidas al día, pseudo y **0 literales** |
| `52-android-tests-f13.txt` | Android: build + **14/14** tests JVM |
| `53-vitest-f13.txt` | PWA: **51/51** tests (motor, contraste, i18n, formatos) |
| `54-playwright-f13.txt` | PWA: **22/22** E2E (12 locales, festividades, sobrio, offline) |
| `55-validate-content-f13.txt` | Pack demo intacto: 25/25 con fuente, 0 errores |
| `56-content-tests-f13.txt` | Tests del contenido en verde |
| `57-gitleaks-f13.txt` | Gitleaks: **no leaks found** |

## Gate F1.3

- **27 fixtures compartidos** entre Android y PWA: fechas fijas/móviles, 29 de febrero,
  cambio de año, zonas horarias, DST, conflicto Carnaval/San Valentín, override y opt-out.
- **Contraste AA**: todas las parejas de las 9 festividades y del tema base, claro/oscuro.
- **Material You** no se rompe: la festividad solo cambia acentos/contenedores.
- **Opt-out/modo sobrio** verificado por UI en teléfono y por E2E en PWA, con persistencia.
- **Contenido de F1.1 intacto**; sin migración de esquema.
- Gitleaks local limpio.

## Nota de fechas

Las fechas móviles (Pascua/Carnaval, enésimos domingos) son algorítmicas y probadas. Las
fechas culturales venezolanas de familia (Madre/Padre/Niño) quedan **pendientes de
validación cultural** por Factronics; no se presentan como oficiales ni como dato técnico.
No se usó material de `VIDEOJET_DOCS_ENTRADA/`.

---

# Evidencia — Fase 1.4 · Offline, packs y contratos de sincronización (2026-11-25)

Verificada en Windows, PWA (Playwright + Chromium) y **teléfono real Xiaomi Redmi
22101316G (Android 14 / API 34)**. Nota de numeración: el handoff decía "desde 51",
pero 51–57 ya pertenecen al cierre de F1.3; esta fase usa **58–73** (ADR-0009 §final).

## Android — teléfono real

| Archivo | Qué demuestra |
|---|---|
| `68-android-estado-vacio.png` | Estado vacío claro sin pack: "Sin contenido instalado" (sin contenido inventado) |
| `66-android-pack-instalado.png` | Ajustes con el pack demo instalado por UI: Versión 1.0.0, Ítems 25, Tamaño 27 KB, última actualización y acciones (exportar/importar/limpiar) |
| `67-android-busqueda-offline.png` | **Modo avión activado**: búsqueda "DEMO" con 25 resultados y "Ver fuente" con la procedencia del contenido |
| `73-android-ajustes-tras-backup.png` | Ajustes tras exportar/importar la copia de seguridad |
| `72-android-offline-log.txt` | Log automatizado: `adb install -r` Success, pm clear, estado vacío verificado, pack instalado (v1.0.0 · 25 ítems), **modo avión ON → búsqueda offline con 25 resultados y fuente `DEMO-DOC-0001` visible**, export (`fv-backup-20261125-231439.json`, 36 818 bytes) e import ("Copia restaurada en este dispositivo"), **logcat: 0 errores críticos** |

Herramienta: `node tools/f14-content-evidence.mjs` (automatizada, repetible).

## PWA — Playwright + Chromium

| Archivo | Qué demuestra |
|---|---|
| `71-pwa-estado-vacio.png` | Estado vacío claro sin pack ("Sin contenido instalado") |
| `69-pwa-pack-instalado.png` | Ajustes con el pack demo: versión, tamaño, ítems, última actualización y acciones |
| `70-pwa-busqueda-offline.png` | Búsqueda "DEMO" con el service worker en modo avión: resultados y procedencia |

- `e2e/content.spec.ts` → **4/4**: estado vacío, instalación + **búsqueda offline
  (`setOffline(true)` + reload)**, "Ver fuente", **backup round-trip** (exportar →
  limpiar → restaurar → mismos 25 ítems) y **rechazo de backup corrupto** (un bit
  alterado ⇒ `errors.backupCorrupt`, contenido intacto).
- Suite completa `npx playwright test` → **26/26** (22 de F1.2/F1.3 sin regresiones
  + 4 nuevos). Log: `60-playwright-f14.txt`.

## Contratos de sincronización y paridad de plataforma

| Archivo | Qué demuestra |
|---|---|
| `61-sync-contracts-tests-f14.txt` | `@factronics-fv/sync-contracts`: **81/81** (bundles con 25 casos de mutación, deltas/tombstones/idempotencia/orden, backup, búsqueda, migraciones locales, vectores cripto y servidor simulado con convergencia offline 24 h) |
| `59-vitest-f14.txt` | PWA: **133/133** (76 tests del contrato replican 1:1 la referencia JS + 7 del almacén Dexie + i18n/formatos/tema) |
| `58-android-tests-f14.txt` | Android: **44/44** tests JVM (fixtures del contrato, almacén atómico con interrupciones paso a paso, disco lleno, migraciones con rollback, backup round-trip y bundle demo real) |
| `63-validate-content-f14.txt` | `npm run validate:content`: 25/25 ítems con fuente, 0 errores (esquema F1.1 intacto) |
| `64-content-tests-f14.txt` | Pack demo: **12/12** (incluye deriva del bundle `.fvpack`, firma DEMO verificada y truststore sin clave privada) |
| `62-i18n-check-f14.txt` | `npm run i18n:check`: 13 idiomas, **148 claves**, salidas Android/PWA al día, **0 textos hardcodeados** |
| `65-gitleaks-f14.txt` | Gitleaks: **no leaks found** (la clave DEMO de firma vive solo en `_private/`, fuera de git) |

## Gate F1.4 verificado

- **Migraciones locales**: base vacía → v1, v1 → v2 sintética y migración fallida con
  rollback (el almacén queda intacto) — en Android, PWA y la referencia JS.
- **Instalación atómica**: pack válido, hash inválido, JSON inválido/corrupto, versión
  futura, downgrade, firma inválida, clave desconocida, sin firma, tamaño excedido e
  **interrupción simulada en cada uno de los 7 pasos de la transacción** (rollback al
  estado anterior; jamás un pack a medias). Disco lleno ⇒ `DISCO-LLENO`.
- **Backup/export/import**: round-trip completo en Android y PWA, restauración en
  almacenamiento limpio, rechazo de corruptos y **rechazo de datos personales**
  (el esquema prohíbe `settings.name`).
- **Contrato de sync**: fixtures de manifiesto/delta/tombstones, idempotencia
  (aplicar dos veces = mismo estado), orden estricto (`ORDEN-INVALIDO` sin saltos) y
  versión mínima de cliente, contra servidor simulado (duplicados, fuera de orden,
  delta faltante, reconexión).
- **Offline**: abrir, buscar y navegar sin red con packs instalados (teléfono en modo
  avión + PWA con `setOffline`); estado vacío claro sin pack.
- **Seguridad**: hash SHA-256 + firma ECDSA P-256 verificados en el cliente en las tres
  plataformas (vectores de compatibilidad cruzada); sin secretos en el repo.
