# Frontend (`apps/frontend`)

Next.js (panel POS, landing, E2E Playwright). Convenciones de PR y tests: [`CONTRIBUTING.md`](../../CONTRIBUTING.md) (raíz del monorepo).

- Desde la **raíz del monorepo**, `npm run verify` incluye `verify:docs-links`; conviene ejecutarlo cuando toques documentación (enlaces en `docs/`). Más pautas en [`CONTRIBUTING.md`](../../CONTRIBUTING.md).

- E2E: `apps/frontend/e2e/README.md` · OpenAPI / contratos compartidos con integradores: [`docs/operacion/OPENAPI.md`](../../docs/operacion/OPENAPI.md) (export desde `apps/backend`).

- **CI / enlaces en docs:** Si CI falla por enlaces de documentación, desde la raíz del monorepo: `node scripts/check-docs-links.mjs --verbose`; desde esta carpeta: `node ../../scripts/check-docs-links.mjs --verbose`.

- Guía unificada de problemas locales → [TROUBLESHOOTING-DEV.md](../../docs/operacion/TROUBLESHOOTING-DEV.md).
