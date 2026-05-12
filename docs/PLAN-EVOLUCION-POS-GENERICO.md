# Plan de evolución — POS genérico (multi‑negocio)

**Ver también:** plan de ejecución y cierre operativo en [`docs/PLAN-CIERRE-PROYECTO.md`](PLAN-CIERRE-PROYECTO.md).

Objetivo: pasar del despliegue actual centrado en **Melania Sopa** a un producto reutilizable para **otros puntos de venta y cualquier tipo de producto**, sin reescribir el núcleo cada vez.

Este documento es **estratégico**: prioriza decisiones, fases y riesgos. Los detalles técnicos se irán bajando a tareas en `docs/PLAN-MEJORAS.md` o tickets cuando se ejecute cada fase.

---

## 1. Qué ya te acerca a un POS genérico

- **Configuración de marca**: nombre de compañía, RNC, logotipo, moneda, textos de recibo (`configuracion`).
- **Catálogo flexible**: artículos, categorías, stock, kits — no están atados a “sopa” en el modelo.
- **Multi‑sucursal**: tiendas y cajas ya permiten varias ubicaciones bajo una misma instancia.
- **Fiscal RD**: NCF, comprobantes, ITBIS — correcto para República Dominicana; otro país implica otro módulo normativo.

Quedan **acoplamientos opcionales** por despliegue: nombre del paquete npm / repo (`pos-melania`), y datos fiscales de ejemplo en seed de **comprobantes** (rangos tipo DGII). La marca en UI, OpenAPI y README ya están **neutros por defecto** (Fase A iniciada en repo).

---

## 2. Decisiones que hay que tomar antes de invertir mucho


| Decisión                 | Opción A                                                                                    | Opción B                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **Modelo de despliegue** | Una **instancia por cliente** (Docker/VM propia, BD propia) — más simple, aislamiento total | **Multi‑tenant** (un solo despliegue, `tenant_id` en tablas) — más complejo, mejor para SaaS |
| **Fiscal**               | Solo RD (DGII) en este producto                                                             | **Módulo fiscal plug-in** por país (interfaz + implementación RD + otras después)            |
| **Marca del software**   | Nombre neutro (“POS”, “Retail Hub”) + marca del cliente solo en config                      | Marca blanca total (dominio, favicon, emails) desde BD                                       |


Recomendación pragmática para la mayoría de PYME: **instancia por cliente + configuración y seeds neutros** primero; multi‑tenant solo si aparece necesidad clara de centralizar operación y facturación del producto.

---

## 3. Fases propuestas

### Fase A — Neutralizar y empaquetar (bajo riesgo)

- Textos de marca en **login / sidebar / metadata**: `apps/frontend/src/lib/app-brand.ts` + variables `NEXT_PUBLIC_APP_*` (ver `.env.example`).
- Seed **configuración** demo genérica (`nombreCompania`); comprobantes DGII siguen siendo plantilla RD.
- README raíz y **Swagger** (`OPENAPI_TITLE` / título por defecto `POS API`); contrato exportable con `npm run openapi:export` (política en `docs/operacion/OPENAPI.md`).
- Referencias a “Melania” en código de producto eliminadas; el nombre del repo puede seguir siendo `pos-melania`.

**Resultado:** mismo código, “nombre en pantalla” por `.env` y configuración en app.

### Fase B — Producto y dominio “cualquier producto”

- **Etiquetas del módulo BOM** (`/recetas`): `apps/frontend/src/lib/ui-labels.ts` — plural/singular, título de página, breadcrumb; **ocultar módulo** con `NEXT_PUBLIC_FEATURE_RECETAS=false` (retail sin producción).
- Copy neutro en descripción del módulo (“insumos” vs solo “ingredientes”).
- **Unidad de medida por artículo** (`articulos.unidadMedida`, opcional): formulario inventario, tabla, POS, recibo, import CSV (`unidadMedida`). Migración `1700000000023`.
- **Reportes**: título de página / menú / cabecera y etiquetas de pestañas vía `NEXT_PUBLIC_LABEL_REPORTES*` en `ui-labels.ts` (ver `.env.example`).

**Resultado:** un solo binario sirve para ferretería, boutique o comida, cambiando catálogo, etiquetas y flags por `.env`.

### Fase C — Fiscal y legal desacoplados (cuando salgas de RD o de DGII clásico)

- **Interfaz** `FiscalProvider` y resolución por instancia: `apps/backend/src/fiscal/` — variable de entorno `FISCAL_JURISDICTION` (`DO` / `DGII_RD` = NCF vía tabla `comprobantes`; `NONE` rechaza ventas con `usarNCF`).
- Implementación **DGII/RD** (`DgiiRdFiscalProvider`) delegando en `generarNCF` existente (`utils/ncf.ts`); `VentasService` usa `resolveFiscalProvider().nextComprobanteFiscal(...)`.
- País / régimen en **BD**: `configuracion.fiscalJurisdiccion` (opcional; prioridad sobre `FISCAL_JURISDICTION` del `.env`).
- **Plantillas operativas por jurisdicción**: `docs/operacion/jurisdicciones/` — índice, ancla RD/DGII → checklist canónico, plantilla `_PLANTILLA-NUEVA-JURISDICCION.md` para el siguiente país.
- **NONE / MOCK**: `MOCK` se resuelve al mismo `NoFiscalProvider` que `NONE`/`OFF` (sin NCF); documentado en `docs/operacion/jurisdicciones/NONE-MOCK.md`.

**Resultado:** nueva jurisdicción = nuevo `FiscalProvider` + config + entrada en `jurisdicciones/`; RD sigue siendo el camino por defecto.

### Fase D — Multi‑tenant (solo si aplica)

- **Cimientos en código**: tabla `tenants`, `tenantId` en `usuarios` y `tiendas`, JWT con `tenantId`, utilidades `tenant-access.ts` (`apps/backend/src/utils/tenant-access.ts`). Migraciones `1700000000025` (usuarios/tiendas), `0026` (catálogo, clientes, gastos), `0027` (kits, cotizaciones, promociones, proveedores, órdenes de compra, tarjetas regalo, recetas, comprobantes NCF, empleados), `0028` (`configuracion` una fila por tenant), `0029` (`devoluciones.tenantId`). Documento técnico: `docs/arquitectura/MULTI-TENANT.md`.
- **Aislamiento por organización (dominio ampliado)**: inventario (categorías/artículos), clientes, gastos, cajas/ventas vía sesión de caja y tienda, kits, cotizaciones, promociones y códigos, proveedores y compras, tarjetas regalo, recetas, series fiscales (`comprobantes` por tenant), **configuración general** (`configuracion` por `tenantId`), **devoluciones** (`tenantId` + validación de venta/artículos), reportes agregados y NCF (`generarNCF` / `FiscalProvider` con `tenantId`). Empleados alineados con `tenant` en tabla.
- `**configuracion` por tenant**: migración `0028` + API filtrada por organización del JWT; alta lazy con valores por defecto si no existía fila para ese tenant.
- **Producto SaaS (base, sin pasarela de pago)**: columna `tenants.planCode` (migración `0030`); límites declarativos en `apps/backend/src/saas/plan-limits.ts`; `**GET /api/v1/saas/context`** (plan, límites y **uso actual**: asientos y sucursales activas vía `saas/tenant-usage.ts`). **Topes en altas:** `apps/backend/src/saas/enforce-plan.ts` — antes de crear **empleado/usuario** o **sucursal** se valida el plan (`starter`: 5 usuarios asiento, 2 sucursales activas; roles `plataforma` no cuentan como asiento).
- **Facturación del producto (Stripe)**: dependencia `stripe`; `**GET /api/v1/billing/status`**, `**POST /api/v1/billing/create-checkout-session`**, `**POST /api/v1/billing/webhook**` (raw body), `**POST /api/v1/billing/create-portal-session**` (Customer Portal); columnas `tenants.stripe*` / `billingStatus` (migración `0031`); mapeo Price ID → `planCode` vía `STRIPE_PRICE_*`. UI en `/configuracion` (chips estado, selector plan, botón portal). Tests de integración: `billing-portal.integration.test.ts`. Documentación: `docs/arquitectura/BILLING-SAAS.md`. *Opcional:* bloqueo por impago, métricas/storage, provisioning guiado.
- **Auth / host (base)**: login con cabecera opcional `**X-Tenant-Slug`** (validación contra `tenants.slug`); variable `**LOGIN_REQUIRE_TENANT_SLUG*`* para exigirla en despliegues estrictos; frontend: `getLoginTenantSlug()` (`NEXT_PUBLIC_TENANT_SLUG` o subdominio). **Rol plataforma** + `**X-Tenant-Id`**, `**GET /tenants`**, selector `/select-organizacion` (ver `docs/arquitectura/MULTI-TENANT.md`).

**Resultado actual:** varias organizaciones pueden coexistir en una misma BD con datos de negocio separados por `tenantId`. **Planes comerciales definitivos**:


| Plan         | Precio  | Usuarios  | Sucursales | Artículos | Módulos                                           |
| ------------ | ------- | --------- | ---------- | --------- | ------------------------------------------------- |
| `starter`    | $29/mo  | 3         | 1          | 500       | Core: ventas, inventario, gastos, clientes, cajas |
| `standard`   | $79/mo  | 15        | 5          | 5.000     | Todos los módulos                                 |
| `enterprise` | $199/mo | ilimitado | ilimitado  | ilimitado | Todos los módulos                                 |


**Feature flags** (módulos bloqueados en `starter`, desbloqueados en `standard`/`enterprise`): `kits`, `cotizaciones`, `promociones`, `tarjetasRegalo`, `recetas`, `compras`. Enforcement en `assertFeatureEnabled` → 403 al intentar crear; sidebar muestra candado con tooltip y redirige a Configuración. Tests: `enforce-features.integration.test.ts`. **Topes cuantitativos**: usuarios, sucursales, artículos activos (`enforce-plan.ts`). **Métricas informacionales**: `articulosActivos` y `ventasMesActual` en `GET /saas/context`. **Stripe completo**: checkout, webhook, Customer Portal + UI + tests. **Política de impago** (`billingGuard`, opt-in `BILLING_ENFORCE_PAYMENT=true`). **Auditoría Stripe** (`stripe_audit_logs`). **Provisioning guiado** (`OnboardingBanner` en layout). **Instancia por cliente** (§2) sigue siendo el despliegue más simple para PYME; SaaS pleno requiere endurecimiento operativo (backups, RGPD, SLAs).

---

## 4. Riesgos y mitigación


| Riesgo                                     | Mitigación                                                                                         |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Romper producción Melania al “neutralizar” | Cambios por PR; despliegue Melania con `.env` y seed propios; pruebas de integración ya existentes |
| Multi‑tenant demasiado pronto              | Posponer hasta tener 2–3 clientes en instancias separadas y patrones claros                        |
| Fiscal otro país                           | No prometer fechas; Fase C cuando haya primer cliente fuera de RD                                  |


---

## 5. Próximo paso concreto

1. **SaaS multi-tenant (venta del producto):** plan de implementación por fases en `docs/PLAN-IMPLEMENTACION-SAAS-MULTI-TENANT.md` (trial, enforcement, onboarding, marketing, operación).
2. **Fase C (si amplías país):** implementar un nuevo `FiscalProvider`, registrarlo en `resolve-fiscal-provider.ts`, y añadir fila + checklist en `docs/operacion/jurisdicciones/` (partir de `_PLANTILLA-NUEVA-JURISDICCION.md`).
3. **Fase D (comercial):** producto SaaS completamente cableado — Stripe checkout/portal/webhook, `billingGuard` (opt-in), auditoría Stripe, provisioning guiado y métricas por tenant. Revisar **umbrales de plan** (`plan-limits.ts`) cuando definas planes de venta reales.
4. **Fase D (operación):** al añadir rutas o informes nuevos que lean datos por `id`, seguir el patrón **tenant** (`tenant-access.ts`, joins a `tiendas` / `tenantId` en SQL); ejecutar `npm run test:integration` tras cambios sensibles.
5. Mantener `docs/PLAN-MEJORAS.md` y `docs/arquitectura/MULTI-TENANT.md` alineados con este documento cuando cambie el alcance multi-tenant o fiscal.
6. Tras ediciones masivas bajo `docs/`, ejecutar `npm run verify:docs-links` además del `npm run verify` habitual cuando toque landing o límites de planes.

### Sincronización con `PLAN-MEJORAS.md` (código en repo, 2026-05)

Las **Fases A–D** de §3 tienen su **implementación base** en el monorepo (rutas citadas en cada subfase). El inventario con checkboxes **`[x]` / `[ ]`** por entregable está en [`docs/PLAN-MEJORAS.md`](PLAN-MEJORAS.md) (Fases 1–6 y *Visión futura*). **Go-live, evidencias y workstreams humanos:** [`docs/PLAN-CIERRE-PROYECTO.md`](PLAN-CIERRE-PROYECTO.md).

---

*Documento vivo: actualizar fases cuando se cierre cada etapa.*