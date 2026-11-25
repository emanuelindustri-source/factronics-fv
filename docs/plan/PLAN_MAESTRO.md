# PLAN MAESTRO — JETPULSE (by Factronics)

**Proyecto:** aplicación Android nativa + PWA offline + portal público + backend para estudio, exámenes, cálculo de consumo, números de parte, informes, tutoriales 3D y certificados verificables, orientada a técnicos de Factronics y tecnologías Videojet.
**Creador:** Khristyan Hidalgo — Técnico de Servicio de Campo, Factronics, C.A. (Venezuela).
**Equipo de validación:** Eduardo Rodríguez (Supervisor Técnico), Luis Iungano, José Tovar, José Gabriel Ríos, Elián Inojosa (Técnicos Especialistas), Mariana Cerdeño (Coordinadora de Servicio Técnico).
**Versión del plan:** 1.0 — 24/11/2026.
**Nombre de trabajo:** **JetPulse** (by Factronics). Alternativas: FactroJet 360, Cabezal, Pulso Técnico, Forja VJ.
**Package Android:** `com.factronics.jetpulse`. Se decide antes del primer release; después no se cambia.
**Regla de ejecución:** una fase = un chat = un entregable instalable, probado y publicado.

---

## 1. Reglas no negociables

1. **El usuario no programa ni usa Blender.** El agente ejecuta todos los comandos, escribe todos los scripts, compila, instala, prueba, publica y documenta. Al usuario solo se le piden decisiones, permisos, cuentas y validación técnica.
2. **Cada fase termina funcionando.** No se acumulan fases a medias. Si algo no se puede terminar, se deja detrás de un flag apagado, se documenta y no se presenta como terminado.
3. **Trazabilidad total del contenido.** Todo dato técnico (pregunta, número de parte, error, tinta, procedimiento) debe tener: documento, código oficial, revisión, página, cita textual y revisor. Sin fuente, no se publica.
4. **No inventar.** Prohibido inventar números de parte, códigos de error, especificaciones, procedimientos, fechas o compatibilidades. Si falta información, se marca como “pendiente de validación” y se pide a un técnico.
5. **Propiedad intelectual.** No publicar manuales, diagramas, boletines, listas de partes ni capturas propiedad de Videojet/Factronics sin autorización escrita. El contenido real va en repositorio o bucket privado; el repo público solo lleva código, portal y contenido demo autorizado.
6. **Certificados.** Son del **programa interno de competencias técnicas de Factronics**, no una certificación oficial de Videojet. El texto del certificado y la web deben decirlo con claridad.
7. **Seguridad.** Ningún secreto en el repositorio. El token de GitHub que se pegó en un chat anterior está comprometido: debe revocarse y no reutilizarse. Keystore de Android con backup offline. RLS obligatorio en Supabase. Packs de contenido firmados.
8. **Privacidad.** Fecha de nacimiento, fotos y progreso son datos personales. Ranking opt-in con alias. Ubicación aproximada por país/zona horaria, no GPS por defecto. Exportar y borrar cuenta. Política de privacidad visible.
9. **Gamificación ética.** Nada de notificaciones culpabilizadoras, loot boxes, rachas imposibles sin pausa ni pay-to-win. Sí: metas, insignias, refuerzo variable, competencia social, escudos de racha, modo vacaciones y pausas.
10. **Accesibilidad y rendimiento son requisitos.** Contraste AA, TalkBack, escala de fuente 200%, movimiento reducido, objetivos táctiles de 48 dp, tiers gráficos para gama baja.
11. **Cada fase actualiza** `PROGRESS.json`, el portal, `CHANGELOG.md` y `PROJECT_STATE.md`; CI en verde; commit y push; tag de fase.
12. **Ante ambigüedad:** se documenta en un ADR y se elige la opción más segura. No se inventa ni se “arregla” ocultando el problema.

---

## 2. Decisiones de arquitectura

| Área | Decisión | Motivo |
|---|---|---|
| Android | Kotlin + Jetpack Compose + Material 3 + Navigation + Room + DataStore + WorkManager + Hilt + Coil | Stack nativo moderno, mantenible y con acceso real a APIs |
| 3D | Filament / SceneView con modelos GLB generados en Blender headless | 3D real sin exigir Blender al usuario |
| Web PWA | React + TypeScript + Vite + Dexie + i18next + Three.js + PDF.js + `docx` + `pdf-lib` | Ecosistema maduro, offline real y generación de Word/PDF en cliente |
| Portal | Astro estático + SVG/Canvas + GitHub Pages | Rápido, SEO, sin servidor y con despliegue gratuito |
| Backend | **Supabase** (Postgres, Auth, Storage, Realtime, Edge Functions, RLS) | GitHub Pages es estático; ranking, 1v1, cuentas y registro de certificados necesitan servidor |
| Certificados | Firma **Ed25519** en servidor + registro público mínimo + QR | Un QR no valida nada por sí solo; la firma y el registro sí |
| Contenido | Pipeline Python + JSON Schema + cola de revisión + packs firmados | Modular, auditable y ampliable con nuevos manuales |
| Repos | Público: código/portal/demo. Privado: documentos reales, extracciones y claves de respuesta | Protege la propiedad intelectual y permite portal público |
| Auth | Invitado + email OTP primero; Google OAuth después | Evita bloquear el desarrollo por la configuración de Google Cloud |
| i18n | Español (VE) principal + 10 idiomas reales + latín como easter egg de interfaz | Traducciones realistas y revisables |
| Tema | Color dinámico Android 12+ + capa de festividad validada en contraste | Material You sin romper accesibilidad ni identidad |
| Sensores | Detección de capacidad + simulación educativa etiquetada + fallback táctil | No todos los equipos tienen barómetro; no se inventan mediciones |
| Actualizaciones | GitHub Releases + SHA-256 + firma + instalador; Play interno después | Control directo y verificable |
| Informes | Motor compartido web (DOCX/PDF) en PWA; WebView local en Android cuando aplique | Evita duplicar lógica pesada en Kotlin |
| PDF | PDF.js en web; PdfRenderer + índice de texto precalculado en Android | Visor con búsqueda, resaltado y salto exacto a página |
| Analítica | Local-first; agregados opt-in; sin PII innecesaria | Privacidad y confianza |

**Por qué Supabase y no solo GitHub:** GitHub Pages no puede autenticar usuarios, guardar ranking, sincronizar progreso, gestionar duelos en tiempo real ni mantener un registro de certificados. Supabase cubre esas necesidades con Postgres, RLS, Realtime y Storage. Si más adelante se prefiere Firebase, el contrato de datos se mantiene; no se mezclan ambos.

**Sobre el contenido público:** una app offline puede ser extraída. No se promete DRM inviolable. Se usan packs privados, marca de agua por usuario, términos de uso y, para exámenes con certificado, sesiones emitidas por el servidor. La seguridad real está en la validación del certificado, no en ocultar el PDF en el teléfono.

---

## 3. Estructura de carpetas

```text
C:\Factronics_VJ_Ecosystem\
├── apps\
│   ├── android\                 # Kotlin + Compose + Filament
│   ├── web\                     # PWA React/TS
│   └── portal\                  # Landing Astro (GitHub Pages)
├── packages\
│   ├── content-schema\          # JSON Schema, tipos y validadores
│   ├── content-packs-demo\      # Solo contenido demo autorizado
│   └── shared-fixtures\         # Casos de prueba compartidos
├── tools\
│   ├── ingest\                  # PDF/OCR → JSON + revisión
│   ├── blender\                 # Scripts headless y modelos
│   └── reports\                 # Plantillas DOCX/PDF
├── supabase\                    # Migraciones, RLS, Edge Functions
├── docs\
│   ├── adr\                     # Decisiones de arquitectura
│   ├── plan\                    # Este plan y avance
│   ├── legal\                   # Licencias, permisos, privacidad
│   └── handoff\                 # Prompts de continuación por fase
├── releases\                    # APK/AAB firmados y manifiestos
├── VIDEOJET_DOCS_ENTRADA\       # LOCAL, fuera de git
│   ├── _INBOX\                  # Aquí se dejan PDFs nuevos
│   ├── 01_CIJ\                  # Manuales, boletines, diagramas, partes, tintas
│   ├── 02_TTO\
│   ├── 03_LASER\
│   ├── 04_OTRAS\
│   └── ACTUALIZAR_BASE_DATOS.bat
├── _private\                    # LOCAL, gitignored: keystore, tokens, backups
├── AGENTS.md
├── PROJECT_STATE.md
├── PROGRESS.json
├── CHANGELOG.md
└── README.md
```

**Backups fuera del proyecto:** `C:\Factronics_VJ_Backups\` con keystore, contraseñas en gestor de contraseñas, dump de Supabase y copia de `_private`. Nunca en el repositorio.

---

## 4. Las 41 fases

> Cada fase tiene subfases y un **gate** verificable. No se avanza si el gate no está en verde. Las fases marcadas con 🔒 son críticas de seguridad o propiedad intelectual; no se delegan a un modelo rápido.

### Etapa 0 — Fundaciones (F0)

**F0 · Fundaciones y arranque seguro** 🔒
- **0.1 Preflight real:** verificar Windows, CPU/RAM/disco, **archivo de paginación en 0 MB** (activarlo: 8–16 GB), espacio libre (mínimo 40 GB), JDK (17/21 según AGP), Android cmdline-tools/platform/build-tools, `adb devices`, modelo/API/sensores del teléfono, Blender headless, Python 3.12/3.13 con `uv` (3.14 puede romper librerías), Node/pnpm, git/gh, 7-Zip, firma de APK.
- **0.2 Seguridad y repositorio:** revocar el token expuesto y revisar actividad; crear token fine-grained o `gh auth login`; crear repo público + repo privado de contenido; monorepo; `AGENTS.md`; `PROJECT_STATE.md`; `PROGRESS.json`; ADRs; `.gitignore`; gitleaks; CI; Pages esqueleto; keystore + backup offline.
- **0.3 Marca y walking skeleton:** nombre, logo SVG, icono adaptativo (foreground/background/monochrome), splash, tokens de color/tipografía/motion, portal placeholder, APK “Hola JetPulse” instalada en el teléfono, PWA offline mínima, tracker de progreso.
- **Gate:** CI verde; gitleaks limpio; APK abre sin crash en el teléfono; PWA recarga offline; Pages responde; pagefile y disco OK; keystore respaldado; plan y estado commiteados.

### Etapa 1 — Núcleo compartido (4 fases)

**F1.1 · Esquema canónico y procedencia** 🔒
- Entidades: tecnología, familia, generación, modelo, sistema, componente, número de parte, código de error, tinta, documento, página, fragmento, pregunta, intento, certificado.
- `source_ref` obligatorio: documento, código oficial, revisión, página, cita, confianza, revisor, fecha.
- JSON Schema + validadores + IDs estables + versionado + migraciones + datos demo.
- **Gate:** `validate:content` en verde; 100 % de ítems demo con fuente; ADR de esquema aprobado.

**F1.2 · Internacionalización real**
- Español (VE) principal; en, pt-BR, pt-PT, it, de, fr, zh-Hans, ja, ko, hi; latín solo interfaz/logros.
- `locales_config` de Android, selector in-app, formato de fechas/números, pseudo-locale, textos técnicos separados de UI, glosario.
- **Gate:** smoke test en los 11 locales + latín; no hay texto hardcodeado; capturas de 3 locales.

**F1.3 · Motor de tema y festividades**
- Tokens de color; color dinámico Android 12+; capa de festividad (Navidad, Reyes, San Valentín, Carnaval, Día de la Madre/Padre/Hijo/Niño, Halloween, Independencia) por país/zona horaria y reglas de “enésimo día de la semana”; cálculo de Carnaval/Semana Santa; override manual; opt-out; modo sobrio.
- Assets: iconos, SVG, partículas, sonidos opcionales; validación de contraste; no romper Material You.
- **Gate:** pruebas con reloj inyectado para 12 fechas/países; contraste AA; el usuario puede desactivar; capturas.

**F1.4 · Offline, packs y contratos de sincronización** 🔒
- Almacenamiento local, migraciones, backup/restore, export/import.
- Pack de contenido firmado (manifest + versión + hash), instalación atómica, rollback, delta.
- Contrato de sync: outbox, IDs, conflictos, reintentos, límites.
- **Gate:** instalar/actualizar/revertir un pack; simular offline 24 h; sync converge; tests.

### Etapa 2 — Android base (4 fases)

**F2.1 · Shell nativo**
- Proyecto Gradle, Compose, Material 3, Navigation, edge-to-edge, splash, predictive back, adaptativo teléfono/tablet, iconos themed, estados de carga/error/vacío.
- **Gate:** APK instalada; navegación completa; rotación y dark mode; sin crashes en logcat.

**F2.2 · Perfil completo local** 🔒
- Foto de perfil y portada con recorte; nombre; fecha de nacimiento opcional; rol; empresa; medallas; privacidad; exportar/borrar; bloqueo biométrico opcional.
- **Gate:** crear/editar/exportar/borrar perfil; imágenes grandes sin OOM; TalkBack.

**F2.3 · Home, institución y ajustes**
- Home con progreso; historia Factronics/Videojet; equipo técnico; fuentes; ajustes; idioma; tema; festividades; acerca de; legal; créditos.
- **Gate:** contenido institucional con fuentes; enlaces; 11 idiomas; sin datos inventados.

**F2.4 · Rendimiento y accesibilidad base**
- Baseline Profile, Macrobenchmark, JankStats, presupuesto de APK, tiers gráficos, movimiento reducido, contraste, escala 200 %, TalkBack.
- **Gate:** cold start y jank medidos; sin P1 de accesibilidad; APK dentro del presupuesto acordado.

### Etapa 3 — PWA y portal (3 fases)

**F3.1 · PWA shell**
- React/TS/Vite, manifest, service worker, IndexedDB/Dexie, rutas, tema, i18n, perfil local, instalación, actualización.
- **Gate:** instalable; recarga offline; datos persisten; Lighthouse base.

**F3.2 · Portal público v1**
- Astro, marca, historia, equipo, tracker desde `PROGRESS.json`, descarga APK, stub de verificación, SEO/OG, partículas/SVG, responsive.
- **Gate:** Pages live; tracker correcto; enlaces; Lighthouse ≥ 90 en rendimiento/accesibilidad/SEO.

**F3.3 · Paridad PWA y E2E**
- Perfil, home, ajustes, offline, export/import, pruebas Playwright, axe, offline real.
- **Gate:** E2E verde; 0 violaciones críticas de accesibilidad; instalación en navegador real.

### Etapa 4 — Contenido (4 fases)

**F4.1 · Ingesta de documentos** 🔒
- `_INBOX` → detección de PDF, metadatos, código oficial Videojet, revisión, hash, dedupe, OCR si es escaneado, texto + coordenadas de palabras, imágenes, manifiesto.
- **Gate:** 10 PDFs de prueba procesados; metadatos editables; nada se publica automáticamente.

**F4.2 · Extracción asistida y revisión**
- Reglas/diccionarios para números de parte, errores, componentes, tintas; confianza; cola de revisión; aprobar/rechazar; provenance; admin local.
- **Gate:** precisión medida en muestra; 0 ítems sin revisor; export a pack.

**F4.3 · Carga inicial CIJ + muestras TTO/Láser**
- 1–2 modelos CIJ con 120+ ítems revisados; 10–20 ítems de TTO y Láser para probar modularidad; 7 tipos de pregunta; glosario; validación de técnicos.
- **Gate:** 100 % con fuente; 0 números de parte huérfanos; firma de 2 técnicos; pack firmado.

**F4.4 · Buscador y procedencia**
- Búsqueda offline con FTS, sinónimos, filtros, “ver fuente” a página exacta, marca de agua, salto a página.
- **Gate:** p95 < 300 ms en gama media; 100 % de resultados con fuente; enlace correcto.

### Etapa 5 — Estudio y exámenes (4 fases)

**F5.1 · Banco y 7 tipos de pregunta**
- Selección simple, V/F, selección múltiple, completar frase, describir componente, errores/fallas, números de parte; rúbricas; medios; accesibilidad; import/export.
- **Gate:** tests de cada tipo; render con imágenes/3D; sin duplicados.

**F5.2 · Modo estudio**
- Plan diario, FSRS, explicaciones, fuente, favoritos, áreas débiles, offline.
- **Gate:** sesión completa offline; repaso al día siguiente; fuente en 100 %.

**F5.3 · Constructor y sesión de examen**
- Blueprint por tecnología/familia/modelo/tema/dificultad/tipo/cantidad/tiempo; semilla determinista; autosave; interrupciones; revisión; puntaje parcial.
- **Gate:** 20 exámenes generados cumplen invariantes; examen offline; revisión con fuente; tests de scoring.

**F5.4 · Analítica local y calidad de ítems**
- Dominio por tema, curva de olvido, recomendaciones; dificultad/discriminación; banderas de ítems malos; sin PII.
- **Gate:** panel comprensible; ítems <30 % o >90 % marcados; export CSV.

### Etapa 6 — 3D y sensores (3 fases)

**F6.1 · Pipeline Blender**
- Modelos ilustrativos: cabezal CIJ, módulo hidráulico, cassette TTO, cabezal láser, cartucho, filtro; GLB, Draco/KTX2, LODs, thumbnails, turntables; etiqueta “ilustrativo, no a escala”.
- **Gate:** 3 modelos cargan < 3 s en gama media; licencias; revisión de técnico.

**F6.2 · Visor 3D y giroscopio**
- Órbita, exploded view, rayos X, hotspots, etiquetas, fallback táctil, movimiento reducido, tiers.
- **Gate:** 30 fps en gama media; funciona sin giroscopio; sin batería anómala.

**F6.3 · Retos de sensores**
- Detección de acelerómetro/barómetro; “agitar para pista” con límite; simulador de estabilidad; laboratorio de presión/altitud con entrada manual; calibración; batería.
- **Gate:** funciona con y sin sensores; sin permisos innecesarios; texto “estimación educativa”.

### Etapa 7 — Gamificación (3 fases)

**F7.1 · XP, niveles, medallas y rachas**
- Reglas locales, escudos, modo vacaciones, metas diarias, misiones, anti-abuso.
- **Gate:** tests de zonas horarias/DST; racha no se pierde por error; usuario puede pausar.

**F7.2 · Notificaciones y widget**
- WorkManager, resumen semanal, widget de racha, deep links, quiet hours, topes, controles.
- **Gate:** 0 notificaciones fuera de horario; widget actualiza; usuario puede apagar.

**F7.3 · Economía, balance y ética**
- Simulación Monte Carlo de progresión; sin pay-to-win; sin dark patterns; accesibilidad cognitiva.
- **Gate:** informe de balance; revisión ética; opción de desactivar gamificación.

### Etapa 8 — Nube y social (4 fases)

**F8.1 · Supabase, auth y RLS** 🔒
- Proyecto, migraciones, RLS, email OTP, Google OAuth (requiere acción del usuario en Google Cloud), invitado, vinculación, exportar/borrar cuenta, política de privacidad.
- **Gate:** tests de RLS; no se filtra PII; borrar cuenta funciona; Google login documentado.

**F8.2 · Sync y packs delta** 🔒
- Outbox, merge, conflictos, reintentos, delta de packs, observabilidad.
- **Gate:** dos dispositivos convergen; offline 24 h; rollback.

**F8.3 · Ranking y ligas**
- Opt-in, alias, temporadas, métricas, anti-cheat (validación servidor, tiempos, semillas), moderación.
- **Gate:** no se puede inyectar puntaje; ranking oculta perfiles; rate limit.

**F8.4 · Duelo 1v1**
- Invitación QR/PIN/enlace, lobby, preguntas sincronizadas, reconexión, timeout, revancha, pass-and-play offline.
- **Gate:** duelo real entre 2 dispositivos; reconexión; abuso controlado.

### Etapa 9 — Certificados (3 fases)

**F9.1 · Emisión y firma** 🔒
- Certificado PDF/imagen, Ed25519 servidor, registro, QR, estado “pendiente” offline.
- **Gate:** verificación criptográfica; no se puede forjar; PDF moderno.

**F9.2 · Portal de verificación** 🔒
- `/verify`: válido/expirado/revocado/no encontrado; nombre parcial; i18n; rate limit; noindex.
- **Gate:** QR real abre y valida; revocado se muestra; privacidad.

**F9.3 · Integridad y política** 🔒
- Sesión emitida por servidor, límites, plausibilidad, revisión manual, revocación, auditoría, texto “programa interno”.
- **Gate:** intento de forja falla; auditoría; abogado/revisor revisa texto.

### Etapa 10 — Herramientas de campo (4 fases)

**F10.1 · Calculadora de consumo**
- CIJ tinta/make-up, TTO ribbon, láser; supuestos editables; calibración; costo por 1000; gráficos; CSV/PDF; disclaimers; validación con 2 técnicos.
- **Gate:** fórmulas documentadas; resultados reproducibles; revisión técnica.

**F10.2 · Números de parte**
- Base, imágenes/renders, filtros, “usado en”, equivalentes/supersesiones, fuente, salto a página, OCR/etiqueta con cámara, offline.
- **Gate:** búsqueda rápida; 100 % con fuente; cámara no obligatoria.

**F10.3 · Informes**
- 6 plantillas: preventivo, correctivo, instalación, diagnóstico, cortesía, calibración; cliente/equipo, checklist, fotos, firmas, repuestos, DOCX/PDF, marca Factronics, numeración.
- **Gate:** DOCX abre en Word; PDF correcto; compartir desde Android; offline en PWA.

**F10.4 · Tutoriales y visor PDF completo**
- Guiones 3D, pasos, narración/subtítulos, video export, reproductor; PDF.js/PdfRenderer, búsqueda, resaltado, salto, marca de agua por usuario, metadatos Videojet.
- **Gate:** salto exacto a página; tutorial piloto aprobado; PDF no se rompe en móvil.

### Etapa 11 — Distribución y QA (4 fases)

**F11.1 · Actualizaciones** 🔒
- Manifiesto de versión, GitHub Releases, SHA-256 + firma, DownloadManager, instalador, PWA update, packs, rollback.
- **Gate:** actualización sobre versión anterior; hash inválido se rechaza; PWA avisa.

**F11.2 · Portal final**
- Todas las secciones, tracker, APK, verify, privacidad/términos, SEO/OG, analítica privacy-first, monitoreo.
- **Gate:** Lighthouse; enlaces; tracker real; APK descargable.

**F11.3 · QA y seguridad**
- Matriz Android 10/13/16, gama baja/media/alta, tablet; accesibilidad; offline/flaky; migraciones; backups; MASVS; gitleaks; dependencias; presupuestos.
- **Gate:** crash-free; sin P1; checklist firmado.

**F11.4 · Release 1.0**
- Firma, versionado, changelog, APK/AAB, Play interno opcional, documentación, video demo, soporte, roadmap 1.1, postmortem.
- **Gate:** release candidate instala sobre anterior; portal live; guía; rollback probado.

---

## 5. Protocolo de ejecución de cada fase

1. **Leer estado:** `AGENTS.md`, `PROJECT_STATE.md`, `PROGRESS.json`, ADRs, `git status`.
2. **Preflight:** `adb devices`, build baseline, tests, versión de herramientas.
3. **Implementar** solo el alcance de la fase; no adelantar fases.
4. **Probar:** unitarios, integración, Compose UI/Playwright, dispositivo físico, offline, accesibilidad, rendimiento.
5. **Evidencias:** capturas, logs, `logcat` sin errores, Lighthouse, vídeo corto si aplica.
6. **Actualizar:** `PROGRESS.json`, portal, `CHANGELOG.md`, `PROJECT_STATE.md`, ADR si hubo decisión.
7. **Commit + push + tag** `fase-X.Y`; CI verde.
8. **Handoff:** escribir `docs/handoff/FASE_SIGUIENTE.md` con el prompt exacto, modelo y esfuerzo recomendados.
9. **Cierre:** resumen en español, enlaces, riesgos, siguiente paso. No dejar el repo roto.

**Definición de terminado (DoD):**
- Compila y se instala; abre sin crash.
- Tests de la fase en verde.
- Probado en teléfono real y en web.
- Offline verificado si aplica.
- Accesibilidad y rendimiento medidos.
- Documentación y progreso actualizados.
- Commit/tag/push.
- Prompt de la siguiente fase entregado.

---

## 6. Modelos y esfuerzo recomendados

| Trabajo | Modelo | Esfuerzo |
|---|---|---|
| Arquitectura, seguridad, Gradle/Android, Compose, 3D, Supabase/RLS, certificados | **MiMo-V2.6-Pro** | Alto |
| Esquema de datos, motor de examen, sync, cálculos | **MiMo-V2.6-Pro** | Alto |
| Pipeline de contenido, i18n, pantallas repetitivas, tests, documentación | **DeepSeek V4.1 Flash** | Medio |
| UI polish, animaciones, assets, textos | **MiMo-V2.6-Pro** (diseño) + Flash (volcado) | Medio |
| QA final, release, auditoría | **MiMo-V2.6-Pro** | Alto |

**Reglas:** nunca usar un modelo rápido para RLS, firma de certificados, keystore, auth o migraciones. Un chat por fase; si se llena, cortar en subfase y handoff, no compactar. Adjuntar solo los archivos relevantes.

---

## 7. Riesgos principales y mitigación

| Riesgo | Mitigación |
|---|---|
| Token de GitHub expuesto | Revocar ya; auditar actividad; token fine-grained; nunca en repo/chat |
| Manuales sin autorización | Contenido privado; permiso escrito; repo público solo demo |
| Certificado interpretado como oficial de Videojet | Texto “programa interno Factronics”; revisión legal; disclaimer |
| OCR/contenido incorrecto | Revisión humana obligatoria; fuente por ítem; no auto-publicar |
| Google OAuth bloquea | Invitado/email primero; Google en F8.1 con guía paso a paso |
| Gama baja sin 3D/partículas | Tiers, reduced motion, fallback 2D, presupuesto de batería |
| Rendimiento de build en i3/24 GB | Pagefile, Gradle cache, dispositivo físico, builds incrementales |
| Python 3.14 incompatible | `uv` con 3.12/3.13 para el pipeline |
| Sin Android Studio/SDK | Instalar cmdline-tools/platform/build-tools en F0.1 |
| Traducciones malas | Glosario + revisión nativa antes de público; latín solo easter egg |
| Ranking/1v1 manipulables | Validación servidor, semillas, límites, opt-in, bajo stakes |
| Pérdida de keystore | Backup offline + gestor de contraseñas + prueba de restauración |
| Fatiga de notificaciones | Topes, quiet hours, opt-out, gamificación ética |

---

## 8. Plantilla de handoff

```text
PROYECTO JETPULSE — FASE [X.Y]
Lee AGENTS.md, PROJECT_STATE.md, PROGRESS.json y docs/handoff/FASE_[X.Y].md.
Objetivo: [objetivo].
Alcance: [subfases].
No hagas: [exclusiones].
Gate: [criterios].
Pruebas: teléfono + web + offline + a11y + perf.
Al terminar: actualiza progreso/portal, commit/tag/push, evidencia y prompt de FASE [X.Y+1].
Modelo recomendado: [modelo], esfuerzo [alto/medio].
```

---

**Nota final:** este plan es vivo. Cada fase puede ajustar subfases, pero no las reglas no negociables. Si una decisión cambia, se registra en `docs/adr/` y se actualiza este documento.
