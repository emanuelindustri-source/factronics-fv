# Changelog — F&V (by Factronics)

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [0.1.0] — 2026-11-25 — Fase 0 · Fundaciones

### Añadido
- **0.1 Preflight:** verificación real de hardware/software (Windows 10 LTSC, i3-1215U, 23,7 GB RAM, 74,75 GB libres), JDK 17 Temurin, Android SDK 35 + build-tools 35.0.0, adb, teléfono Xiaomi API 34 conectado, Blender 4.5.16 headless, Python 3.13 vía `uv`, Node 24, pnpm 12, Git/gh, 7-Zip, gitleaks 8.30.1. Instalación de `uv`, `pnpm` y `gitleaks`. Archivo de paginación configurado a 8–16 GB (pendiente de reinicio). Resultados en `docs/plan/PREFLIGHT.md`.
- **0.2 Seguridad y repositorio:** monorepo con estructura del PLAN_MAESTRO, `.gitignore` (contenido propietario y secretos fuera de git), `AGENTS.md`, `PROJECT_STATE.md`, `PROGRESS.json`, ADRs 0001–0005, carpeta local `VIDEOJET_DOCS_ENTRADA` con estructura y LEEME, keystore de Android `fv-release.keystore` (RSA 4096) con backup offline en `C:\Factronics_VJ_Backups`, CI con gitleaks + build Android/PWA/portal y despliegue a GitHub Pages. Advertencia y pasos de revocación del token de GitHub comprometido (uso prohibido).
- **0.3 Marca y walking skeleton:** nombre definitivo **F&V** (package `com.factronics.fv`, ADR-0001), logo SVG con marca de pulso, icono adaptativo (foreground/background/monochrome), splash, tokens de color/tipografía/movimiento, accesibilidad base (contraste AA, objetivos 48 dp, TalkBack, movimiento reducido). App Android (Compose + Material 3 + navegación) con pantallas Inicio/Perfil/Ajustes/Acerca de, idioma es/en y tema claro/oscuro/Material You. PWA offline (React + TS + Vite + Dexie + i18next + Workbox) con manifest, service worker, IndexedDB e instalación. Portal público (Astro) con historia citada, equipo, tracker desde `PROGRESS.json` y descarga del APK.

### Seguridad
- Ningún secreto en el repositorio. Token comprometido del chat anterior: **uso prohibido**, revocación a cargo del dueño de la cuenta (pasos entregados).
- Keystore con contraseña generada aleatoriamente; credenciales entregadas solo por archivo local para el gestor de contraseñas del usuario.

### Documentado
- ADR-0001 Nombre y package · ADR-0002 Toolchain de build · ADR-0003 Contenido demo · ADR-0004 Repositorios · ADR-0005 Seguridad (token y keystore).
