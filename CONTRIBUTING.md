# Contribuir al proyecto

Guía breve para clonar, desarrollar y abrir pull requests en este monorepo (Express + TypeORM + Next.js). Contexto de cierre y alcance: [`docs/PLAN-CIERRE-PROYECTO.md`](docs/PLAN-CIERRE-PROYECTO.md). Más contexto general: [`README.md`](README.md). Variables y secretos (sin filtrar credenciales): [`docs/operacion/SECRETS-RUNBOOK.md`](docs/operacion/SECRETS-RUNBOOK.md). Guía de problemas frecuentes en dev: [`docs/operacion/TROUBLESHOOTING-DEV.md`](docs/operacion/TROUBLESHOOTING-DEV.md).

## Requisitos

- **Node.js 20+** y npm (workspaces en la raíz). El `engines.node` del `package.json` de la raíz y **`.nvmrc`** fijan Node **20** para desarrollo y CI.
- **Docker** + Docker Compose (recomendado para SQL Server y Redis en local).
- Opcional: SQL Server local si no usas contenedores.

## Clonar e instalar

```bash
git clone <url-del-repo>
cd pos-melania
npm install
```

Variables de entorno: copia desde `.env.example` a `apps/backend/.env` y `apps/frontend/.env.local` (ver `README.md`).

## Desarrollo

- Servicios: `docker-compose up -d` (o tu SQL Server/Redis según `.env`).
- Backend: `npm run dev:backend` desde la raíz (o `cd apps/backend && npm run dev`).
- Frontend: `npm run dev:frontend` desde la raíz.
- Migraciones y seed (backend): `cd apps/backend && npm run migration:run && npm run seed`.

## Pruebas

| Ámbito | Comando | Notas |
|--------|---------|--------|
| Unit (backend) | `cd apps/backend && npm test` | No requiere SQL en la mayoría de suites. |
| Integración HTTP | `cd apps/backend && npm run test:integration` | Requiere SQL Server + Redis, migraciones y seed. Guía paso a paso: **[`docs/operacion/INTEGRATION-TESTS-LOCAL.md`](docs/operacion/INTEGRATION-TESTS-LOCAL.md)**. |
| E2E (Playwright) | `cd apps/frontend && npm run test:e2e` | Credenciales y base URL: `apps/frontend/e2e/README.md`. |

- Ejemplo de test **puro** sin BD: `apps/backend/src/__tests__/plan-limits.test.ts` (`cd apps/backend && npm test` lo ejecuta); otro: `apps/backend/src/__tests__/trial-pure.test.ts` (fake timers / `trialStateFromEndsAt`); `apps/backend/src/__tests__/tenant-access.test.ts` (JWT / branching tenant sin DB); `apps/backend/src/__tests__/tienda-access.test.ts` (helpers tienda/caja sin DB).

Desde la raíz también: `npm run test:e2e` (reenvía al workspace frontend).

## OpenAPI

Si cambias rutas públicas, contratos o documentación que deban compartirse con integradores, exporta el spec según **[`docs/operacion/OPENAPI.md`](docs/operacion/OPENAPI.md)** (`cd apps/backend && npm run openapi:export`). El JSON generado no se versiona por defecto en el flujo habitual del repo; evita añadir `openapi.json` al commit salvo que el equipo acuerde lo contrario.

## Checklist antes del PR

1. **Landing / planes:** si tocas textos o números de la landing relacionados con límites de plan, ejecuta desde la raíz **`npm run verify`** (mismo chequeo que `npm run verify:landing-plans` / CI). El script [`scripts/verify-plan-limits-landing.mjs`](scripts/verify-plan-limits-landing.mjs) comprueba que los límites mostrados en la landing coinciden con `PLAN_LIMITS` en `apps/backend/src/saas/plan-limits.ts`. Deja el comando en **exit 0**.
2. **Docs (`docs/**/*.md`):** si tocas esos archivos, ejecuta **`npm run verify:docs-links`** desde la raíz (enlaces en markdown; [`scripts/check-docs-links.mjs`](scripts/check-docs-links.mjs); mismo paso que CI). **Exit 0**. Depuración local de enlaces rotos: `node scripts/check-docs-links.mjs --verbose` (traza en stderr).
3. **Secretos:** no commits de `.env`, claves, JWT ni datos reales de clientes. Revisar `docs/operacion/SECRETS-RUNBOOK.md` si añades variables.
4. **Stripe / billing:** si tocas checkout, webhooks, portal o variables de facturación del producto, revisa **[`docs/operacion/STRIPE-PROD-CHECKLIST.md`](docs/operacion/STRIPE-PROD-CHECKLIST.md)** antes de producción.
5. **Tests:** al menos `npm test` en backend para cambios de API o lógica; integración cuando el cambio afecte flujos multi-tenant o HTTP (ver tabla arriba).
6. **Evidencia operativa:** plantillas y política en **[`docs/operacion/evidence/README.md`](docs/operacion/evidence/README.md)** (no versionar material sensible).

## CI

El workflow `.github/workflows/ci.yml` ejecuta typecheck, build frontend, tests unitarios del backend, el mismo paso de landing que **`npm run verify`** en la raíz (`node scripts/verify-plan-limits-landing.mjs`) y **`npm run verify:docs-links`**. Los tests de integración corren en **push a `main`** con servicios levantados en el job.

## Issues en GitHub

La configuración de plantillas y enlaces de contacto está en **[`.github/ISSUE_TEMPLATE/config.yml`](.github/ISSUE_TEMPLATE/config.yml)** (issues en blanco habilitados; enlaces a esta guía y a `SECURITY.md`).

## Dependabot

El archivo **[`.github/dependabot.yml`](.github/dependabot.yml)** programa actualizaciones **mensuales** de dependencias npm en la raíz del monorepo, `apps/backend` y `apps/frontend`. Al revisar PRs automáticos de Dependabot:

1. Lee el changelog o notas de la dependencia; prioriza parches de seguridad y versiones que mantengan compatibilidad con Node 20 y el stack del repo.
2. Ejecuta en local o confía en CI: typecheck, tests, `npm run verify` cuando el PR toque frontend o textos de planes y `npm run verify:docs-links` si toca `docs/**/*.md`.
3. Si un bump mayor rompe build o tests, deja comentario en el PR con el error concreto o abre un issue de seguimiento; no mezcles en el mismo PR cambios funcionales no relacionados.

Gracias por mantener los cambios acotados y alineados con los planes en `docs/PLAN-MEJORAS.md` y `docs/PLAN-EVOLUCION-POS-GENERICO.md`.
