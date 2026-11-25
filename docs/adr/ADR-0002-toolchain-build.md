# ADR-0002 — Herramientas de build: JDK 17, compileSdk 35, Gradle

- **Fecha:** 2026-11-25 · **Estado:** Aceptada

## Contexto

El preflight encontró Temurin JDK 17.0.21.1 y Android SDK con `platforms;android-35` + `build-tools;35.0.0` instalados. AGP 8.x funciona con JDK 17; JDK 21 solo es obligatorio en AGP muy recientes.

## Decisión

- **JDK 17** (Temurin) para Gradle/AGP. Si un AGP futuro exige JDK 21, se instala entonces (documentado en PREFLIGHT.md).
- **AGP 8.7.x + Gradle 8.13 + Kotlin 2.0.x** con plugin de compilador de Compose.
- **compileSdk 35 / targetSdk 35 / minSdk 26** (coherente con lo instalado y con Android 8.0+; el teléfono de pruebas es API 34).
- Se descarga la distribución de Gradle una vez para generar el wrapper; el wrapper queda versionado.

## Consecuencias

- Builds reproducibles en CI (ubuntu-latest con SDK 35) y en local.
- Sin dependencia de Android Studio (no está instalado y no se necesita).
