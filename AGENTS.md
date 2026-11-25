# AGENTS.md — F&V (by Factronics)

**Instrucciones obligatorias para cualquier agente de IA o persona que trabaje en este repositorio.**
Proyecto: **F&V** (nombre definitivo elegido por el creador; era “JetPulse”). Package Android: `com.factronics.fv`.

## 0. Quién es quién

- **Khristyan Hidalgo** — Técnico de Servicio de Campo, Factronics, C.A. (Venezuela). Creador del producto. **NO programa y NO usa Blender.** Toma decisiones, da permisos, valida contenido y prueba la app.
- **El agente** ejecuta absolutamente todos los comandos, scripts, builds, pruebas, instalación por ADB, publicación y documentación.
- **Equipo de validación técnica:** Eduardo Rodríguez (Supervisor Técnico), Luis Iungano, José Tovar, José Gabriel Ríos, Elián Inojosa (Técnicos Especialistas), Mariana Cerdeño (Coordinadora de Servicio Técnico).

## 1. Reglas no negociables

1. **Una fase = un chat = un entregable instalable y probado.** No se acumulan fases a medias. Lo incompleto queda detrás de un flag apagado y documentado, nunca presentado como terminado.
2. **Trazabilidad total:** todo dato técnico (pregunta, número de parte, error, tinta, procedimiento) exige documento, código oficial, revisión, página, cita textual y revisor. **Sin fuente no se publica.**
3. **Prohibido inventar** números de parte, códigos de error, especificaciones, procedimientos, fechas o compatibilidades. Lo que falte se marca **“pendiente de validación”** y se pide a un técnico.
4. **Propiedad intelectual:** no publicar manuales, diagramas, boletines, listas de partes ni capturas de Videojet/Factronics sin autorización escrita. El contenido real vive en `VIDEOJET_DOCS_ENTRADA/` (local, gitignored) y en el **repo privado** `factronics-fv-content`. El repo público solo lleva código, portal y contenido demo autorizado. **Decisión vigente: solo contenido demo.**
5. **Certificados:** son del **programa interno de competencias técnicas de Factronics, C.A.** — “No es una certificación oficial de Videojet Technologies”. Texto obligatorio en certificado, app y portal. Firma Ed25519 en servidor; el QR solo apunta a la verificación.
6. **Seguridad:** ningún secreto en el repo (ver `.gitignore`). **El token de GitHub pegado en un chat anterior está COMPROMETIDO: prohibido usarlo o repetirlo.** Autenticación solo vía `gh auth login` (device flow, keyring) o token fine-grained nuevo guardado fuera del repo. Nunca imprimir tokens en logs. Keystore de Android con backup offline en `C:\Factronics_VJ_Backups`. RLS obligatorio en Supabase. Packs de contenido firmados.
7. **Privacidad:** fecha de nacimiento, fotos y progreso son datos personales. Ranking opt-in con alias. Ubicación aproximada por país/zona horaria, no GPS por defecto. Exportar y borrar cuenta. Política de privacidad visible.
8. **Gamificación ética:** prohibido notificaciones culpabilizadoras, loot boxes, rachas imposibles sin pausa y pay-to-win. Permitido: metas, insignias, refuerzo variable, competencia social, escudos de racha, modo vacaciones, pausas, apagar gamificación.
9. **Accesibilidad y rendimiento son requisitos:** contraste AA, TalkBack, escala de fuente 200 %, movimiento reducido, objetivos táctiles de 48 dp, tiers gráficos para gama baja.
10. **Ante ambigüedad:** documentar un ADR en `docs/adr/` y elegir la opción más segura. No ocultar errores.
11. **Cada fase actualiza** `PROGRESS.json`, el portal, `CHANGELOG.md` y `PROJECT_STATE.md`; CI en verde; commit, push y tag `fase-X.Y`; handoff en `docs/handoff/`.
12. **No declarar “terminado” nada que no se haya ejecutado y probado** en teléfono real (cuando aplique) y en web.

## 2. Cómo trabajar aquí

1. Leer `PROJECT_STATE.md`, `PROGRESS.json`, `docs/adr/` y `git status` antes de tocar nada.
2. Ejecutar el preflight rápido: `adb devices`, versión de herramientas, build base en verde.
3. Implementar **solo el alcance de la fase**. No adelantar fases.
4. Probar: unitarios, dispositivo físico (`adb install -r`), web, offline, accesibilidad básica. Guardar evidencia en `docs/evidencia/`.
5. Actualizar documentación y progreso; commit + push + tag; escribir el prompt de la siguiente fase en `docs/handoff/`.

## 3. Comandos de referencia (Windows)

```powershell
# Android
cd C:\Factronics_VJ_Ecosystem\apps\android
.\gradlew.bat :app:assembleDebug
adb install -r app\build\outputs\apk\debug\app-debug.apk
adb shell am start -n com.factronics.fv/.MainActivity

# Web PWA
cd C:\Factronics_VJ_Ecosystem\apps\web
npm run build ; npm run test

# Portal
cd C:\Factronics_VJ_Ecosystem\apps\portal
npm run build

# Seguridad
C:\tools\gitleaks\gitleaks.exe detect --source C:\Factronics_VJ_Ecosystem --redact --no-banner
```

## 4. Modelos y esfuerzo (ver PLAN_MAESTRO.md §6)

Arquitectura, seguridad, Gradle/Android, Compose, 3D, Supabase/RLS y certificados: **modelo potente, esfuerzo alto**. Nunca delegar RLS, firma de certificados, keystore, auth ni migraciones a un modelo rápido.

## 5. Contenido institucional

Historia y datos de Factronics solo con fuente citada (factronics.com.ve). No inventar historia. Textos de Videojet: solo enlaces y resúmenes cortos con cita; nada copiado extenso.
