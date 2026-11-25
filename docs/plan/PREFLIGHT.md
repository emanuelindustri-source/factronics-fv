# PREFLIGHT — F&V (by Factronics) — Fase 0.1

**Fecha:** 2026-11-25 · **Ejecutado por:** agente (Khristyan no ejecuta comandos).
**Método:** verificación real con comandos en la máquina del creador. Nada asumido.

## 1. Hardware y sistema

| Ítem | Resultado | Estado |
|---|---|---|
| SO | Windows 10 Enterprise LTSC 10.0.19044 (64 bits) | ✅ |
| CPU | Intel Core i3-1215U, 6 núcleos / 8 hilos | ✅ |
| RAM | 23,7 GB totales (~15,75 GB libres en la medición) | ✅ |
| Disco C: | 74,75 GB libres (mínimo requerido: 40 GB) | ✅ |
| **Archivo de paginación** | **Estaba en 0 MB** → configurado a `C:\pagefile.sys 8192 16384` (8–16 GB) vía registro con elevación UAC (exit code 0) | ⚠️ **requiere REINICIO para aplicarse** — el usuario reinicia al final de la fase |

## 2. Herramientas de desarrollo

| Herramienta | Versión / ruta | Estado |
|---|---|---|
| JDK | Temurin OpenJDK 17.0.21.1 (`JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.21.10002-hotspot\`) | ✅ suficiente para AGP 8.x |
| Android SDK | `C:\Android` (ANDROID_HOME): cmdline-tools/latest, platform-tools, **platforms;android-35**, **build-tools;35.0.0**, NDK 27.2.12479018, licencias aceptadas | ✅ |
| adb | 1.0.41 / 37.0.3 (`C:\Android\platform-tools\adb.exe`) | ✅ |
| Blender | **4.5.16 LTS** headless probado (`C:\Program Files\Blender Foundation\Blender 4.5\`), Python interno 3.11.15 | ✅ |
| Python | 3.14.10 del sistema + **`uv` 0.13.10 instalado** + **CPython 3.13.18** descargado por uv (entorno de pipeline; 3.14 puede romper librerías) | ✅ |
| Node.js | v24.22.3 | ✅ |
| npm | 11.19.1 (vía `npm.cmd`; la política de scripts bloqueaba `npm.ps1` → `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, sin admin) | ✅ |
| pnpm | 12.23.0 (instalado global con npm) | ✅ |
| corepack | 0.36.0 | ✅ |
| Git | 2.56.1.windows.1 (user: Khristyan Hidalgo / emanuel.industri@gmail.com) | ✅ |
| GitHub CLI | 2.105.0, **autenticado por keyring** (cuenta `emanuelindustri-source`, token OAuth de device-flow; NO es el token comprometido) | ✅ |
| 7-Zip | 26.06 | ✅ |
| gitleaks | 8.30.1 (`C:\tools\gitleaks\gitleaks.exe`) instalado durante el preflight | ✅ |

## 3. Teléfono de pruebas (USB)

| Ítem | Resultado |
|---|---|
| Modelo | Xiaomi 22101316G (nombre de dispositivo: `ruby`) |
| Android / API | Android 14 / **API 34** |
| Parche de seguridad | 2026-09-01 |
| Sensores disponibles | acelerómetro, giroscopio, brújula, luz, proximidad, contador de pasos |
| **Barómetro** | **NO disponible** → el plan ya exige fallback táctil y etiqueta “estimación educativa” |
| Cámara | Sí (frontal/trasera, autofocus) |

## 4. Decisiones derivadas (ver docs/adr)

- **ADR-0001:** producto renombrado a **F&V** por decisión del creador (era “JetPulse”); package `com.factronics.fv`.
- **ADR-0002:** JDK 17 se mantiene (AGP 8.x lo soporta); se usará JDK 21 solo si un AGP futuro lo exige.
- **ADR-0003:** compileSdk/targetSdk 35 (lo instalado); minSdk 26.
- **ADR-0004:** repos `factronics-fv` (público) + `factronics-fv-content` (privado), coherentes con el nombre final.

## 5. Bloqueadores abiertos

| # | Bloqueador | Plan |
|---|---|---|
| 1 | Pagefile pendiente de **reinicio** | El usuario reinicia el PC al finalizar la Fase 0. Hasta entonces, 23,7 GB de RAM bastan para los builds de la fase. |
| 2 | **Token de GitHub comprometido** del chat anterior | Uso prohibido. Revocación es acción de la cuenta del usuario (Settings → Developer settings → Personal access tokens). Se le entregaron los pasos exactos. |

**Nada más quedó pendiente: todo lo instalable sin administrador quedó instalado y probado.**
