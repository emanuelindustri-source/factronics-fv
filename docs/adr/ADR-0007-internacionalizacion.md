# ADR-0007 — Internacionalización real: catálogo único, generación y locales especiales

- **Fecha:** 2026-11-25 · **Estado:** Aceptada · **Decisor:** Khristyan Hidalgo
- **Fase:** F1.2 — Internacionalización real
- **Relacionados:** ADR-0003 (contenido demo), ADR-0006 (esquema canónico), ADR-0005 (seguridad)

## Contexto

El walking skeleton (F0) traía i18n mínimo es/en duplicado en Android
(`res/values-en/strings.xml`) y en la PWA (`src/i18n.ts`). F1.2 exige:

- 11 idiomas reales (es-VE principal, en, pt-BR, pt-PT, it, de, fr, zh-Hans, ja, ko, hi),
  con **latín solo como easter egg** de interfaz/logros y **pseudo-local es-XA** para QA.
- Selector in-app persistente en Android y PWA, formatos de fecha/número/porcentaje por
  locale y `locales_config` de Android.
- Cero textos hardcodeados y paridad de claves Android ↔ PWA.
- Separación estricta entre **textos de UI** (traducibles) y **contenido técnico**
  (packs de F1.1, que no se traducen en esta fase).

Duplicar 67 cadenas × 13 idiomas en dos formatos garantiza deriva: una clave nueva en
Android y no en la PWA, o al revés. El riesgo es mayor porque las traducciones están
pendientes de revisión nativa y se corregirán con frecuencia.

## Decisión

1. **Fuente única de verdad:** `packages/i18n/src/locales/<tag>.json` (13 archivos,
   67 claves planas con puntos). `es-VE` es la base y define el conjunto de claves.
   Los textos son **solo de interfaz**; el contenido técnico sigue viviendo en los packs
   de F1.1 y no se toca.

2. **Generación de salidas, no edición manual:**
   `packages/i18n/src/generate.mjs` escribe:
   - `apps/android/app/src/main/res/values*/strings.xml` (13 carpetas),
   - `apps/android/app/src/main/res/xml/locales_config.xml` (solo los 11 idiomas reales),
   - `apps/web/src/locales/*.json` e `index.ts` (recursos de i18next).

   `npm run i18n:check` regenera en memoria y falla si hay *drift*. La CI lo ejecuta en
   cada push/PR, igual que los tests de paridad y el detector de literales. Un generador
   que convierte `home.greeting` → `home_greeting` y `{days}`/`{version}` → `%1$s`/`%2$s`
   evita divergencias de nombres y marcadores.

3. **Idioma principal y detección:**
   - `es-VE` es el idioma base, el *fallback* y el primero del selector.
   - Android guarda la elección en `SharedPreferences` y la aplica en
     `attachBaseContext` + `recreate()` (sin reiniciar el sistema). En Android 13+ se
     integra con el selector por aplicación del sistema (`LocaleManager` /
     `locales_config`): si el sistema fija un idioma real, la app lo adopta; los idiomas
     especiales se aplican solo dentro de la app.
   - PWA: prioridad **elección guardada → idioma del navegador → es-VE**; la elección se
     persiste en `localStorage` (lectura síncrona, sin parpadeo) y en IndexedDB.
     `zh-Hant` se aproxima a `zh-Hans` (único chino del alcance); cualquier idioma no
     soportado cae a `es-VE`.

4. **Locales especiales detrás de un easter egg:** 7 pulsaciones sobre la versión
   (Acerca de) desbloquean **latín (`la`)** y **pseudo-local (`es-XA`)** en el selector.
   El latín es solo interfaz/logros y nunca contenido técnico. El pseudo-local se
   **genera automáticamente desde es-VE**: acentos, marcadores `⟦ ⟧` y ~35 % de relleno
   para provocar desbordes. No se mantiene a mano.

5. **El pseudo-local de Android usa la carpeta `values-qps`, no `values-es-rXA`.**
   Hallazgo de la prueba en dispositivo: Android prioriza la coincidencia de **idioma**
   sobre el idioma base, así que una carpeta `es-rXA` secuestraba **todos** los teléfonos
   en español (la app abría en pseudo). Se usa el código privado `qps` para el recurso y
   la etiqueta visible sigue siendo `es-XA`; el mapeo vive en `SupportedLocales`
   (`resourceTag`). Es la opción más segura y no afecta a ningún locale real.

6. **Formatos por locale con la plataforma:** `java.text.NumberFormat`/`DateFormat`
   (Android) e `Intl.NumberFormat`/`Intl.DateTimeFormat` (PWA), con fecha fija de ejemplo
   y `TimeZone UTC`. Ajustes muestra número, porcentaje y fecha calculados en vivo; no se
   inventa ningún dato técnico. Se prueban es-VE, en-US, de-DE y ja-JP en ambas
   plataformas.

7. **Cero literales en pantallas, verificado por máquina:**
   - `scan-hardcoded.mjs` recorre las pantallas Compose y los TSX: detecta `Text("...")`,
     atributos visibles, textos JSX, claves `t()` inexistentes y `R.string.*` inexistentes.
   - El pseudo-local se comprueba en runtime: Playwright recorre las 4 pestañas en es-XA
     y falla si algún texto visible no está pseudo-localizado (salvo marcas, nombres
     propios, endónimos y valores formateados).
   - Las excepciones no traducibles (equipo, dominios, nombres de idiomas) viven en
     módulos/recursos marcados `translatable="false"` y documentados aquí.

8. **Trazabilidad de las traducciones:** las traducciones de interfaz son propuestas
   generadas por IA **pendientes de revisión por hablantes nativos**. La app lo dice en
   Acerca de (`about.translationsPending`). El glosario
   (`docs/plan/GLOSARIO.md`) tiene 40 términos y **todos** están “pendiente de revisión”;
   ninguno se usa como contenido técnico publicado.

9. **Hook de pruebas solo-debug:** un `BroadcastReceiver` en `src/debug` permite fijar el
   idioma por ADB (`DEBUG_SET_LANG`) para el smoke test de 13 locales. No existe en
   release; usa escritura síncrona para que el reinicio forzado no pierda la preferencia.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| **Mantener strings.xml y i18n.ts a mano** | Deriva garantizada entre plataformas y 13 idiomas; los tests de paridad detectarían el problema, pero no lo prevendrían. |
| **Un paquete npm solo para la PWA y XML generado a mano en Android** | Dos fuentes, dos revisiones, dos oportunidades de olvidar una clave. |
| **ICU MessageFormat desde F1.2** | Más potente para plurales/género, pero añade dependencia y complejidad cuando aún no hay contenido técnico ni plurales reales. Se puede adoptar en F1.4+ con migración declarada. |
| **Traducir también el contenido de los packs en esta fase** | Viola el alcance y la trazabilidad: el contenido real exige `source_ref`, revisión y autorización (ADR-0003/0006). La i18n de contenido es F1.4+. |
| **Pseudo-local en `values-es-rXA`** | Probado y rechazado: Android lo elige para cualquier dispositivo en español y la app abre en pseudo. |
| **Pseudo-local en `values-en-rXA`** | Mismo problema con dispositivos en inglés; además es el pseudo-locale de desarrollo de Android, no una variante de la app. |
| **Usar solo el selector por aplicación de Android 13+** | Deja fuera Android 8–12 (minSdk 26) y no permite latín/pseudo (no están en `locales_config`). Se usa integración cuando existe, con respaldo propio. |
| **Detección de navegador como prioridad absoluta** | Un teléfono en inglés abriría en inglés aunque el equipo sea venezolano. Se prioriza la elección guardada, luego el navegador y por último es-VE (base/fallback). |
| **Latín generado por máquina con gramática inventada** | Es un easter egg, no contenido; se escribió latín plausible y se marca como no revisado. Nunca se usa en contenido técnico. |

## Consecuencias

- **Ventaja:** una clave nueva se añade una vez; CI bloquea claves faltantes/sobrantes,
  marcadores inconsistentes, literales nuevos y salidas desactualizadas. La paridad
  Android ↔ PWA es estructural, no una convención.
- **Costo:** añadir un idioma exige traducir 67 claves y regenerar; las traducciones
  actuales necesitan revisión nativa antes de considerarse definitivas.
- **Accesibilidad:** las filas de idioma son `selectable` con rol de radio, altura mínima
  48 dp y texto escalable; el pseudo-local ayuda a detectar desbordes con fuentes al
  200 %. No hay idiomas RTL en el alcance (se evaluará si se añade árabe/hebreo).
- **Contenido:** los packs de F1.1 no se modificaron; no hubo migración de esquema. La
  separación UI/contenido queda demostrada por los tests y por el hecho de que el smoke
  de idiomas no toca ningún pack.
- **Riesgos abiertos:** revisión nativa pendiente; latín no académico; `zh-Hant` se
  aproxima a `zh-Hans`; fuentes de escrituras no latinas dependen del dispositivo.
- **Evidencia:** capturas PWA en es-VE/ja/hi y pseudo, smoke Android (13 locales) con
  informe JSON, tests de paridad/formatos y `npm run i18n:check` en CI.

## Nota sobre `VIDEOJET_DOCS_ENTRADA/`

La carpeta local (gitignored) se revisó **solo a nivel de inventario** para confirmar el
vocabulario genérico del glosario (cabezal, cartucho, make-up, boletines, IPB, variantes
de idioma). No se copió ni se tradujo contenido técnico real, ni códigos, ni números de
parte. Cualquier uso futuro exige autorización escrita y `source_ref` completo (ADR-0003
y ADR-0006).
