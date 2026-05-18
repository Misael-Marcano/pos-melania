# Plan de mejoras — POS (retail)

Roadmap derivado del análisis del producto. Se va completando **por fases**; el estado se actualiza aquí.

### Cierre / DX

- Cierre y go-live (workstreams, evidencias): [`docs/PLAN-CIERRE-PROYECTO.md`](PLAN-CIERRE-PROYECTO.md)
- Guía de contribución y checklist de PR: [`CONTRIBUTING.md`](../CONTRIBUTING.md)
- Divulgación responsable y flujo de issues: [`SECURITY.md`](../SECURITY.md) · Dependabot [`.github/dependabot.yml`](../.github/dependabot.yml) · plantillas [`.github/ISSUE_TEMPLATE/config.yml`](../.github/ISSUE_TEMPLATE/config.yml)
- Enlaces internos en Markdown bajo `docs/`: desde la raíz `npm run verify:docs-links`; en CI, un paso equivalente para no mergear enlaces rotos.
- Entorno dev (shell, Docker, verificación de enlaces en docs y `verify`): [`operacion/TROUBLESHOOTING-DEV.md`](operacion/TROUBLESHOOTING-DEV.md)

## Leyenda

- `[ ]` Pendiente (código, evidencia o tarea operativa por ejecutar)
- `[x]` **Hecho en el repositorio** — código o documentación versionada verificada en el monorepo

### Sincronización código ↔ docs (revisión 2026-05)

Las **Fases 1–5** siguientes tienen `[x]` donde la capacidad está **implementada** en backend/frontend/migraciones/CI. Los checklists en `docs/operacion/*-CHECKLIST.md` siguen siendo **guías**; el cumplimiento en campo o ante DGII es **operación / normativa**, no una tarea de código en el repo. El **go-live humano** (Stripe live, backups, legal, alertas) permanece en [`docs/PLAN-CIERRE-PROYECTO.md`](PLAN-CIERRE-PROYECTO.md).

---

## Fase 1 — Documentación operativa y auditoría ampliada

- [x] Plan maestro (`docs/PLAN-MEJORAS.md`)
- [x] Checklist de reconciliación de caja (`docs/operacion/CHECKLIST-CAJA.md`)
- [x] Runbook de **backup** SQL Server (`docs/operacion/BACKUP-SQL-SERVER.md`) — plantilla operativa *(drill real = operación; ver plan de cierre WS3)*
- [x] Auditoría en **empleados** (crear / actualizar / desactivar) — `apps/backend/src/modules/empleados/empleados.controller.ts` (`registrarAudit`)
- [x] Auditoría en **tiendas** (crear / actualizar / desactivar) — `apps/backend/src/modules/tiendas/tiendas.controller.ts` (`registrarAudit`)

## Fase 2 — Pruebas automatizadas (crítico)

- [x] **E2E frontend (Playwright):** `apps/frontend/e2e/smoke.spec.ts`, scripts `test:e2e` / `test:e2e:ui`, doc `apps/frontend/e2e/README.md`
- [x] Configuración **Jest** + prueba smoke (`apps/backend`)
- [x] Test de integración HTTP mínimo (`GET /health`, `X-Request-Id`, 404 JSON) — sin BD — `apps/backend/src/__tests__/app.integration.test.ts`
- [x] Tests de integración API — `npm run test:integration` en `apps/backend` (auth, perfil, listado ventas, detalle + auditoría recibo si hay datos, `GET /saas/context`; requiere **SQL Server + Redis** y seed `admin@pos.com`)
- [x] Tests focalizados: cierre de caja / `resumenCaja` — mismo `npm run test:integration` (`describe` «caja + resumenCaja»)
- [x] Integración: **límites de plan** (`starter` → 403 en alta de usuario / sucursal) — `src/__tests__/integration/enforce-plan.integration.test.ts`
- [x] Integración multi-tenant: **ventas** (detalle ajeno → 404), **reportes** (cierre ajeno), **inventario** (detalle ajeno → 404), **compras** (detalle ajeno → 403), **devoluciones** (detalle ajeno → 404), **clientes/gastos/empleados/kits/proveedores**, **promociones** y **tarjetas-regalo** (GET ajeno → 403), **cotizaciones** y **recetas** (GET ajeno → 404), **comprobantes** (GET / + PUT ajeno), **tiendas** (GET / + PUT ajeno), **cajas** (GET ajeno → 403), **auditoría** (GET / sin filas ajenas), **saas** (`GET /context` + `X-Tenant-Id` ajeno → 403), **billing** (`GET /status` acotado; POST checkout/portal N/A sin mock Stripe — ver inventario), **tenants** (`GET /` y `/panel` → 403 sin rol `plataforma`) — `*-tenant-isolation.integration.test.ts`; helper `helpers/other-tenant-auth.ts`

## Fase 3 — Observabilidad y endurecimiento

- [x] **Request ID** por petición (`X-Request-Id` + logs Morgan) — `request-id.middleware.ts`, Morgan `:req-id`, CORS `exposedHeaders`
- [x] **Rate limit** dedicado: `/api/v1/reportes` (90/min) y PDF cierre `/ventas/caja/:id/pdf` (40/min), además del global 300/min — `apps/backend/src/app.ts`
- [x] Índice compuesto **ventas(cajaAperturaId, fecha)** — migración `1700000000022-VentasIndexCajaFecha.ts`

## Fase 4 — Producto / UX

- [x] Mensajes claros ante **fallo de red / timeout** en el cliente API — `apps/frontend/src/services/api.client.ts` + `apps/frontend/src/lib/api-network-error.ts`
- [x] Recibo: **logotipo** (`logotipoUrl`) y **símbolo de moneda** (`simboloMoneda`) desde configuración — `apps/frontend/src/components/ventas/Receipt.tsx`

## Fase 5 — Cumplimiento fiscal (según normativa vigente)

- [x] Checklist operativo **NCF / DGII** (`docs/operacion/FISCAL-DGII-CHECKLIST.md`) — *plantilla; revisión en campo no es código*
- [x] Auditoría en **comprobantes** (crear / actualizar series fiscales) — `apps/backend/src/modules/comprobantes/comprobantes.controller.ts` (`registrarAudit`)
- [ ] **Solo operación / normativa:** revisión en campo del checklist y normativa vigente al desplegar *(fuera del alcance del código en este repo)*
- [x] Auditoría de **impresión / reimpresión de recibo** — `POST /ventas/:id/auditoria-recibo` + `Receipt` (`apps/backend` + `apps/frontend`)

---

## Fase 6 — Operación SaaS

- [x] **Email notifications** — `notifications/email.service.ts` (nodemailer, opt-in `NOTIFICATIONS_EMAIL_ENABLED=true`); templates `payment_failed`, `subscription_canceled`, `subscription_activated`; trial reminders + cron `POST /api/v1/internal/cron/trial-reminders` (`CRON_SECRET`); hooks en `billing.webhook.ts` incl. `invoice.payment_failed` y `past_due` vía `subscription.updated`.
- [x] **Panel admin plataforma** — `GET /api/v1/tenants/panel` + UI `/plataforma` (KPIs, tabla, barras de uso, chips billing, búsqueda y filtros). *Mejoras UX por feedback = trabajo iterativo, no bloque de código base.*
- [x] **CI pipeline** — `.github/workflows/ci.yml` (typecheck, unit, build frontend, `verify-plan-limits-landing.mjs`); integración en push a `main`; E2E disparo manual `e2e-manual.yml` + `docs/operacion/E2E-STAGING.md`.
- [x] **Docker Compose producción**: `docker-compose.production.yml` — sin credenciales hardcodeadas, healthchecks en todos los servicios, Redis con AOF, recursos limitados.
- [x] **Seed de nuevo tenant** — `apps/backend/src/seeds/new-tenant.seed.ts` (+ `TRIAL_DAYS` opcional).
- [x] **Runbook de despliegue** — `docs/operacion/DEPLOY-SAAS.md`; evidencia operativa en `docs/operacion/evidence/`; observabilidad mínima en `docs/operacion/OBSERVABILITY-RUNBOOK.md`. *Mantener al cambiar infra.*

---

## Fase 7 — Módulo de reportes (robustez)

Backlog derivado de la revisión del módulo `/reportes` (2026-05). Código principal: `apps/backend/src/modules/reportes/`, `apps/frontend/src/app/(dashboard)/reportes/page.tsx`, `apps/frontend/src/services/reportes.service.ts`. Orden sugerido de implementación: **P0 → P1 → P2 → P3**.

### Base ya en el repositorio

- [x] Pestañas Ventas, P&L, Inventario, Clientes, Por sucursal, DGII (606/607) + presets de fechas y export CSV en cliente.
- [x] Etiquetas configurables — `NEXT_PUBLIC_LABEL_REPORTES` / tabs en `apps/frontend/src/lib/ui-labels.ts`.
- [x] Aislamiento multi-tenant en API — `reportes-tenant-isolation.integration.test.ts`.
- [x] Rate limit `/api/v1/reportes` (90/min) — `apps/backend/src/app.ts`.
- [x] Índice `ventas(cajaAperturaId, fecha)` — migración `1700000000022-VentasIndexCajaFecha.ts`.
- [x] Accesibilidad: landmark `<main>` en `reportes/page.tsx`.
- [x] Endpoints API de auditoría (sin UI aún): `GET /reportes/ventas-por-usuario`, `GET /reportes/ventas-por-caja`, `GET /reportes/cierre-caja/:id` — `reportes.routes.ts`.

### P0 — Integridad de datos (prioridad inmediata)

- [x] **Filtro único de ventas activas** — `VENTA_ACTIVA_SQL` en `reportes-query.ts`; aplicado en todas las agregaciones de ventas.
- [x] **`topProductos`** — excluye ventas anuladas vía el mismo filtro en el JOIN con `ventas`.
- [x] **Validación de query** — `dto/reportes.dto.ts` (Zod): rango fechas, máx. 366 días, `periodo` DGII; tests en `reportes-query.test.ts`.
- [x] **Pagos mixtos en reportes** — `aggregateVentasPorMetodo()` en P&L y resumen por sucursal.

### P1 — Producto y operación

- [x] **Filtro de sucursal global** — selector en `DateFilter`; `tiendaId` en API (`ventasPorDia`, `ganancias`, tops, etc.).
- [x] **UI auditoría** — pestaña Auditoría: ventas por cajero y por caja (`useVentasPorUsuario` / `useVentasPorCaja`).
- [x] **Inventario valorizado** — paginación server-side (`page`, `limit`, `q`); totales/categorías globales; export `/inventario-valorizado/export` (hasta 15 000 filas).
- [x] **Errores de red en UI** — `QueryError` + reintentar en Ventas, P&L, Clientes y Auditoría (sucursal/DGII ya lo tenían).
- [x] **Refactor frontend** — `reportes/page.tsx` (~90 líneas) importa `reportes-shared.tsx`, `DateFilter.tsx` y `components/reportes/Tab*.tsx` (Ventas, P&L, Inventario, Clientes, Auditoría, Por sucursal, DGII).

### P2 — Fiscal y pruebas

- [x] **DGII 606/607 — vista previa** — `GET /dgii-607/preview` y `/dgii-606/preview`; UI con líneas, totales, ITBIS estimado y alertas.
- [x] **DGII alineado a fiscal** — `FiscalProvider.splitItbisIncluido` + `fiscal-itbis.ts`; reportes 606/607 y previews usan jurisdicción/`tasaImpuesto1` (18% RD por defecto); checklist `docs/operacion/FISCAL-DGII-CHECKLIST.md`.
- [x] **Tests unitarios reportes** — `computeGananciasResumen` (márgenes, devoluciones), `fiscal-itbis` / provider ITBIS; `dgiiPeriodoBounds`, schemas en `reportes-query.test.ts`.
- [x] **Documentar supuestos P&L en UI** — nota informativa en pestaña P&L (`reportes/page.tsx`).

### P3 — Valor ampliado (cuando P0–P2 estén estables)

- [x] Comparar períodos (mes actual vs anterior) en ventas y P&L — `GET /reportes/comparar-periodos` (MTD alineado); banner en `TabVentas` y `TabPnL`.
- [x] Reporte stock bajo / sin movimiento (umbrales configurables) — `GET /reportes/inventario-alertas` (`umbral` default 5, `diasSinMovimiento` default 90); UI en pestaña Inventario (`TabInventario.tsx`).
- [x] Cartera y crédito (antigüedad de saldos, más allá del top clientes) — `GET /reportes/cartera` (tramos 0–30 / 31–60 / 61–90 / 90+ días según venta a crédito más antigua); UI en pestaña Clientes (`TabClientes.tsx`); helpers `carteraBucketId` / `aggregateCarteraBuckets` en `reportes-query.ts`.
- [x] Conciliación caja (ventas de sesión vs monto de cierre; cruce con `/ventas/cierres-caja`) — `GET /reportes/conciliacion-caja` (+ `/:id`); historial enriquecido; UI en cierres y pestaña Por sucursal.
- [x] Reportes de promociones, cotizaciones (conversión) y compras vs ventas — `GET /reportes/operaciones-comerciales`; pestaña Operaciones (`TabOperaciones.tsx`).
- [x] Export PDF además de CSV — `GET /reportes/ventas-resumen/pdf` (pdfkit); botón en pestaña Ventas.
- [ ] Envío programado por email (enterprise). *Diferido — alcance enterprise.*
- [ ] Caché o vistas materializadas para rangos largos (año completo). *Diferido — optimización pesada.*
- [x] Rol **contador** (solo lectura reportes) — `canReportes` en `reportes.routes.ts`; rol en `@pos/shared`, empleados y sidebar.
- [x] Zona horaria explícita en agregaciones por día — `sqlFechaDia` / `REPORTES_TIMEZONE` (default `America/Santo_Domingo`) en `reportes-timezone.ts` y queries de reportes.

### Notas de implementación (Fase 7)

- Primer PR recomendado: **P0 filtro anuladas** + **P1 filtro sucursal** + **P1 UI ventas por usuario/caja** (corrige números y desbloquea auditoría sin tocar fiscal).
- Tras cambios en queries, ampliar `reportes-tenant-isolation.integration.test.ts` si se añaden params nuevos.
- Referencia operativa fiscal: [`docs/operacion/FISCAL-DGII-CHECKLIST.md`](operacion/FISCAL-DGII-CHECKLIST.md) (ítem conciliación reportes vs caja).

---

## Fase 8 — Módulo de configuración

Backlog derivado de la revisión de `/configuracion` (2026-05). Código: `apps/backend/src/modules/configuracion/`, `apps/frontend/src/app/(dashboard)/configuracion/`, entidad `configuracion` (una fila por tenant). Referencia fiscal: [`docs/operacion/FISCAL-DGII-CHECKLIST.md`](operacion/FISCAL-DGII-CHECKLIST.md).

### Estado actual (breve)

- API `GET/PUT /api/v1/configuracion`: lectura todos los roles (`canAll`), escritura solo **admin**; aislamiento por `tenantId` + validación de `tiendaId`/`cajaId` del mismo tenant.
- Sin DTO previo: `Object.assign` aceptaba campos arbitrarios del body (riesgo `tenant`, metadatos).
- UI monolítica (~700 líneas), sin validación de RNC/ITBIS en cliente ni servidor, sin indicador de completitud ni aviso de cambios sin guardar.
- `tasaImpuesto1` en BD alimenta reportes DGII y `FiscalProvider`; `zonaHoraria` en BD tiene prioridad sobre `REPORTES_TIMEZONE` (env) en agregaciones diarias.

### P0 — Integridad y seguridad

- [x] **Zod en PUT** — `dto/configuracion.dto.ts`: nombre obligatorio, RNC 9/11 dígitos, tasas 0–100, URLs `http(s)://`, `strict()` sin `tenantId`/`id`.
- [x] **Whitelist en servicio** — solo campos del DTO; relaciones `tienda`/`caja` validadas con `assertTenantForTienda`.
- [x] **Defaults al crear fila** — ITBIS 18 %, `comprobanteDefecto` B02, `preciosIncluyenImpuesto`.
- [x] **Utilidades compartidas** — `packages/shared/validation/configuracion.ts` (RNC, completitud, constantes).
- [x] **Tests unitarios DTO** — `configuracion.dto.test.ts`.

### P1 — Producto y UX

- [x] **Pestañas** — Empresa, Fiscal e impuestos, POS / ventas, Plan y sistema.
- [x] **Banner de completitud** — % y enlaces a pendientes (RNC, ITBIS, sucursal, etc.).
- [x] **Validación en cliente** antes de guardar + mensajes de error del API.
- [x] **Cambios sin guardar** — aviso en pantalla y `beforeunload`.
- [x] **Error de carga** — `QueryError` + reintentar.
- [x] **Ayuda contextual** — RNC/recibos/DGII, `tasaImpuesto1` alineada a reportes, jurisdicción fiscal.
- [x] **POS separado de NCF** — sucursal/caja en pestaña POS; fiscal en pestaña propia.
- [x] **Rol contador / solo lectura** en configuración — GET + `canConfigRead`; PUT 403; UI en solo lectura y enlace en sidebar.

### P2 — Valor ampliado

- [x] **`zonaHoraria` en BD** por tenant — migración `1700000000036`, DTO/UI, `resolveReportesTimezone` / `fetchTenantReportesTimezone` en reportes.
- [x] **Indicador fiscal** — `GET /configuracion/fiscal-status` (`ok`, `jurisdiccion`, `rncConfigured`, `tasaItbis`) sin API externa; banner en pestaña Fiscal.
- [ ] **Subida de logotipo** (storage) en lugar de solo URL.
- [ ] **Notificaciones** — email trial/facturación enlazadas a datos de empresa en config.
- [ ] **E2E Playwright** — flujo guardar configuración como admin.
- [x] **Ampliar test integración** — `configuracion-access.integration.test.ts`: RNC inválido → 400; cajero PUT → 403; fiscal-status → 200.

### Recomendaciones (buenas prácticas)

| Área | Recomendación |
|------|----------------|
| Validación | Mantener reglas en `packages/shared/validation` + Zod en backend; no duplicar lógica en el cliente. |
| UX | Guardar único al pie; pestañas no pierden estado; completitud orienta onboarding sin bloquear guardado parcial. |
| Seguridad | Nunca aceptar `tenantId`/`tenant` en body; auditoría ya registra UPDATE completo. |
| Fiscal | Con `fiscalJurisdiccion=DO`, exigir RNC válido y `tasaImpuesto1` > 0 antes de producción; revisar checklist DGII. |
| Multi-tenant | Una fila por org; GET de otra org no devuelve `id` ajeno (`configuracion-tenant-isolation.integration.test.ts`). |

---

## Visión futura (multi‑negocio / otros puntos de venta)

Las viñetas siguientes son el **mapa estratégico** del POS genérico; la **implementación base** de las fases A–D del documento enlazado está en el repositorio. Sigue abierta la **evolución por país** (nuevo `FiscalProvider`) y las **decisiones de despliegue** de §2 en [`docs/PLAN-EVOLUCION-POS-GENERICO.md`](PLAN-EVOLUCION-POS-GENERICO.md).

- Roadmap estratégico: [`docs/PLAN-EVOLUCION-POS-GENERICO.md`](PLAN-EVOLUCION-POS-GENERICO.md) (neutralizar marca, producto genérico, fiscal plug‑in, multi‑tenant opcional).
- **Fase A (marca neutra)**: `app-brand` + `.env.example`; seed demo genérico; README / OpenAPI neutros; **landing page** pública (`app/page.tsx` — planes, módulos, FAQ, CTA → `/login`; dashboard movido a `/panel`).
- **Fase B (etiquetas / módulo recetas-BOM)**: `ui-labels` + `NEXT_PUBLIC_FEATURE_RECETAS` / `NEXT_PUBLIC_LABEL_RECETAS` — ver `docs/PLAN-EVOLUCION-POS-GENERICO.md`.
- **Fase B (unidad por artículo)**: columna `unidadMedida` + `format-articulo` en POS/recibo; migración `1700000000023`.
- **Fase B (reportes)**: `NEXT_PUBLIC_LABEL_REPORTES` / `NEXT_PUBLIC_LABEL_REPORTES_TAB_`* en `apps/frontend/src/lib/ui-labels.ts` — título y pestañas del módulo `/reportes`.
- **Fase C (fiscal)**: `FISCAL_JURISDICTION` + `configuracion.fiscalJurisdiccion` (prioridad BD) + `FiscalProvider` en `apps/backend/src/fiscal/` — DGII/RD vía `DgiiRdFiscalProvider`; docs por jurisdicción: `docs/operacion/jurisdicciones/`; plan maestro: `docs/PLAN-EVOLUCION-POS-GENERICO.md`.
- **Fase D (multi-tenant)**: cimientos `0025`–`0031` + aislamiento por tenant + rol `plataforma` + `GET /saas/context` (uso: seats, tiendasActivas, articulosActivos, ventasMesActual) — detalle en `docs/arquitectura/MULTI-TENANT.md`. **Planes definitivos**: `starter` ($29, 3u/1s/500art), `standard` ($79, 15u/5s/5000art), `enterprise` ($199, sin límite); **feature flags** en `plan-limits.ts` — módulos `kits/cotizaciones/promociones/tarjetasRegalo/recetas/compras` bloqueados en starter; sidebar con candado. Tests: `enforce-plan`, `enforce-features`, `*tenant-isolation`*. **Stripe completo**: checkout, portal, webhook, `billingGuard` (opt-in), auditoría `stripe_audit_logs` (migración `0032`). **Provisioning guiado** (`OnboardingBanner`). Docs: `docs/arquitectura/BILLING-SAAS.md`.

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
- [x] Panel autenticado: contenedor semántico `<main>` en el layout del dashboard (`apps/frontend`, rutas bajo `/panel`).
- [x] Tests fiscales ampliados en backend (más cobertura en `apps/backend/src/__tests__/fiscal/` y escenarios NCF asociados).
- [x] E2E: nota de smoke y ejecución mínima documentada en `apps/frontend/e2e/README.md`.
- [x] Tests `AppError` incluyen caso **5xx** (`apps/backend/src/__tests__/app-error.test.ts`).
- [x] Mejoras de accesibilidad (a11y) en auditoría: landmark `<main>` (`apps/frontend/src/app/(dashboard)/auditoria/page.tsx`).
- [x] Mejoras de accesibilidad (a11y) en inventario: landmark `<main>` (`apps/frontend/src/app/(dashboard)/inventario/page.tsx`).
- [x] Mejoras de accesibilidad (a11y) en ventas: landmark `<main>` (`apps/frontend/src/app/(dashboard)/ventas/page.tsx`).
- [x] Mejoras de accesibilidad (a11y) en reportes: landmark `<main>` (`apps/frontend/src/app/(dashboard)/reportes/page.tsx`).
- [x] Mejoras de accesibilidad (a11y) en clientes: landmark `<main>` (`apps/frontend/src/app/(dashboard)/clientes/page.tsx`).
- [x] Mejoras de accesibilidad (a11y) en compras: landmark `<main>` (`apps/frontend/src/app/(dashboard)/compras/page.tsx`).
- [x] Mejoras de accesibilidad (a11y) en proveedores: landmark `<main>` (`apps/frontend/src/app/(dashboard)/proveedores/page.tsx`).
- [x] Mejoras de accesibilidad (a11y) en gastos: landmark `<main>` (`apps/frontend/src/app/(dashboard)/gastos/page.tsx`).
- [x] Mejoras de accesibilidad (a11y) en promociones: landmark `<main>` (`apps/frontend/src/app/(dashboard)/promociones/page.tsx`).
- [x] Mejoras de accesibilidad (a11y) en cotizaciones: landmark `<main>` (`apps/frontend/src/app/(dashboard)/cotizaciones/page.tsx`).
- [x] Mejoras de accesibilidad (a11y) en devoluciones: landmark `<main>` (`apps/frontend/src/app/(dashboard)/devoluciones/page.tsx`).
- [x] Mejoras de accesibilidad (a11y) en kits: landmark `<main>` (`apps/frontend/src/app/(dashboard)/kits/page.tsx`).
- [x] Mejoras de accesibilidad (a11y) en tarjetas regalo: landmark `<main>` (`apps/frontend/src/app/(dashboard)/tarjeta-de-regalo/page.tsx`).
- [x] Mejoras de accesibilidad (a11y) en empleados: landmark `<main>` (`apps/frontend/src/app/(dashboard)/empleados/page.tsx`).
- [x] Mejoras de accesibilidad (a11y) en recetas: landmark `<main>` (`apps/frontend/src/app/(dashboard)/recetas/page.tsx`).
- [x] Mejoras de accesibilidad (a11y) en comprobantes: landmark `<main>` (`apps/frontend/src/app/(dashboard)/comprobante/page.tsx`).
- [x] Mejoras de accesibilidad (a11y) en cajas: landmark `<main>` (`apps/frontend/src/app/(dashboard)/cajas/page.tsx`).
- [x] Mejoras de accesibilidad (a11y) en tiendas: landmark `<main>` (`apps/frontend/src/app/(dashboard)/tiendas/page.tsx`).
- [x] Mejoras de accesibilidad (a11y): landmark `<main>` en `/configuracion`, `/inventario/buscar`, `/ventas/cierres-caja` y `/ventas/historial` (páginas bajo `apps/frontend/src/app/(dashboard)/`).
- [x] **Ventas:** edición `PUT /ventas/:id` con campos de **delivery** y total coherente con entrega (backend DTO/servicio); **VentaModal** — métodos de pago en rejilla y UI de delivery más clara. **Login:** landmark `<main>`, `h1` sr-only y `h2` visible en `apps/frontend/src/app/(auth)/login/page.tsx`.
- [x] **Ventas (fix backend):** edición completa de venta no rompe SQL Server por `venta_detalles.ventaId NULL`. `fullUpdate` en `apps/backend/src/modules/ventas/ventas.service.ts` ahora invoca `syncFullUpdateVentaDetalleGraph` (`apps/backend/src/modules/ventas/ventas-full-update-detail-graph.ts`) para reatachar los `VentaDetalle` recién persistidos al `Venta` cargado antes del `manager.save`, de modo que el cascade de TypeORM no emite `UPDATE venta_detalles SET ventaId = NULL` sobre las filas borradas.
- [x] **Ventas (JSON serializable):** `stripVentaDetalleParentRef` en el mismo módulo (`ventas-full-update-detail-graph.ts`) elimina `detalles[].venta` antes de serializar; `ventas.service.ts` lo invoca al cerrar `findById`, `create`, `update` y `fullUpdate` (después del sync de grafo en `fullUpdate`) para que las respuestas de venta no fallen por ciclo objeto ↔ `JSON.stringify` / `sendSuccess`; tests en `ventas-full-update-detail-graph.test.ts`.
- [x] **Integración backend en verde:** `apps/backend/src/saas/tenant-usage.ts` (ventas sin columna `anulada`); propagación **403** desde `AppError` vía `sendFail`/controladores; `findOne` con `where` en suites de integración; caja apertura con `tienda`; teardown de `configuracion` y FK; cotización — Zod `clienteId`.
- [x] **PLAN-MEJORAS (docs):** leyenda `[x]`/`[ ]`, bloque *Sincronización código ↔ docs* (2026-05), Fases 1–6 y *Visión futura* reordenadas; único `[ ]` explícito: revisión fiscal en campo (operación, no código).
- [x] **Tests integración — aislamiento tenant:** `clientes-`, `gastos-`, `empleados-`, `kits-`, `proveedores-`, `promociones-`, `cotizaciones-`, `tarjetas-regalo-`, `recetas-tenant-isolation.integration.test.ts` (404/403 según módulo); **2026-05-12:** `comprobantes-`, `tiendas-`, `cajas-`, `auditoria-`, `saas-`, `billing-`, `tenants-tenant-isolation.integration.test.ts`; inventario en `docs/arquitectura/TENANT-ISOLATION-INVENTORY.md`.
- [x] **Plan reportes:** backlog Fase 7 en este documento (revisión módulo `/reportes`, prioridades P0–P3).
- [x] **Reportes Fase 7 (P0 + parte P1):** filtro anuladas, Zod, pagos mixtos, filtro sucursal, pestaña Auditoría, tests `reportes-query.test.ts`.
- [x] **Configuración Fase 8 (P0 + P1):** Zod/whitelist backend, pestañas UI, completitud, validación cliente, tests `configuracion.dto.test.ts` — ver sección Fase 8.

## Notas

- **Integración DB**: paso a paso (Docker, variables, PowerShell): `docs/operacion/INTEGRATION-TESTS-LOCAL.md`. Resumen: Docker Compose (`sqlserver`, `redis`), `.env` en `apps/backend` (`DB_HOST=localhost`, `DB_PASS` alineada al `SA_PASSWORD` del compose), migraciones + `npm run seed` antes de `npm run test:integration` (incluye flujo caja: abrir → `resumenCaja` → cerrar → `resumenCaja`).
- La auditoría de **caja**, **PDF de cierre**, **catálogo de cajas** y **configuración** ya está implementada en el backend.
- **Rate limit** en login y API global ya existía; se añadieron límites específicos a reportes y PDF de cierre.
- **Reportes (Fase 7):** marcar `[x]` al cerrar cada ítem; el orden P0 → P1 → P2 → P3 evita rehacer consultas SQL.