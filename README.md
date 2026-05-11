# Punto de venta (POS) — retail / inventario (SaaS multi‑tenant)

Monorepo con **API Express + TypeORM (SQL Server)** y **frontend Next.js**. Cada organización (**tenant**) tiene datos aislados; el producto puede operarse en modo multi‑organización con facturación opcional vía **Stripe**, límites por plan y **trial**. La marca en pantalla es neutra por defecto y se ajusta con variables `NEXT_PUBLIC_*` y con **Configuración** en la app (nombre fiscal, RNC, recibos, fiscal por jurisdicción).

- Guía para contribuir (clone, tests, checklist PR): [`CONTRIBUTING.md`](CONTRIBUTING.md). Divulgación responsable de vulnerabilidades: [`SECURITY.md`](SECURITY.md). Las PR usan la plantilla del repositorio: GitHub aplica automáticamente [`.github/pull_request_template.md`](.github/pull_request_template.md) al abrir un pull request.
- Roadmap producto genérico: `docs/PLAN-EVOLUCION-POS-GENERICO.md`
- Mejoras y estado por fases (incl. Fase 6 operación SaaS): `docs/PLAN-MEJORAS.md`
- Implementación SaaS ejecutable: `docs/PLAN-IMPLEMENTACION-SAAS-MULTI-TENANT.md`

## Estructura del monorepo

```
pos-melania/
├── apps/
│   ├── backend/     # API REST (Express, TypeORM, Jest)
│   └── frontend/    # Next.js + React + Tailwind
├── packages/
│   └── shared/      # Tipos y código compartido (`@pos/shared`)
├── scripts/         # p. ej. verify-plan-limits-landing.mjs
├── docker-compose.yml
├── docker-compose.production.yml   # plantilla producción (ver docs)
└── .env.example    # referencia única de variables (backend + frontend)
```

## Stack tecnológico

| Capa | Tecnología (versiones en `package.json`) |
| ---- | ------------------------------------------ |
| Runtime | Node.js **20** (CI y proyecto alineados a 20.x) |
| Backend | **Express** ^4.19, **TypeScript** ^5.5, **TypeORM** ^0.3.20 |
| Base de datos | **SQL Server** (driver `mssql` ^11) |
| Caché | **Redis** (`ioredis` ^5) |
| Frontend | **Next.js** ^16.2, **React** ^18.3, **Tailwind CSS** 3.x |
| Estado / datos cliente | **Zustand** + **TanStack React Query** |
| Autenticación | **JWT** (roles: `admin`, `cajero`, `soporte`, `plataforma`) |
| Facturación producto | **Stripe** (`stripe` ^17) — opt‑in por variables |
| Calidad | **Jest** + **Supertest** (backend), **Playwright** (E2E frontend) |
| Contenedores | **Docker** + Docker Compose |

## Requisitos

- **Node.js 20+** y npm (workspaces en la raíz)
- **Docker** y Docker Compose (recomendado para SQL Server + Redis + servicios)
- (Opcional) SQL Server local si no usas contenedores

## Variables de entorno

La referencia completa está en **`.env.example`** (raíz del repo): base de datos, JWT, Redis, `FRONTEND_URL`, multi‑tenant (`LOGIN_REQUIRE_TENANT_SLUG`, `NEXT_PUBLIC_TENANT_SLUG`), fiscal (`FISCAL_JURISDICTION`), Stripe (`BILLING_PROVIDER`, `STRIPE_*`, `BILLING_ENFORCE_PAYMENT`, `TRIAL_ENFORCE_EXPIRED`), email (`NOTIFICATIONS_EMAIL_ENABLED`, SMTP), cron de recordatorios de trial (`CRON_SECRET`), y marca/UI del frontend.

Copia según entorno:

```bash
cp .env.example apps/backend/.env
cp .env.example apps/frontend/.env.local
```

Ajusta secretos y URLs antes de producción.

## Inicio rápido (Docker)

```bash
cd pos-melania

cp .env.example apps/backend/.env
cp .env.example apps/frontend/.env.local

docker-compose up -d

cd apps/backend
npm install
npm run migration:run
npm run seed
```

- **Frontend:** http://localhost:3000 (landing pública en `/`, panel en `/panel` tras login)
- **API:** prefijo `http://localhost:4000/api/v1`
- **Salud (sin prefijo API):** `GET http://localhost:4000/health`
- **OpenAPI / Swagger UI** (desarrollo o si `SWAGGER_ENABLED=true` en producción): `http://localhost:4000/api-docs` y `GET /api-docs.json`

## Desarrollo local (sin reconstruir imágenes)

En la raíz del monorepo (instala workspaces `apps/*` y `packages/*`):

```bash
npm install
```

Servicios en paralelo (requiere SQL Server y Redis accesibles según `.env`):

```bash
npm run dev:backend    # workspace apps/backend → ts-node-dev
npm run dev:frontend   # workspace apps/frontend → next dev
```

En `apps/backend`: `npm run migration:run`, `npm run seed`, `npm run migration:revert`, `npm run openapi:export` (export OpenAPI). En `apps/frontend`: `npm run lint`, `npm run build`, `npm start`.

Build de todo el monorepo desde la raíz: `npm run build`.

## Pruebas

| Ámbito | Comando | Notas |
| ------ | ------- | ----- |
| Unit tests (backend) | `cd apps/backend && npm test` | Sin levantar SQL; `NODE_ENV=test` en CI |
| Integración HTTP (backend) | `cd apps/backend && npm run test:integration` | Requiere **SQL Server + Redis**, migraciones y seed; guía PowerShell/Docker: `docs/operacion/INTEGRATION-TESTS-LOCAL.md`; contexto: `docs/PLAN-MEJORAS.md` |
| E2E (Playwright) | `cd apps/frontend` con `E2E_EMAIL` y `E2E_PASSWORD`; `npm run test:e2e` | Instalar navegadores: `npm run test:e2e:install`. Detalle: `apps/frontend/e2e/README.md` |
| E2E desde raíz | `npm run test:e2e` | Reenvía al workspace frontend |
| Verificación raíz | `npm run verify` | `verify:landing-plans` + `verify:docs-links` (enlaces internos en `docs/` y la landing). |

Staging / CI manual: `docs/operacion/E2E-STAGING.md` y workflow **E2E Playwright (manual dispatch)** (secretos `E2E_EMAIL`, `E2E_PASSWORD`, `PLAYWRIGHT_BASE_URL`).

## Coherencia landing / planes

Desde la raíz:

```bash
npm run verify:landing-plans
```

Comprueba que los límites numéricos de la landing coinciden con `apps/backend/src/saas/plan-limits.ts`. Va dentro de `npm run verify` en la raíz (junto con `verify:docs-links`) y en CI (`.github/workflows/ci.yml`).

## CI (GitHub Actions)

Archivo **`.github/workflows/ci.yml`** (ramas `main` y `develop`; eventos `push` y `pull_request`); **concurrency** por rama con `cancel-in-progress` para no acumular jobs obsoletos. Cierre operativo y evidencias: fila **Cierre del proyecto** en [Documentación destacada](#documentación-destacada); ante alertas en prod: `docs/operacion/OBSERVABILITY-RUNBOOK.md` §6.

1. **TypeScript + unit tests:** `npm ci` en raíz, `apps/backend` y `apps/frontend`; `tsc --noEmit` en backend y frontend; `npm run build` en frontend (`NEXT_PUBLIC_API_URL` de ejemplo); mismos pasos que `npm run verify` en la raíz (`verify:landing-plans` + `verify:docs-links`); `npm test` en backend.
2. **Integration tests:** solo en **push a `main`**; servicios SQL Server 2019 y Redis; migraciones + seed; `npm run test:integration` en backend (variables de test y `BILLING_PROVIDER=none`, `FISCAL_JURISDICTION=NONE` en el job).

**`.github/workflows/e2e-manual.yml`:** disparo manual (`workflow_dispatch`) para Playwright contra un frontend ya desplegado (mismos secretos que arriba).

## Multi‑tenant y contexto SaaS

- Cabeceras habituales: `Authorization`, `X-Tenant-Slug` (y para rol **plataforma**, `X-Tenant-Id` en operaciones de billing/admin según doc).
- Si `LOGIN_REQUIRE_TENANT_SLUG=true`, el login exige slug de organización (API y cliente alineados).
- **`GET /api/v1/saas/context`:** plan, uso (asientos, tiendas, artículos, ventas del mes, etc.) para el tenant del JWT.
- Panel operaciones plataforma (backend + UI): ver `docs/PLAN-MEJORAS.md` (Fase D / 6) y `docs/arquitectura/MULTI-TENANT.md`.

## Facturación (Stripe) y trial

Resumen: suscripciones por organización, webhooks que actualizan estado en BD, Customer Portal y Checkout documentados en **`docs/arquitectura/BILLING-SAAS.md`**. Middleware **`billingGuard`** (opt‑in con `BILLING_ENFORCE_PAYMENT` y `TRIAL_ENFORCE_EXPIRED`): puede responder **402** y el cliente redirige a **`/cuenta-suspendida`**. Emails de facturación y recordatorios de trial: opt‑in por variables; cron documentado en `.env.example` (`POST /api/v1/internal/cron/trial-reminders`).

Checklist producción Stripe: `docs/operacion/STRIPE-PROD-CHECKLIST.md`.

## Fiscal (plug‑in por jurisdicción)

Variable **`FISCAL_JURISDICTION`** (y columna en configuración que puede prevalecer). Proveedores en `apps/backend/src/fiscal/`. Documentación por jurisdicción: `docs/operacion/jurisdicciones/` y checklist DGII: `docs/operacion/FISCAL-DGII-CHECKLIST.md`.

## Páginas legales (frontend)

Rutas estáticas **`/terminos`** y **`/privacidad`** (Next.js): texto **orientativo** para entornos internos; conviene revisión legal antes de tráfico público masivo (lo indican las propias páginas). Enlaces desde landing, login y flujos de demo.

## Marca en pantalla (opcional)

En `apps/frontend/.env.local`: `NEXT_PUBLIC_APP_SHORT_NAME`, `NEXT_PUBLIC_APP_TAGLINE`, `NEXT_PUBLIC_APP_COPYRIGHT_ENTITY`, etiquetas de módulos, etc. Comentarios en `.env.example`.

## Credenciales por defecto (seed)

| Rol | Email | Contraseña |
| --- | ----- | ---------- |
| Admin | [admin@pos.com](mailto:admin@pos.com) | Admin123! |
| Cajero | [cajero@pos.com](mailto:cajero@pos.com) | Cajero123! |
| Soporte | [soporte@wilmaxdigital.com](mailto:soporte@wilmaxdigital.com) | Soporte123! |
| Plataforma | [plataforma@pos.com](mailto:plataforma@pos.com) | Plataforma123! |

Seed adicional de tenant: `apps/backend/src/seeds/new-tenant.seed.ts` (documentado en `docs/PLAN-MEJORAS.md`).

## Roles y permisos (resumen)

| Módulo | Admin | Cajero | Soporte |
| ------ | ----- | ------ | ------- |
| Panel / Dashboard | ✅ | ✅ | ✅ |
| Ventas (POS) | ✅ | ✅ | ❌ |
| Clientes | ✅ | ✅ | ✅ |
| Inventario | ✅ | 👁️ ver | ✅ |
| Gastos | ✅ | ❌ | ✅ |
| Reportes | ✅ | ❌ | ✅ |
| Empleados | ✅ | ❌ | ✅ |
| Configuración | ✅ | ❌ | ✅ |
| Comprobantes NCF | ✅ | ❌ | ✅ |
| Tiendas | ✅ | ❌ | ✅ |

## Documentación destacada

| Tema | Ruta |
| ---- | ---- |
| Multi‑tenant y aislamiento | `docs/arquitectura/MULTI-TENANT.md` |
| Billing Stripe | `docs/arquitectura/BILLING-SAAS.md` |
| Decisiones SaaS Fase 0 | `docs/arquitectura/SAAS-FASE-0-DECISIONES.md` |
| Despliegue SaaS | `docs/operacion/DEPLOY-SAAS.md` |
| Backup SQL Server | `docs/operacion/BACKUP-SQL-SERVER.md` |
| Observabilidad | `docs/operacion/OBSERVABILITY-RUNBOOK.md` |
| Tests integración backend (local) | `docs/operacion/INTEGRATION-TESTS-LOCAL.md` |
| Docker en desarrollo (SQL Server + Redis) | `docs/operacion/DOCKER-DEV.md` |
| Desarrollo local: incidencias (PowerShell, Docker, docs) | `docs/operacion/TROUBLESHOOTING-DEV.md` |
| OpenAPI (export local, no versionado) | `docs/operacion/OPENAPI.md` |
| Secretos (GitHub Actions + runtime) | `docs/operacion/SECRETS-RUNBOOK.md` |
| Checklist caja | `docs/operacion/CHECKLIST-CAJA.md` |
| Backlog issues SaaS | `docs/ISSUES-SAAS-BACKLOG.md` |
| Cierre del proyecto (go-live, evidencias) | `docs/PLAN-CIERRE-PROYECTO.md` |
| Visión de producto (alto nivel) | `VISION-PRODUCTO.md` |
| Paquete compartido (`@pos/shared`) | `packages/shared/README.md` |
| Checker enlaces en docs / landing (`verify:docs-links`) | `scripts/check-docs-links.mjs` |
| Pin de versión Node.js (local / nvm) | `.nvmrc` |

## Docker (utilidades en raíz)

```bash
npm run docker:up    # docker-compose up -d
npm run docker:down
```

Para composición orientada a producción y buenas prácticas de servicios, ver `docker-compose.production.yml` y `docs/operacion/DEPLOY-SAAS.md`.
