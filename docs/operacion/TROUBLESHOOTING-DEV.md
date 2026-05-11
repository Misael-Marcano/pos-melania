# Desarrollo local: problemas frecuentes

Guía breve para Windows/PowerShell, contenedores y verificación de enlaces en `docs/`. Para el flujo completo de clone y PR, ver [Contribuir](../../CONTRIBUTING.md).

## PowerShell

- Sitúate en la raíz del monorepo con `Set-Location` (alias `cd`), por ejemplo: `Set-Location C:\ruta\pos-melania`.
- En **PowerShell 5.x** (Windows por defecto en muchos equipos), el operador `&&` entre comandos **no existe**. Ejecuta comandos en líneas separadas, usa `;` entre ellos, o actualiza a **PowerShell 7+** si quieres encadenar con `&&`.

## OneDrive / rutas largas (Windows)

Si el repo está bajo una carpeta sincronizada por OneDrive (p. ej. `OneDrive\Escritorio\`), Git, `npm install` y Docker pueden ir más lentos o chocar con rutas muy largas o archivos bloqueados mientras se sincroniza. Conviene valorar un clon fuera de esa carpeta (p. ej. `C:\dev\pos-melania`) para `node_modules` y volúmenes de contenedor. Es una limitación habitual del entorno en Windows, no un fallo del producto.

## Docker local

SQL Server, Redis y servicios vía Compose: [DOCKER-DEV.md](DOCKER-DEV.md).

## Docker / puertos

- Puertos usados por el stack local: `1433` (SQL Server), `6379` (Redis), `3000` (frontend) y `4000` (backend). Si están ocupados, libéralos o ajusta el mapeo en `docker-compose.yml`.
- Ver estado y puertos publicados: `docker compose ps`.
- Reinicio limpio: `docker compose down -v` — **borra los volúmenes** (incluida la base SQL y datos de Redis); úsalo solo si quieres partir de cero.
- Detalle de servicios y troubleshooting de contenedores: [DOCKER-DEV.md](DOCKER-DEV.md).

## Integración SQL / Redis

Tests HTTP de integración del backend (migraciones, seed, variables): [INTEGRATION-TESTS-LOCAL.md](INTEGRATION-TESTS-LOCAL.md).

## Enlaces en documentación

La raíz del repo valida tipos, tests unitarios del backend y enlaces internos de Markdown (incl. `docs/` y la landing):

- `npm run verify` — incluye `verify:docs-links`.
- `npm run verify:docs-links` — solo comprobación de enlaces.
- Diagnóstico detallado: `node ../../scripts/check-docs-links.mjs --verbose` (desde esta carpeta, la ruta relativa al script es `../../scripts/check-docs-links.mjs`; desde la raíz del repo basta `node scripts/check-docs-links.mjs --verbose`).
