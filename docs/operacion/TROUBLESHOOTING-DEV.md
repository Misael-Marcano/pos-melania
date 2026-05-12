# Desarrollo local: problemas frecuentes

Guía breve para Windows/PowerShell, contenedores y verificación de enlaces en `docs/`. Para el flujo completo de clone y PR, ver [Contribuir](../../CONTRIBUTING.md).

## PowerShell

- Sitúate en la raíz del monorepo con `Set-Location` (alias `cd`), por ejemplo: `Set-Location C:\ruta\pos-melania`.
- En **PowerShell 5.x** (Windows por defecto en muchos equipos), el operador `&&` entre comandos **no existe**. Ejecuta comandos en líneas separadas, usa `;` entre ellos, o actualiza a **PowerShell 7+** si quieres encadenar con `&&`.

## OneDrive / rutas largas (Windows)

Si el repo está bajo una carpeta sincronizada por OneDrive (p. ej. `OneDrive\Escritorio\`), Git, `npm install` y Docker pueden ir más lentos o chocar con rutas muy largas o archivos bloqueados mientras se sincroniza. Conviene valorar un clon fuera de esa carpeta (p. ej. `C:\dev\pos-melania`) para `node_modules` y volúmenes de contenedor. Es una limitación habitual del entorno en Windows, no un fallo del producto.

### Git: «Filename too long»

En Windows, Git puede fallar al hacer checkout o pull con un error del estilo **Filename too long** cuando la ruta completa supera el límite histórico del sistema (a menudo empeora con `node_modules` o rutas profundas bajo OneDrive). Opciones:

1. **Preferida:** clonar el repo en una ruta corta (p. ej. `C:\dev\pos-melania`), como arriba.
2. **Mitigación en Git:** habilitar rutas largas en el repositorio o globalmente (requiere Git para Windows reciente y, en muchos equipos, políticas NTFS/long paths ya activas):

   ```powershell
   Set-Location C:\ruta\pos-melania
   git config core.longpaths true
   ```

   Para aplicarlo a todos los repos del usuario: `git config --global core.longpaths true`.

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
