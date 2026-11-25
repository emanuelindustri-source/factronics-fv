# releases/ — manifiestos de publicación

Los binarios (APK/AAB) **no se versionan en git**: se publican por
[GitHub Releases](https://github.com/emanuelindustri-source/factronics-fv/releases)
con nombre de archivo, versión, SHA-256 y firma.

Estructura de una release:

```text
fv-<version>-release.apk
fv-<version>-release.apk.sha256
manifest.json   { version, versionCode, sha256, minSdk, publishedAt, notes }
```

Reglas:
- Toda release se firma con `fv-release.keystore` (alias `fv`), respaldado offline.
- El hash SHA-256 se publica junto al archivo y en el portal.
- Las actualizaciones en la app verifican hash + firma antes de instalar (F11.1).
