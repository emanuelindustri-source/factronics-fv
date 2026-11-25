# ADR-0005 — Seguridad: autenticación de GitHub y keystore de Android

- **Fecha:** 2026-11-25 · **Estado:** Aceptada

## Contexto

Un token de GitHub fue pegado en un chat anterior: está **comprometido**. La regla prohíbe usarlo o repetirlo. Además, los APK deben firmarse con un keystore propio con backup offline.

## Decisión

1. **Token comprometido:** uso prohibido. Su revocación corresponde al dueño de la cuenta en Settings → Developer settings → Personal access tokens (se le dieron los pasos exactos). Verificación de actividad en el security log.
2. **Autenticación operativa:** `gh auth login` (device flow, keyring de Windows). Estado verificado: cuenta `emanuelindustri-source` autenticada con token OAuth del keyring, scopes `repo, workflow, read:org, gist, admin:public_key`. Este token no aparece en ningún archivo del repo.
3. **Keystore de Android:** se genera `fv-release.keystore` con contraseña aleatoria fuerte. Vive en `_private/` (gitignored) y se respalda en `C:\Factronics_VJ_Backups`. Las credenciales se entregan al usuario por archivo local para que las guarde en **su gestor de contraseñas**; no se escriben en el repo ni en chats.
4. Se prueba la firma de un APK con el keystore en esta fase (gate F0).

## Consecuencias

- Ningún secreto en git; gitleaks en CI y escaneo local en cada fase.
- Si el keystore se pierde, la copia offline permite recuperarlo (se prueba la restauración desde backup).
