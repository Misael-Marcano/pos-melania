# Plan de mejoras — POS (retail)

Roadmap derivado del análisis del producto. Se va completando **por fases**; el estado se actualiza aquí.

### Cierre / DX

- Cierre y go-live (workstreams, evidencias): [`docs/PLAN-CIERRE-PROYECTO.md`](PLAN-CIERRE-PROYECTO.md)
- Guía de contribución y checklist de PR: [`CONTRIBUTING.md`](../CONTRIBUTING.md)
- Divulgación responsable y flujo de issues: [`SECURITY.md`](../SECURITY.md) · Dependabot [`.github/dependabot.yml`](../.github/dependabot.yml) · plantillas [`.github/ISSUE_TEMPLATE/config.yml`](../.github/ISSUE_TEMPLATE/config.yml)
- Enlaces internos en Markdown bajo `docs/`: desde la raíz `npm run verify:docs-links`; en CI, un paso equivalente para no mergear enlaces rotos.
- Entorno dev (shell, Docker, verificación de enlaces en docs y `verify`): [`operacion/TROUBLESHOOTING-DEV.md`](operacion/TROUBLESHOOTING-DEV.md)

## Leyenda

- Pendiente  
- Hecho o iniciado en el repo

---

## Fase 1 — Documentación operativa y auditoría ampliada

- Plan maestro (`docs/PLAN-MEJORAS.md`)
- Checklist de reconciliación de caja (`docs/operacion/CHECKLIST-CAJA.md`)
- Runbook de **backup** SQL Server (`docs/operacion/BACKUP-SQL-SERVER.md`) — plantilla operativa
- Auditoría en **empleados** (crear / actualizar / desactivar)
- Auditoría en **tiendas** (crear / actualizar / desactivar)

## Fase 2 — Pruebas automatizadas (crítico)

- **E2E frontend (Playwright):** `apps/frontend/e2e/smoke.spec.ts`, scripts `test:e2e` / `test:e2e:ui`, doc `apps/frontend/e2e/README.md`
- Configuración **Jest** + prueba smoke (`apps/backend`)
- Test de integración HTTP mínimo (`GET /health`, `X-Request-Id`, 404 JSON) — sin BD
- Tests de integración API — `npm run test:integration` en `apps/backend` (auth, perfil, listado ventas, detalle + auditoría recibo si hay datos, `**GET /saas/context`**; requiere **SQL Server + Redis** y seed `admin@pos.com`)
- Tests focalizados: cierre de caja / `resumenCaja` — mismo `npm run test:integration` (`describe` «caja + resumenCaja»)
- Integración: **límites de plan** (`starter` → 403 en alta de usuario / sucursal) — `src/__tests__/integration/enforce-plan.integration.test.ts`
- Integración multi-tenant: **ventas** (detalle ajeno → 404), **reportes** (cierre ajeno), **inventario** (detalle ajeno → 404), **compras** (detalle ajeno → 403), **devoluciones** (detalle ajeno → 404) — `*-tenant-isolation.integration.test.ts`; helper `helpers/other-tenant-auth.ts`

## Fase 3 — Observabilidad y endurecimiento

- **Request ID** por petición (`X-Request-Id` + logs Morgan)
- **Rate limit** dedicado: `/api/v1/reportes` (90/min) y PDF cierre `/ventas/caja/:id/pdf` (40/min), además del global 300/min
- Índice compuesto `**ventas(cajaAperturaId, fecha)`** (migración `1700000000022`)

## Fase 4 — Producto / UX

- Mensajes claros ante **fallo de red / timeout** en el cliente API (`api.client.ts`)
- Recibo: **logotipo** (`logotipoUrl`) y **símbolo de moneda** (`simboloMoneda`) desde configuración

## Fase 5 — Cumplimiento fiscal (según normativa vigente)

- Checklist operativo **NCF / DGII** (`docs/operacion/FISCAL-DGII-CHECKLIST.md`)
- Auditoría en **comprobantes** (crear / actualizar series fiscales)
- Revisión en campo del checklist y normativa vigente al desplegar
- Auditoría de **impresión / reimpresión de recibo** (`POST /ventas/:id/auditoria-recibo` + hook en `Receipt`)

---

## Visión futura (multi‑negocio / otros puntos de venta)

- Roadmap estratégico: `**docs/PLAN-EVOLUCION-POS-GENERICO.md`** (neutralizar marca, producto genérico, fiscal plug‑in, multi‑tenant opcional).
- **Fase A (marca neutra)**: `app-brand` + `.env.example`; seed demo genérico; README / OpenAPI neutros; **landing page** pública (`app/page.tsx` — planes, módulos, FAQ, CTA → `/login`; dashboard movido a `/panel`).
- **Fase B (etiquetas / módulo recetas-BOM)**: `ui-labels` + `NEXT_PUBLIC_FEATURE_RECETAS` / `NEXT_PUBLIC_LABEL_RECETAS` — ver `docs/PLAN-EVOLUCION-POS-GENERICO.md`.
- **Fase B (unidad por artículo)**: columna `unidadMedida` + `format-articulo` en POS/recibo; migración `1700000000023`.
- **Fase B (reportes)**: `NEXT_PUBLIC_LABEL_REPORTES` / `NEXT_PUBLIC_LABEL_REPORTES_TAB_`* en `apps/frontend/src/lib/ui-labels.ts` — título y pestañas del módulo `/reportes`.
- **Fase C (fiscal)**: `FISCAL_JURISDICTION` + `configuracion.fiscalJurisdiccion` (prioridad BD) + `FiscalProvider` en `apps/backend/src/fiscal/` — DGII/RD vía `DgiiRdFiscalProvider`; docs por jurisdicción: `docs/operacion/jurisdicciones/`; plan maestro: `docs/PLAN-EVOLUCION-POS-GENERICO.md`.
- **Fase D (multi-tenant)**: cimientos `0025`–`0031` + aislamiento por tenant + rol `plataforma` + `GET /saas/context` (uso: seats, tiendasActivas, articulosActivos, ventasMesActual) — detalle en `docs/arquitectura/MULTI-TENANT.md`. **Planes definitivos**: `starter` ($29, 3u/1s/500art), `standard` ($79, 15u/5s/5000art), `enterprise` ($199, sin límite); **feature flags** en `plan-limits.ts` — módulos `kits/cotizaciones/promociones/tarjetasRegalo/recetas/compras` bloqueados en starter; sidebar con candado. Tests: `enforce-plan`, `enforce-features`, `*tenant-isolation`*. **Stripe completo**: checkout, portal, webhook, `billingGuard` (opt-in), auditoría `stripe_audit_logs` (migración `0032`). **Provisioning guiado** (`OnboardingBanner`). Docs: `docs/arquitectura/BILLING-SAAS.md`.

## Fase 6 — Operación SaaS

- **Email notifications** — *hecho:* `notifications/email.service.ts` (nodemailer, opt-in `NOTIFICATIONS_EMAIL_ENABLED=true`); templates `payment_failed`, `subscription_canceled`, `subscription_activated`; trial reminders + cron `POST /api/v1/internal/cron/trial-reminders` (`CRON_SECRET`); hooks en `billing.webhook.ts` incl. `invoice.payment_failed` y `past_due` vía `subscription.updated`.
- **Panel admin plataforma** — *hecho / iterar:* `GET /api/v1/tenants/panel` + UI `/plataforma` (KPIs, tabla, barras de uso, chips billing, búsqueda y filtros por facturación/plan). Mejoras UX según feedback soporte.
- **CI pipeline** — *hecho:* `.github/workflows/ci.yml` (typecheck, unit, build frontend, script `verify-plan-limits-landing.mjs`); integración en push a `main`; E2E disparo manual `e2e-manual.yml` + `docs/operacion/E2E-STAGING.md`.
- **Docker Compose producción**: `docker-compose.production.yml` — sin credenciales hardcodeadas, healthchecks en todos los servicios, Redis con AOF, recursos limitados.
- **Seed de nuevo tenant** — *hecho:* `apps/backend/src/seeds/new-tenant.seed.ts` (+ `TRIAL_DAYS` opcional).
- **Runbook de despliegue** — *hecho / mantener:* `docs/operacion/DEPLOY-SAAS.md`; evidencia operativa en `docs/operacion/evidence/`; observabilidad mínima en `docs/operacion/OBSERVABILITY-RUNBOOK.md`.

## Plan de implementación SaaS multi-tenant

Roadmap ejecutable (fases P0–P2: decisiones, aislamiento, monetización, crecimiento, operación): `docs/PLAN-IMPLEMENTACION-SAAS-MULTI-TENANT.md`.

Decisiones de **Fase 0** (registro, trial, dominios, impago): `docs/arquitectura/SAAS-FASE-0-DECISIONES.md` · backlog de issues: `docs/ISSUES-SAAS-BACKLOG.md`.

### Avances recientes (2026-05)

- [x] Tests unitarios SaaS: límites de plan (`apps/backend/src/__tests__/plan-limits.test.ts`) y trial puro (`trial-pure.test.ts`, `saas-trial.test.ts` y relacionados en el mismo directorio).
- [x] Tests y helpers NCF / fiscal (`ncf-pure.test.ts`, `src/__tests__/fiscal/resolve-fiscal-provider.test.ts`).
- [x] Mejoras de accesibilidad (a11y) en login, solicitar demo y cuenta suspendida (`apps/frontend`).
- [x] Verificación de enlaces internos en documentación en CI (`npm run verify:docs-links` vía `scripts/check-docs-links.mjs`, paso en `.github/workflows/ci.yml`).
- [x] Tests de acceso por tienda (`apps/backend/src/__tests__/tienda-access.test.ts`).
- [x] Mejoras de accesibilidad (a11y) en selección de organización (`apps/frontend/src/app/select-organizacion/page.tsx`).

## Notas

- **Integración DB**: paso a paso (Docker, variables, PowerShell): `docs/operacion/INTEGRATION-TESTS-LOCAL.md`. Resumen: Docker Compose (`sqlserver`, `redis`), `.env` en `apps/backend` (`DB_HOST=localhost`, `DB_PASS` alineada al `SA_PASSWORD` del compose), migraciones + `npm run seed` antes de `npm run test:integration` (incluye flujo caja: abrir → `resumenCaja` → cerrar → `resumenCaja`).
- La auditoría de **caja**, **PDF de cierre**, **catálogo de cajas** y **configuración** ya está implementada en el backend.
- **Rate limit** en login y API global ya existía; se añadieron límites específicos a reportes y PDF de cierre.