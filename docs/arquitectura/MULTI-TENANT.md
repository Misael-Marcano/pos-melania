# Multi-tenant — estado y evolución recomendada

## Estado actual en el repo

- Tabla **`tenants`** (organización / inquilino lógico).
- Columnas **`tenantId`** obligatorias en **`usuarios`** y **`tiendas`**, con FK a `tenants` (migración `1700000000025`).
- El **JWT** incluye `tenantId`; tokens antiguos sin el campo se interpretan como **`tenantId = 1`** en el middleware de autenticación (salvo rol **`plataforma`**). **Usuarios estándar:** si envían **`X-Tenant-Id`**, debe coincidir con el `tenantId` del token (**403** si no). **Rol `plataforma`:** debe enviar **`X-Tenant-Id`** con el id de una organización **activa** en cada petición que use datos de tenant; sin cabecera, `tenantId` efectivo queda vacío (rutas que llaman a `tenantIdOrThrow` responden **400**). **`GET /api/v1/tenants`** (solo `plataforma`) lista organizaciones sin cabecera.
- **Login** (`POST /auth/login`): cabecera opcional **`X-Tenant-Slug`** (debe coincidir con `tenants.slug` activo del usuario). Variable **`LOGIN_REQUIRE_TENANT_SLUG`** en el backend para exigirla. Frontend: `NEXT_PUBLIC_TENANT_SLUG` o subdominio vía `apps/frontend/src/lib/login-tenant-slug.ts`.
- **Auditoría** (`/api/v1/auditoria`): el listado y el catálogo de tablas solo incluyen registros cuyo **`usuarioId`** apunta a un usuario de **`usuarios.tenantId`** igual al JWT (join interno; entradas sin usuario se excluyen).
- **Migraciones posteriores** (`1700000000026`–`1700000000030`): `tenantId` en catálogo (categorías, artículos), clientes, gastos, kits, cotizaciones, promociones, proveedores, órdenes de compra, tarjetas regalo, recetas, comprobantes (NCF) y empleados; índices únicos por tenant donde antes había unicidad global (código de promoción, tarjeta, tipo de comprobante, correo de empleado, etc.). **`configuracion`**: una fila por organización (`tenantId` NOT NULL, `UQ_configuracion_tenantId`), lectura/escritura según JWT. **`devoluciones`**: `tenantId` NOT NULL (migración `0029`), rellenado desde venta → caja → tienda; API filtrada por JWT. **`tenants.planCode`** (`0030`): plan comercial por organización; límites declarativos en `apps/backend/src/saas/plan-limits.ts`; **`GET /api/v1/saas/context`** expone plan, límites y **uso actual** (asientos y sucursales activas, `saas/tenant-usage.ts`) para la organización efectiva del JWT (**rol `plataforma`:** misma org que **`X-Tenant-Id`**; si no hay cabecera, se usa el tenant del usuario en BD). El frontend muestra el plan en cabecera (`useSaasContext` / `SaasPlanBadge`, tooltip con uso).
- **Aislamiento aplicado en backend** (consultas y altas filtradas o validadas por `tenantId` / `tenant-access.ts`), entre otros: **tiendas**, **usuarios/empleados**, **cajas**, **inventario**, **clientes**, **gastos**, **kits**, **cotizaciones**, **promociones**, **proveedores** y **compras**, **tarjetas regalo**, **recetas**, **comprobantes**, **configuración general**, **devoluciones** y **reportes** agregados; **NCF** por tenant vía `generarNCF(..., tenantId)`. **Inventario por módulo (API v1):** `docs/arquitectura/TENANT-ISOLATION-INVENTORY.md`.
- **Ventas (listado, detalle, resumen del día, edición/anulación)**: filtro por organización vía sesión de caja → tienda de la apertura o del catálogo de caja; ventas sin sesión → `usuario.tenantId`. Los reportes agregados siguen enlazando por `caja_aperturas` → `tiendas.tenantId` (p. ej. `cierreCaja`).

Instalaciones existentes quedan en el tenant **`default`** (id `1` tras las migraciones).

**Pruebas automáticas (regresión multi-tenant):** con SQL Server + Redis + seed, `npm run test:integration` en `apps/backend` incluye `ventas-tenant-isolation.integration.test.ts` y `reportes-tenant-isolation.integration.test.ts` (organización de prueba + token ajeno).

**PRs que tocan varias rutas bajo `docs/`:** desde la raíz del monorepo, ejecutar `npm run verify:docs-links` antes de abrir el PR (el flujo completo de verificación sigue en `CONTRIBUTING.md`).

## Modelo de despliegue recomendado (plan de evolución)

| Escenario | Recomendación |
|-----------|----------------|
| Una PYME / un cliente | **Una instancia, una BD, un tenant** (`default`). Sin cambio operativo. |
| Varios clientes aislados | **Una instancia por cliente** (Docker/VM + BD propia) sigue siendo la opción más simple y segura. |
| SaaS multi-tenant real | **Provisioning** de tenants, límites por plan, auth por organización y super-admin de plataforma; repasar módulos residuales. |

## Próximos pasos técnicos (cuando se priorice SaaS)

1. **Cierre de brechas**: repasar rutas residuales si aparecen (auditoría ya acotada por tenant vía usuario). **Ventas** REST (`ventas.service`): listado, detalle, `resumen-hoy` y mutaciones ya acotadas por organización. **Reportes** (`reportes.service`): consultas cruzan **tiendas**/`tenantId` en ventas y catálogos; joins defensivos en categorías/proveedores (inventario valorizado, DGII 606), **usuarios.tenantId** en ventas por usuario y **cajas** acotadas a la misma org en ventas por caja.
2. **Facturación del producto** (pasarela) cuando haya planes de venta reales.
3. **Métricas ampliadas** (opcional): almacenamiento, facturación al cliente final, series de tiempo — la base ya expone **uso** de asientos y sucursales en `GET /saas/context`.

**Límites por plan:** `plan-limits.ts` + validación en **`saas/enforce-plan.ts`** al crear **usuario** (asientos; excluye rol `plataforma`) y **sucursal** (solo activas). Conteos compartidos con **`tenant-usage.ts`**.

Este documento complementa `docs/PLAN-EVOLUCION-POS-GENERICO.md` (Fase D).

## Rol `plataforma` — flujo «Operar»

1. El usuario inicia sesión con rol **`plataforma`** y entra en **`/select-organizacion`** (o **`/plataforma`**).
2. En **`/plataforma`**, el botón **Operar** fija `platformTenantId` en el store del frontend y navega a **`/panel`**.
3. Las peticiones API del dashboard envían **`X-Tenant-Id`** con ese id (misma org que el JWT efectivo para datos operativos).
4. El **Header** muestra badge de la organización activa; **Salir de organización** en el menú de usuario limpia `platformTenantId` y vuelve a **`/plataforma`**.

Rutas solo plataforma sin tenant: `GET /api/v1/tenants`, `GET /api/v1/tenants/panel`. El resto exige cabecera de tenant cuando el rol es `plataforma`.

## Ver también

- [`docs/PLAN-CIERRE-PROYECTO.md`](../PLAN-CIERRE-PROYECTO.md) — cierre de proyecto y checklist operativo.
- [`docs/arquitectura/TENANT-ISOLATION-INVENTORY.md`](TENANT-ISOLATION-INVENTORY.md) — inventario de aislamiento por tenant en la API `/api/v1`.
