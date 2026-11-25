# ADR-0008 — Motor de tema y festividades

- **Fecha:** 2026-11-25 · **Estado:** Aceptada · **Decisor:** Khristyan Hidalgo
- **Fase:** F1.3 — Motor de tema y festividades
- **Relacionados:** ADR-0003 (contenido demo), ADR-0007 (i18n y catálogo único)

## Contexto

F1.3 debe añadir una capa de tema y festividades que:

- No rompa Material You en Android 12+ ni el tema de marca en versiones anteriores.
- Sea **verificable con reloj inyectado**: fechas fijas, móviles, cambio de año,
  29 de febrero, zonas horarias y conflictos entre festividades.
- Garantice **contraste AA** en todos los temas y festividades, claro y oscuro.
- Permita **desactivar** festividades, **forzar** una y usar **modo sobrio**, con
  persistencia y sin reinicio.
- No invente contenido ni fechas: las fechas culturales se declaran; las móviles se
  calculan con algoritmos documentados.
- Respete accesibilidad (TalkBack, 200 %, movimiento reducido) y no use material de
  Videojet/Factronics.

El equipo es venezolano y la app se usa también fuera de Venezuela; el motor debe aceptar
un país ISO, aunque la UI de F1.3 fije Venezuela.

## Decisión

1. **Motor puro con reloj, zona y país inyectados**, implementado dos veces con las
   **mismas reglas**: `apps/web/src/festivities.ts` y
   `android/.../data/FestivityEngine.kt`. La paridad se garantiza con **27 fixtures
   compartidos** en `packages/shared-fixtures/theme/festivities-fixtures.json`
   (incluye 29 de febrero, zonas horarias, cambio de año, DST, conflicto y opt-out).
2. **Reglas declaradas:**
   - Fijas con ventana: Navidad 15–25 dic; Reyes 5–6 ene; San Valentín 7–14 feb;
     Halloween 25–31 oct; Independencia 5 jul (solo VE).
   - Carnaval: domingo a martes = Pascua − 50 a Pascua − 47 (algoritmo gregoriano
     Meeus/Jones/Butcher).
   - Días de familia (solo VE): segundo domingo de mayo, tercer domingo de junio,
     tercer domingo de julio.
   - Prioridad en conflicto: Carnaval > San Valentín > Halloween > Independencia >
     Navidad > Reyes > Madre > Padre > Niño.
   - País `VE` por defecto; el motor acepta cualquier ISO 3166 y filtra solo las
     festividades venezolanas.
3. **Tema por capas:** el esquema base (marca o Material You) no se reemplaza. La
   festividad solo cambia `tertiary`/`onTertiary` y
   `secondaryContainer`/`onSecondaryContainer`. En Android se aplica sobre
   `dynamicLight/DarkColorScheme`; en PWA se aplican variables CSS
   `--fv-accent`/`--fv-on-accent`/`--fv-accent-soft`/`--fv-on-accent-soft`.
4. **Tokens neutros:** se fijaron `surfaceVariant`, `onSurfaceVariant` y
   `surfaceContainer*` de la marca para evitar los lavandas por defecto de Material 3 y
   mantener contraste/consistencia. Fondos, superficies y texto no cambian con la
   festividad.
5. **Paletas compartidas y contraste AA:** `packages/shared-fixtures/theme/palettes.json`
   define los pares de las 9 festividades (claro/oscuro). Android y PWA comparan sus
   paletas contra ese archivo y calculan contraste WCAG; el CSS se compara también con la
   paleta. Umbral: 4,5:1 para texto normal.
6. **Arte original y estático:** ilustraciones vectoriales propias (árbol, estrella,
   corazón, confeti, calabaza, franjas). Sin fotos, sin material de Videojet, sin
   partículas ni sonidos automáticos en F1.3. El modo sobrio oculta el arte y desactiva
   transiciones/animaciones en la PWA; Android no añade animación.
7. **Persistencia:** Android `SharedPreferences` (`festivities_enabled`, `sober_mode`,
   `festivity_override`); PWA IndexedDB (perfil) con recálculo cada minuto. Los cambios
   se aplican en el acto, sin reiniciar el sistema. El override admite `auto`, `none` o
   una festividad concreta.
8. **Evidencia en teléfono real:** 6 estados Android (claro, oscuro, Navidad, Carnaval,
   Halloween, sobrio), Material You + Navidad, y verificación por UI del opt-out y la
   persistencia. PWA: 6 estados con Playwright.

## Fechas y fuentes

- **Pascua/Carnaval:** algoritmo gregoriano documentado (Meeus/Jones/Butcher), probado
  con 2024–2028; no es una fecha inventada.
- **Independencia de Venezuela (5 jul):** fiesta nacional venezolana; referencia pública:
  `https://www.timeanddate.com/holidays/venezuela/`.
- **Navidad (25 dic), Reyes (6 ene), San Valentín (14 feb), Halloween (31 oct):**
  convenciones culturales internacionales, no datos técnicos de Videojet.
- **Día de la Madre/Padre/Niño:** convenciones culturales venezolanas (2.º domingo de
  mayo, 3.er domingo de junio, 3.er domingo de julio). **Pendiente de validación
  cultural** por el equipo de Factronics; si no se aprueban, se desactivan o se ajustan
  en una fase posterior.
- No se usa ninguna fecha, código ni dato de `VIDEOJET_DOCS_ENTRADA/`.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| **Fechas hardcodeadas por país en cada pantalla** | Imposible de probar con reloj inyectado y propensa a deriva entre Android/PWA. |
| **Calcular en el servidor** | La app es offline-first; no puede depender de red para un tema. |
| **Usar solo el calendario del sistema** | El sistema no conoce festividades de la app ni overrides; no hay tests deterministas. |
| **Reemplazar todo el esquema por la paleta festiva** | Rompe Material You y la legibilidad; se decidió cambiar solo acentos/contenedores. |
| **Dejar los lavandas por defecto de M3** | Se veía incoherente con la marca y dificultaba la auditoría de contraste; se fijaron tokens neutros. |
| **Partículas/sonidos automáticos** | Riesgo de batería, movimiento y molestia; F1.3 usa arte estático y deja partículas/sonidos como opción futura. |
| **Selector de país en la UI ahora** | El producto es de Factronics Venezuela; el motor ya acepta país para el futuro. Añadir UI sin validación cultural sería prematuro. |
| **Fechas "oficiales" inventadas para días comerciales** | Se marcan como convención pendiente de validación, no como verdad oficial. |

## Consecuencias

- **Ventaja:** misma regla en Android/PWA, verificable sin esperar la fecha real. El
  override y el modo sobrio permiten demos y pruebas en cualquier día.
- **Costo:** duplicación controlada del motor (Kotlin/TS) y de las paletas; los fixtures y
  tests evitan que se separen.
- **Riesgos:** las fechas culturales venezolanas deben validarse; el modo sobrio suprime
  toda decoración (decisión de producto); Material You puede variar por fabricante, pero
  la festividad solo toca acentos con contraste probado.
- **Accesibilidad:** arte decorativo sin semántica, sin animaciones; filas de 48 dp;
  contraste AA probado; el modo sobrio respeta a quien prefiere interfaces tranquilas.
- **Evidencia:** `36..41`, `50` (Android), `42..47` (PWA), `48`/`49` (Android fiestas y
  opt-out); tests de fixtures, contraste y e2e.
