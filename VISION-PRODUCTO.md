# Visión del producto — POS retail / inventario

Documento de referencia para **diseño de producto**, **priorización** y **comunicación** con stakeholders. Resume el estado del monorepo `pos-melania` (backend, frontend, docs operativas) y los **lineamientos de evolución** acordados en `docs/PLAN-EVOLUCION-POS-GENERICO.md`.

---

## 1. Qué es

**Sistema de punto de venta (POS) e inventario multi-sucursal**, pensado como **producto genérico** (no atado a un solo rubro): ferretería, retail, alimentos con recetas/BOM, etc. La **marca en pantalla** es configurable por variables de entorno (`NEXT_PUBLIC_APP_*`) y por **Configuración** en la aplicación (nombre fiscal, RNC, moneda, textos de recibo, logotipo).

**Origen y nombre del repo:** el código nació en un contexto concreto (“Melania”); el **producto** se está neutralizando y empaquetando como POS reutilizable. El nombre del repositorio puede mantenerse por historial.

---

## 2. Propuesta de valor y beneficios

### Para el negocio

| Beneficio | Cómo se materializa en el producto |
|-----------|-------------------------------------|
| **Operación unificada** | Ventas, inventario, clientes, cajas y sucursales en un solo sistema. |
| **Visibilidad financiera** | Reportes (ventas, P&L, inventario valorizado, clientes, por sucursal, exportaciones DGII 607/606 cuando aplica). |
| **Cumplimiento fiscal RD** | NCF / DGII vía series fiscales configurables, `FiscalProvider` y checklist operativo (`docs/operacion/`). |
| **Flexibilidad de negocio** | Kits, promociones, cotizaciones → venta, compras a proveedores, gastos, crédito a clientes, devoluciones con flujo de aprobación. |
| **Escalado por etapas** | Desde **una instancia por cliente** (simple) hasta **multi-tenant** y **planes** (`planCode`, límites) si el modelo de negocio lo requiere. |

### Para producto y tecnología

| Beneficio | Detalle |
|-----------|---------|
| **Marca blanca / neutra** | Fase A: textos, OpenAPI, seed demo genérico. |
| **Dominio de negocio ampliable** | Fase B: etiquetas por `.env`, recetas/BOM opcional, unidad de medida por artículo, reportes renombrables. |
| **Fiscal desacoplado** | Fase C: nueva jurisdicción = nuevo `FiscalProvider` + documentación en `docs/operacion/jurisdicciones/`. |
| **Multi-organización** | Fase D: `tenants`, aislamiento por `tenantId`, configuración y devoluciones por tenant, rol plataforma, login por slug, contexto SaaS (`GET /saas/context`: plan, límites, **uso medido** — asientos y sucursales activas). |
| **Observabilidad y seguridad** | `X-Request-Id`, rate limits por rutas sensibles, auditoría de cambios, validación de tenant en cabeceras donde aplica. |

---

## 3. Stack tecnológico (resumen)

| Capa | Tecnología |
|------|------------|
| API | Node.js, TypeScript, Express |
| Datos | SQL Server, TypeORM, migraciones versionadas |
| Cache | Redis |
| Web | Next.js, React, Tailwind CSS |
| Estado | Zustand, TanStack Query |
| Auth | JWT; roles: `admin`, `cajero`, `soporte`, `plataforma` |
| Infra local | Docker Compose (SQL Server, Redis, etc.) |

Paquete compartido: `@pos/shared` (tipos, contratos).

---

## 4. Roles de usuario

| Rol | Uso típico |
|-----|------------|
| **admin** | Configuración completa, empleados, comprobantes, tiendas/cajas, aprobaciones, reportes. |
| **cajero** | POS, ventas, inventario operativo, tarjeta regalo según permisos de ruta. |
| **soporte** | Consulta y reportes; muchas rutas de solo lectura o backoffice sin caja. |
| **plataforma** | Operación **multi-organización** (lista organizaciones, elige tenant, envía `X-Tenant-Id`); mismo alcance operativo que admin **dentro** del tenant seleccionado. |

La matriz detallada por pantalla evoluciona; el **Sidebar** (`apps/frontend/src/components/layout/Sidebar.tsx`) define qué ve cada rol.

---

## 5. Módulos funcionales (aplicación)

Cada bloque incluye **ruta web** aproximada y **responsabilidad**. La API está bajo `/api/v1/...` con prefijos equivalentes.

### Núcleo operativo

| Módulo | Ruta / área | Qué cubre |
|--------|-------------|-----------|
| **Panel** | `/` | Resumen del día, accesos rápidos. |
| **Ventas (POS)** | `/ventas` | Toma de pedidos, métodos de pago múltiples, NCF opcional, cliente, sesión de caja. |
| **Historial de ventas** | `/ventas/historial` | Consulta y gestión de ventas (anulaciones según permisos). |
| **Cierres de caja** | `/ventas/cierres-caja` | Sesiones de caja, cierre, PDF de cierre, resúmenes. |
| **Clientes** | `/clientes` | Cartera, identificación (RNC/cédula/etc.), crédito y abonos. |
| **Inventario** | `/inventario` | Artículos, categorías, stock, ajustes, import CSV, movimientos de inventario. |
| **Cajas** | `/cajas` | Catálogo de cajas registradoras por sucursal. |
| **Tiendas** | `/tiendas` | Sucursales (multi-tienda). |
| **Gastos** | `/gastos` | Registro de gastos por categoría. |

### Comercial y precios

| Módulo | Ruta | Qué cubre |
|--------|------|-----------|
| **Kits** | `/kits` | Bundles de artículos con precio propio. |
| **Promociones** | `/promociones` | Descuentos/códigos por tenant. |
| **Cotizaciones** | `/cotizaciones` | Presupuestos y conversión a venta. |
| **Tarjeta regalo** | `/tarjeta-de-regalo` | Emisión y uso de gift cards. |

### Compras y proveedores

| Módulo | Ruta | Qué cubre |
|--------|------|-----------|
| **Proveedores** | `/proveedores` | Catálogo de proveedores. |
| **Compras** | `/compras` | Órdenes de compra (estados, recepción). |

### Post-venta y fiscal

| Módulo | Ruta | Qué cubre |
|--------|------|-----------|
| **Devoluciones** | `/devoluciones` | Solicitudes, aprobación/rechazo, impacto en stock. |
| **Comprobantes (NCF)** | `/comprobante` | Series y tipos fiscales DGII (por tenant). |
| **Reportes** | `/reportes` | Agregaciones (ventas, P&L, inventario, clientes, sucursal, exportaciones DGII). |

### Producción / retail avanzado (opcional)

| Módulo | Ruta | Qué cubre |
|--------|------|-----------|
| **Recetas (BOM)** | `/recetas` | Recetas de producción, insumos; ocultable con `NEXT_PUBLIC_FEATURE_RECETAS=false`. |

### Administración y cumplimiento

| Módulo | Ruta | Qué cubre |
|--------|------|-----------|
| **Configuración** | `/configuracion` | Marca, RNC, moneda, pie de recibo, `fiscalJurisdiccion`, tienda/caja por defecto, etc. (por **tenant** en multi-tenant). Incluye bloque **Plan y uso** (`/saas/context`: asientos y sucursales vs límites del plan). |
| **Empleados** | `/empleados` | Usuarios del sistema por organización. |
| **Auditoría** | `/auditoria` | Registro de cambios sensibles (filtrado por tenant vía usuario). |
| **Selección de organización** | `/select-organizacion` | Solo rol **plataforma**: elegir tenant antes de operar. |

### Autenticación

| Flujo | Descripción |
|-------|-------------|
| **Login** | `/login`; puede enviar `X-Tenant-Slug` (subdominio o `NEXT_PUBLIC_TENANT_SLUG`). |
| **API auth** | `/api/v1/auth/*` — login, refresh, logout, perfil, cambio de contraseña. |

### APIs de plataforma / SaaS (backend)

| Ruta | Quién | Descripción |
|------|-------|-------------|
| `GET /api/v1/tenants` | `plataforma` | Lista organizaciones activas. |
| `GET /api/v1/saas/context` | usuarios autenticados | Plan (`planCode`), **límites** (`resolvePlanLimits`) y **uso actual** (`usage.seats`, `usage.tiendasActivas` vía `saas/tenant-usage.ts`). Para rol **`plataforma`**, la organización efectiva es la de **`X-Tenant-Id`** si viene informada; si no, la del usuario en BD. |

---

## 6. Fiscalidad (República Dominicana por defecto)

- **NCF** y secuencias por tipo de comprobante, alineado con **DGII** en el flujo estándar.
- **Configuración por instancia/tenant:** `FISCAL_JURISDICTION` en `.env` y/o `configuracion.fiscalJurisdiccion` en BD (prioridad configurable).
- **Extensión a otro país:** interfaz `FiscalProvider` + registro en `resolve-fiscal-provider.ts` + documentación en `docs/operacion/jurisdicciones/`.
- **Checklist operativo:** `docs/operacion/FISCAL-DGII-CHECKLIST.md` (revisión en campo pendiente como tarea humana).

---

## 7. Multi-tenant, SaaS y límites

- **Modelo de datos:** tabla `tenants`; filas de negocio ligadas a `tenantId` donde aplica (usuarios, tiendas, inventario, ventas vía caja, configuración, devoluciones, etc.).
- **JWT:** incluye `tenantId`; cabeceras **`X-Tenant-Id`** y **`X-Tenant-Slug`** según flujo (ver `docs/arquitectura/MULTI-TENANT.md`).
- **Planes declarativos** (`apps/backend/src/saas/plan-limits.ts`): catálogo en código con etiqueta y topes opcionales (`null` = sin tope en esta versión del software).

| Código (`planCode`) | Etiqueta | Máx. usuarios (asientos) | Máx. sucursales activas |
|---------------------|----------|---------------------------|-------------------------|
| `standard` | Standard | sin tope (`null`) | sin tope (`null`) |
| `starter` | Starter | 5 | 2 |
| `enterprise` | Enterprise | sin tope (`null`) | sin tope (`null`) |

Cualquier código desconocido se resuelve como **Standard** (`resolvePlanLimits`).

- **Enforcement:** antes de crear **usuario/empleado** (asientos; el rol `plataforma` no cuenta) o **sucursal activa**, `saas/enforce-plan.ts` valida contra el plan del tenant; los conteos comparten la misma lógica que **`GET /saas/context`** (`tenant-usage.ts`).
- **Superficie en la app (autenticados):** en **Configuración** hay un bloque **Plan y uso** (organización, plan, asientos y sucursales vs límites). En el **encabezado del dashboard** se muestra un **indicador de plan** (`SaasPlanBadge`) con **tooltip** de uso — alineado a `useSaasContext` y la API anterior.
- **Pendiente de negocio:** pasarela de **facturación del producto** (Stripe u otro), **métricas ampliadas** (almacenamiento, series de tiempo, etc.), **provisioning** guiado de nuevos tenants y endurecimiento legal/operativo (RGPD, SLAs, backups — parte de ello ya documentado en `docs/operacion/`).

### Cambios recientes relevantes (SaaS / UX)

- Respuesta de **`/saas/context`** ampliada con **uso real** (asientos y sucursales activas), no solo límites teóricos.
- **Tres planes** nominales en catálogo (`standard`, `starter`, `enterprise`) para diferenciar comercialmente **Starter** (con topes) de **Standard** / **Enterprise** (sin topes en software en la versión actual).
- **Experiencia en producto** para quien ya está logueado: visibilidad del plan y consumo sin salir del flujo operativo (cabecera + configuración).

---

## 8. Roadmap de evolución (alineado al plan maestro)

| Fase | Enfoque | Estado conceptual en repo |
|------|---------|---------------------------|
| **A** | Marca neutra, empaquetado, OpenAPI | Avanzado |
| **B** | Cualquier producto: etiquetas, recetas opcional, unidades, reportes renombrables | Avanzado |
| **C** | Fiscal plug-in por jurisdicción | Avanzado (RD como default) |
| **D** | Multi-tenant, plataforma, planes, login por slug | Base implementada; facturación SaaS y métricas pendientes de decisión comercial |

**Próximos pasos típicos** (según prioridad):

1. Nuevo **país / fiscal**: nuevo `FiscalProvider` + docs en `jurisdicciones/`.
2. **Comercial SaaS:** integración de pagos del **servicio POS** y ajuste de límites de plan a la oferta real.
3. **Operación:** revisión periódica de informes legacy, checklist DGII en despliegue real.
4. **Producto / marketing:** página informativa con **planes y beneficios** (visión en §11), alineada a `plan-limits.ts` y a la estrategia de precios.

---

## 9. Documentación relacionada

| Documento | Contenido |
|-----------|-----------|
| `docs/PLAN-EVOLUCION-POS-GENERICO.md` | Decisiones estratégicas y fases A–D. |
| `docs/PLAN-MEJORAS.md` | Mejoras operativas, tests, fiscal, visión futura. |
| `docs/arquitectura/MULTI-TENANT.md` | Multi-tenant técnico y cabeceras. |
| `docs/operacion/` | Runbooks, checklist caja, backup SQL, jurisdicciones fiscales. |
| `README.md` | Inicio rápido, credenciales seed, estructura del repo. |

**Ver también (operación y cierre):** [`docs/PLAN-CIERRE-PROYECTO.md`](docs/PLAN-CIERRE-PROYECTO.md) (go-live, evidencias y workstreams), [`CONTRIBUTING.md`](CONTRIBUTING.md) (contribución, tests y PR) y [`docs/operacion/TROUBLESHOOTING-DEV.md`](docs/operacion/TROUBLESHOOTING-DEV.md) (desarrollo local: shell, Docker y enlaces de documentación). Tras ediciones masivas bajo `docs/`, desde la raíz del repo: `npm run verify:docs-links`.

---

## 10. Cómo usar este documento al diseñar

- **Priorizar módulos** según tipo de cliente (retail puro vs producción vs solo servicios).
- **Definir onboarding** (tenant único vs selector plataforma vs subdominio).
- **Alinear UX** con límites de plan (`saas/context`) antes de prometer funciones en marketing.
- **Separar** “funcionalidad de negocio del cliente” vs “facturación del software POS” (SaaS) para no mezclar requisitos fiscales del cliente con cobro del producto.

---

## 11. Página informativa de la aplicación y catálogo de planes (visión — sin implementación aquí)

Hoy los **planes y límites** viven en backend (`plan-limits.ts`) y el **cliente autenticado** ve su situación en **Configuración** y en la **cabecera**. Para **venta y claridad comercial** conviene, además, una **página dedicada** (pública o semipública) donde cualquier visitante o decisor entienda **qué es el producto** y **qué ofrece cada plan**, sin depender del login.

### Objetivo de producto

- **Transparencia:** comparar **Starter**, **Standard** y **Enterprise** (o los códigos vigentes) con límites de usuarios/sucursales y mensaje de valor por nivel.
- **Confianza:** breve descripción de módulos principales (POS, inventario, fiscal RD, multi-sucursal, reportes, etc.), coherente con las secciones 1–5 de este documento.
- **Conversión:** llamadas a la acción claras (registro, demo, contacto, “hablar con ventas”) según el modelo de negocio.

### Contenido sugerido (diseño UX / copy)

1. **Propuesta de valor** en cabecera (una frase + subtítulo): retail/inventario, multi-sucursal, cumplimiento fiscal cuando aplique.
2. **Beneficios en viñetas** alineados a la sección 2 de este documento (sin jerga técnica innecesaria).
3. **Tabla o tarjetas de planes:** nombre comercial, precio (cuando exista facturación), límites numéricos (coherentes con `PLAN_LIMITS`), qué tipo de negocio encaja en cada uno.
4. **Módulos incluidos** o “qué puedes hacer” (enlace conceptual a la tabla de módulos de la sección 5).
5. **Preguntas frecuentes** mínimas: multi-tenant, datos en RD, soporte, migración desde otro POS.
6. **Pie legal / marca:** coherente con variables `NEXT_PUBLIC_APP_*` y política de privacidad cuando exista.

### Relación con lo ya construido

- Los **topes reales** y etiquetas deben mantenerse **sincronizados** con `plan-limits.ts` (fuente de verdad técnica hasta que exista un CMS o API pública de pricing).
- **Decisión futura:** si la página es **100 % estática** (marketing) o consume un **endpoint público** de catálogo de planes (útil si cambian precios o límites sin redeploy). Eso no está implementado en este documento; aquí solo se fija la **intención de producto**.
- Diferenciar esta página de la **vista “Plan y uso” dentro de la app**: la primera es **adquisición y comparación**; la segunda es **operación y control de cuota** para el tenant actual.

### Priorización sugerida

- Después de **definir precios y facturación** (pasarela), o en paralelo si el canal es solo **captación de leads** sin cobro online todavía.

---

*Documento vivo: actualizar cuando cambie el alcance del producto o se cierren hitos mayores.*
