# Inventario — aislamiento por tenant (API `/api/v1`)

**Objetivo:** mapa de módulos y patrón de seguridad multi-tenant para auditorías y tests de regresión.  
**Última revisión:** 2026-05-12 · **Mantenimiento:** actualizar al añadir rutas o cambiar `tenant-access`. Tras cambiar rutas de la API, si se tocaron la landing o los límites de planes, ejecutar `npm run verify` en **exit 0**; si se editaron en bloque muchos archivos bajo `docs/`, pasar también `npm run verify:docs-links`; en `main`, mantener verdes los tests de integración que cubren el aislamiento por tenant.

## Leyenda de estado

| Estado | Significado |
|--------|-------------|
| **OK** | Listados y mutaciones filtran por organización efectiva (`tenantIdOrThrow` / `assertTenantMatch` / joins a `tiendas.tenantId` / columna `tenantId`). |
| **BY_DESIGN** | Expone datos de **varias** organizaciones a propósito; protegido por **rol** (`plataforma` u otro). |
| **N/A** | Autenticación u operación sin dato de negocio por tenant en la petición típica. |
| **REVIEW** | Revisar manualmente tras cambios grandes (queries raw, nuevos endpoints). |

**Organización efectiva:** JWT `tenantId` del usuario; rol `plataforma` debe enviar **`X-Tenant-Id`** (ver `auth.middleware.ts` y `docs/arquitectura/MULTI-TENANT.md`).

---

## Resumen por módulo

| Prefijo API | Servicio principal | Estado | Patrón / notas |
|-------------|-------------------|--------|----------------|
| `/auth` | `auth.service` | **N/A** | Login / refresh; el token resultante fija `tenantId`. |
| `/clientes` | `clientes.service` | **OK** | `tenantIdOrThrow`; queries con `tenant: { id: tid }`. |
| `/inventario` | `inventario.service` | **OK** | `tenantIdOrThrow` + `assertTenantMatch` en artículos/categorías. |
| `/ventas` | `ventas.service` | **OK** | `scopeVentasPorTenant`, `assertVentaEnTenant`, `assertTenantForTienda`. |
| `/gastos` | `gastos.service` | **OK** | `tenantIdOrThrow` + `assertTenantMatch` en detalle. |
| `/empleados` | `empleados.service` | **OK** | `tenantIdOrThrow` + `assertTenantMatch` (usuario/tienda). |
| `/comprobantes` | `comprobantes.service` | **OK** | `tenantIdOrThrow` + `assertTenantMatch` en series fiscales. |
| `/kits` | `kits.service` | **OK** | `tenantIdOrThrow` + `assertTenantMatch`. |
| `/proveedores` | `proveedores.service` | **OK** | `tenantIdOrThrow` + `assertTenantMatch`. |
| `/reportes` | `reportes.service` | **OK** | `tenantId` inyectado desde controller; SQL con `t.tenantId = @…` / joins equivalentes. **REVIEW** al añadir informes nuevos. |
| `/tiendas` | `tiendas.service` | **OK** | `tenantIdOrThrow` + `assertTenantMatch`; límites de plan en altas. |
| `/cajas` | `cajas.service` | **OK** | `assertTenantMatch` vía `tienda.tenant`. |
| `/configuracion` | `configuracion.service` | **OK** | Una fila por tenant; `assertTenantForTienda` en tienda/caja. |
| `/compras` | `compras.service` | **OK** | Filtros `tenantId` en órdenes + `assertTenantMatch`. |
| `/devoluciones` | `devoluciones.service` | **OK** | `tenantId` en listados + `assertTenantMatch` con venta. |
| `/auditoria` | `auditoria.service` | **OK** | `findAll` / `getTablas` por `usuarios.tenantId`. |
| `/tarjetas-regalo` | `tarjetas-regalo.service` | **OK** | `tenantIdOrThrow` + `assertTenantMatch`. |
| `/promociones` | `promociones.service` | **OK** | `tenantIdOrThrow` + `assertTenantMatch`. |
| `/cotizaciones` | `cotizaciones.service` | **OK** | Filtros por `tenantId` / `tenant: { id }`. |
| `/recetas` | `recetas.service` | **OK** | `tenantIdOrThrow` en CRUD. |
| `/tenants` | `tenants.service` | **BY_DESIGN** | Solo rol **`plataforma`**: lista todas las organizaciones (`/` y `/panel`). No es fuga de datos entre tenants de cliente; es panel de instancia. |
| `/saas` | `saas.service` | **OK** | `contextForUser`: org del usuario; `plataforma` + `X-Tenant-Id` elige otra org activa. |
| `/billing` | `billing.service` | **OK** | `tenantIdOrThrow` para checkout/portal/status sobre fila `tenants`. |

### Webhook Stripe

| Ruta | Estado | Notas |
|------|--------|-------|
| `POST /api/v1/billing/webhook` | **N/A** (JWT) | Firma Stripe; actualiza `tenants` por metadata / customer; sin usuario. |

---

## Tests de integración existentes (referencia)

| Área | Archivo (aprox.) |
|------|------------------|
| Ventas — id ajeno → 404 | `ventas-tenant-isolation.integration.test.ts` |
| Reportes — cierre ajeno | `reportes-tenant-isolation.integration.test.ts` |
| Inventario — id ajeno → 404 | `inventario-tenant-isolation.integration.test.ts` |
| Compras — id ajeno → 403 | `compras-tenant-isolation.integration.test.ts` |
| Devoluciones — id ajeno → 404 | `devoluciones-tenant-isolation.integration.test.ts` |
| Configuración — GET acotado por tenant (sin `/:id`) | `configuracion-tenant-isolation.integration.test.ts` |
| Clientes — id ajeno → 404 | `clientes-tenant-isolation.integration.test.ts` |
| Gastos — id ajeno → 403 | `gastos-tenant-isolation.integration.test.ts` |
| Empleados — id ajeno → 404 | `empleados-tenant-isolation.integration.test.ts` |
| Kits — id ajeno → 403 | `kits-tenant-isolation.integration.test.ts` |
| Proveedores — id ajeno → 403 | `proveedores-tenant-isolation.integration.test.ts` |
| Promociones — id ajeno → 403 | `promociones-tenant-isolation.integration.test.ts` |
| Cotizaciones — id ajeno → 404 | `cotizaciones-tenant-isolation.integration.test.ts` |
| Tarjetas regalo — id ajeno → 403 | `tarjetas-regalo-tenant-isolation.integration.test.ts` |
| Recetas — id ajeno → 404 | `recetas-tenant-isolation.integration.test.ts` |
| Comprobantes — GET / sin filas ajenas; PUT ajeno → 403 | `comprobantes-tenant-isolation.integration.test.ts` |
| Tiendas — GET / sin sucursales ajenas; PUT ajeno → 403 | `tiendas-tenant-isolation.integration.test.ts` |
| Cajas — id ajeno → 403 | `cajas-tenant-isolation.integration.test.ts` |
| Auditoría — GET / sin filas ajenas | `auditoria-tenant-isolation.integration.test.ts` |
| Plan / features | `enforce-plan.integration.test.ts`, `enforce-features.integration.test.ts` |
| Billing / portal | `billing-portal.integration.test.ts` |

Helper compartido: `__tests__/integration/helpers/other-tenant-auth.ts` (segundo tenant + JWT).

**Brecha P1 (tests dedicados):** cerrada para los módulos **OK** listados en inventario; nuevos `GET/PUT …/:id` o listados sensibles → añadir fila en esta tabla y caso en `*-tenant-isolation.integration.test.ts` cuando aplique.

---

## Rutina de revisión al cambiar código

1. ¿Nuevo `GET/PUT/DELETE …/:id`? → Comprobar que el recurso se carga con **`tenant`/`tenantId`** y `assertTenantMatch` o equivalente.
2. ¿Nueva query SQL raw? → Incluir explícitamente **`tenantId`** o join a `tiendas` / `caja_aperturas` acotado por tenant.
3. ¿Nuevo endpoint en `/tenants` o similar? → Confirmar **`canPlataforma`** (o rol adecuado).

---

## Historial

| Fecha | Cambio |
|-------|--------|
| 2026-04-18 | Creación del inventario (Fase 1.1). |
| 2026-04-18 | Tests inventario / compras / devoluciones + helper `other-tenant-auth`. |
| 2026-05-11 | Reconciliación backlog Issues 3–4: test dedicado `configuracion-tenant-isolation.integration.test.ts` en repo; P1 = otros módulos si se amplía alcance. |
| 2026-05-11 | Añadido `configuracion-tenant-isolation.integration.test.ts`; brecha P1 de configuración cerrada. |
| 2026-05 | Mención breve de accesibilidad (a11y) en páginas públicas legales y demo (`/terminos`, `/privacidad`, `/solicitar-demo`, `/cuenta-suspendida`); sin reclasificar rutas API. |
| 2026-05-12 | Tests `empleados-`, `kits-`, `proveedores-tenant-isolation.integration.test.ts`; brecha P1 actualizada. |
| 2026-05-12 | Tests `promociones-`, `cotizaciones-`, `tarjetas-regalo-`, `recetas-tenant-isolation.integration.test.ts`; brecha P1 = comprobantes, tiendas, cajas, auditoría. |
| 2026-05-12 | Tests `comprobantes-`, `tiendas-`, `cajas-`, `auditoria-tenant-isolation.integration.test.ts`; brecha P1 de tests dedicados cerrada. |
