# `@pos/shared`

Paquete con **tipos y utilidades compartidas** entre las apps del monorepo (frontend, backend, etc.).

## Contribuir

Ver [CONTRIBUTING.md](../../CONTRIBUTING.md) en la raíz del repositorio.

- Problemas de entorno local → [TROUBLESHOOTING-DEV.md](../../docs/operacion/TROUBLESHOOTING-DEV.md)

Si modificas documentación o enlaces que cruzan paquetes o la raíz del repo, ejecuta **`npm run verify`** desde la raíz (incluye `verify:docs-links` y valida que los enlaces en docs sigan siendo coherentes).

Si fallan los enlaces de documentación, en la raíz: `node scripts/check-docs-links.mjs --verbose` (desde este paquete: `node ../../scripts/check-docs-links.mjs --verbose`).
