# Backend (`@pos/backend`)

API REST (Express, TypeORM, SQL Server). Convenciones de PR, tests y evidencia operativa: [`CONTRIBUTING.md`](../../CONTRIBUTING.md) (raíz del monorepo).

- Desde la **raíz del monorepo**, `npm run verify` incluye `verify:docs-links`; conviene ejecutarlo cuando toques documentación (enlaces en `docs/`). Más pautas en [`CONTRIBUTING.md`](../../CONTRIBUTING.md).

- Exportar OpenAPI cuando cambien rutas o contratos públicos: [`docs/operacion/OPENAPI.md`](../../docs/operacion/OPENAPI.md) — en este paquete: `npm run openapi:export`.

- **CI / enlaces en docs:** Si CI falla por enlaces de documentación, desde la raíz del monorepo: `node scripts/check-docs-links.mjs --verbose`; desde esta carpeta: `node ../../scripts/check-docs-links.mjs --verbose`.

- Guía unificada de problemas locales → [TROUBLESHOOTING-DEV.md](../../docs/operacion/TROUBLESHOOTING-DEV.md).
