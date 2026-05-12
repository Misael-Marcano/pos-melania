# Backlog de issues — SaaS multi-tenant

**Cómo usar este backlog**

1. Ordena y cierra trabajo alineado a [`PLAN-CIERRE-PROYECTO.md`](PLAN-CIERRE-PROYECTO.md) y al estado real del repo.
2. Usa las plantillas de abajo para abrir issues; no sustituye decisiones de producto documentadas en otros planes.
3. En PRs aplica [`CONTRIBUTING.md`](../CONTRIBUTING.md) (tests, sin secretos, `verify:landing-plans` si tocas la landing de planes).
4. Si editas muchas rutas markdown en `docs/`, ejecuta `npm run verify:docs-links` antes del PR.
5. Problemas de entorno local / shell / Docker / enlaces en docs → [TROUBLESHOOTING-DEV.md](operacion/TROUBLESHOOTING-DEV.md).

### Estado técnico reciente (ingeniería)

Hechos verificables en el repo (orientación para priorizar issues; no sustituye el plan maestro):

- [x] Tests unitarios puros SaaS en backend: `apps/backend/src/__tests__/plan-limits.test.ts`, `trial-pure.test.ts`.
- [x] Refactor de lógica NCF en `apps/backend/src/utils/ncf.ts` con tests en `ncf-pure.test.ts`.
- [x] Accesibilidad en flujos públicos: `/login` (`apps/frontend/src/app/(auth)/login/page.tsx`), `/solicitar-demo`, `/cuenta-suspendida` (etiquetas asociadas a inputs, `aria-*` / regiones donde aplica).
- [x] Checker de enlaces Markdown bajo `docs/`: `scripts/check-docs-links.mjs`, script npm `verify:docs-links` y paso correspondiente en `.github/workflows/ci.yml`.
- [x] Hub de desarrollo local y enlaces en documentación: `docs/operacion/TROUBLESHOOTING-DEV.md`.
- [x] `docs/PLAN-CIERRE-PROYECTO.md` — sección *Ingeniería: estado* documenta el foco reciente en DX/documentación frente al cierre operativo humano (Stripe live, restore drill, legal, etc.).
- [x] `tenant-access.test.ts` (`apps/backend/src/__tests__/tenant-access.test.ts`).
- [x] Landmark `<main>` en landing (`apps/frontend/src/app/page.tsx`).
- [x] Refuerzo Playwright `e2e/smoke.spec.ts`.
- [x] `tienda-access.test.ts` (`apps/backend/src/__tests__/tienda-access.test.ts`).
- [x] Accesibilidad en `select-organizacion/page.tsx` (`apps/frontend/src/app/select-organizacion/page.tsx`): landmark `<main>` y `h1` sr-only.
- [x] Accesibilidad en panel dashboard: landmark `<main>` en `apps/frontend/src/app/(dashboard)/panel/page.tsx`.
- [x] Ampliación de tests `resolve-fiscal-provider` en `apps/backend/src/__tests__/fiscal/resolve-fiscal-provider.test.ts`.
- [x] Nota smoke / CI staging en `apps/frontend/e2e/README.md` (enlace a `docs/operacion/E2E-STAGING.md`, `smoke.spec.ts`, secretos E2E).
- [x] `app-error.test.ts` (`apps/backend/src/__tests__/app-error.test.ts`).
- [x] Accesibilidad en `plataforma/page.tsx` (`apps/frontend/src/app/(dashboard)/plataforma/page.tsx`): landmark `<main>` y `h1` sr-only.
- [x] Cobertura extra `AppError` con status **5xx** en `apps/backend/src/__tests__/app-error.test.ts` (sin DB).
- [x] Accesibilidad en `auditoria/page.tsx` (`apps/frontend/src/app/(dashboard)/auditoria/page.tsx`): landmark `<main>` y `h1` sr-only.
- [x] Accesibilidad en `inventario/page.tsx` (`apps/frontend/src/app/(dashboard)/inventario/page.tsx`): landmark `<main>` y `h1` sr-only.
- [x] Accesibilidad en `ventas/page.tsx` (`apps/frontend/src/app/(dashboard)/ventas/page.tsx`): landmark `<main>` y `h1` sr-only.
- [x] Accesibilidad en `reportes/page.tsx` (`apps/frontend/src/app/(dashboard)/reportes/page.tsx`): landmark `<main>` y `h1` sr-only.
- [x] Accesibilidad en `clientes/page.tsx` (`apps/frontend/src/app/(dashboard)/clientes/page.tsx`): landmark `<main>` y `h1` sr-only.
- [x] Accesibilidad en `compras/page.tsx` (`apps/frontend/src/app/(dashboard)/compras/page.tsx`): landmark `<main>` y `h1` sr-only.
- [x] Accesibilidad en `proveedores/page.tsx` (`apps/frontend/src/app/(dashboard)/proveedores/page.tsx`): landmark `<main>` y `h1` sr-only.
- [x] Accesibilidad en `gastos/page.tsx` (`apps/frontend/src/app/(dashboard)/gastos/page.tsx`): landmark `<main>` y `h1` sr-only.
- [x] Accesibilidad en `promociones/page.tsx` (`apps/frontend/src/app/(dashboard)/promociones/page.tsx`): landmark `<main>` y `h1` sr-only.
- [x] Accesibilidad en `cotizaciones/page.tsx` (`apps/frontend/src/app/(dashboard)/cotizaciones/page.tsx`): landmark `<main>` y `h1` sr-only.
- [x] Accesibilidad en `devoluciones/page.tsx` (`apps/frontend/src/app/(dashboard)/devoluciones/page.tsx`): landmark `<main>` y `h1` sr-only.
- [x] Accesibilidad en `kits/page.tsx` (`apps/frontend/src/app/(dashboard)/kits/page.tsx`): landmark `<main>` y `h1` sr-only.
- [x] Accesibilidad en `tarjeta-de-regalo/page.tsx` (`apps/frontend/src/app/(dashboard)/tarjeta-de-regalo/page.tsx`): landmark `<main>` y `h1` sr-only.
- [x] Accesibilidad en `empleados/page.tsx` (`apps/frontend/src/app/(dashboard)/empleados/page.tsx`): landmark `<main>` y `h1` sr-only.
- [x] Accesibilidad en `recetas/page.tsx` (`apps/frontend/src/app/(dashboard)/recetas/page.tsx`): landmark `<main>` y `h1` sr-only.
- [x] Accesibilidad en `comprobante/page.tsx` (`apps/frontend/src/app/(dashboard)/comprobante/page.tsx`): landmark `<main>` y `h1` sr-only.
- [x] Accesibilidad en `cajas/page.tsx` (`apps/frontend/src/app/(dashboard)/cajas/page.tsx`): landmark `<main>` y `h1` sr-only.
- [x] Accesibilidad en `tiendas/page.tsx` (`apps/frontend/src/app/(dashboard)/tiendas/page.tsx`): landmark `<main>` y `h1` sr-only.
- [x] Accesibilidad: landmark `<main>` en `/configuracion`, `/inventario/buscar`, `/ventas/cierres-caja` y `/ventas/historial` (`apps/frontend/src/app/(dashboard)/configuracion/page.tsx`, `apps/frontend/src/app/(dashboard)/inventario/buscar/page.tsx`, `apps/frontend/src/app/(dashboard)/ventas/cierres-caja/page.tsx`, `apps/frontend/src/app/(dashboard)/ventas/historial/page.tsx`).
- [x] **Ventas (edición completa):** `PUT /ventas/:id` acepta campos de **delivery** y el total queda alineado con entrega; DTO/servicio backend acorde. **VentaModal** (`apps/frontend/src/components/ventas/VentaModal.tsx`): rejilla de método de pago y conmutador/UI de entrega más claros. **Login (a11y):** `apps/frontend/src/app/(auth)/login/page.tsx` — `<main>`, `h1` sr-only y `h2` visible.
- [x] **Ventas (edición completa) — fix backend cascade:** `fullUpdate` (`apps/backend/src/modules/ventas/ventas.service.ts`) ya no deja `venta.detalles` apuntando a filas borradas; nuevo helper `syncFullUpdateVentaDetalleGraph` (`apps/backend/src/modules/ventas/ventas-full-update-detail-graph.ts`) reengancha los `VentaDetalle` recién persistidos al `Venta` antes de `manager.save`, evitando que el cascade de TypeORM emita `UPDATE venta_detalles SET ventaId = NULL` y rompa SQL Server (`Cannot insert the value NULL into column 'ventaId'`).
- [x] **Ventas (respuestas API / JSON):** `stripVentaDetalleParentRef` (`apps/backend/src/modules/ventas/ventas-full-update-detail-graph.ts`) se aplica en `findById`, `create`, `update` y `fullUpdate` de `apps/backend/src/modules/ventas/ventas.service.ts` (tras `syncFullUpdateVentaDetalleGraph` donde aplica, antes de devolver al controlador) para quitar en memoria `detalles[].venta` y evitar referencia circular `Venta ↔ VentaDetalle` que rompe `JSON.stringify` / `sendSuccess` / `res.json`; cobertura en `apps/backend/src/__tests__/ventas-full-update-detail-graph.test.ts`.
- [x] **Integración backend (`npm run test:integration`) en verde:** `tenant-usage.ts` sin referencia a columna inexistente `anulada` en ventas; `sendFail`/controladores propagan **403** desde `AppError`; tests de integración con `findOne` y `where` correctos; apertura de caja con `tienda`; teardown de configuración respetando FK; DTO Zod de cotización (`clienteId`).

Lista tipo GitHub para crear issues (copiar título + cuerpo). Etiquetas sugeridas: `saas`, `p0`, `p1`, `security`, `billing`, `ops`, `product`.

**Referencia:** `docs/PLAN-IMPLEMENTACION-SAAS-MULTI-TENANT.md`

**Fase 0 (decisiones):** implementada en `docs/arquitectura/SAAS-FASE-0-DECISIONES.md` + `.env.example`. Los issues 1–2 pueden cerrarse al confirmar revisiones comerciales en ese documento.

---

## Fase 0 — Decisiones

### Issue 1
**Título:** `[SaaS] Documentar decisiones Fase 0: registro, trial, dominio, impago por defecto`

**Cuerpo:**
```
## Contexto
Antes de implementar onboarding y billing enforcement hace falta alinear política comercial y técnica.

## Alcance
- Documento interno 1–2 páginas o sección en docs: registro público vs invitación, duración trial, plan asignado al trial, un dominio vs subdominios, valor por defecto de BILLING_ENFORCE_PAYMENT en producción.

## Criterios de aceptación
- [ ] Decisiones escritas y enlazadas desde PLAN-IMPLEMENTACION-SAAS-MULTI-TENANT.md o .env.example comentado
- [ ] Equipo revisa y aprueba (link a PR o comentario)

## Referencias
docs/PLAN-IMPLEMENTACION-SAAS-MULTI-TENANT.md (Fase 0)
```

---

### Issue 2
**Título:** `[SaaS] Actualizar .env.example con variables de trial / onboarding (placeholder)`

**Cuerpo:**
```
## Contexto
Preparar variables documentadas para trial y futuro registro sin sorpresas en deploy.

## Alcance
- Añadir placeholders y comentarios: p. ej. TRIAL_DAYS, FRONTEND_URL para emails, flags de feature.

## Criterios de aceptación
- [ ] .env.example actualizado
- [ ] README o DEPLOY-SAAS menciona nuevas vars si aplica
```

---

## Fase 1 — P0 Seguridad y calidad

### Issue 3
**Título:** `[P0][Security] Inventario de rutas API: verificación de aislamiento por tenant`

**Cuerpo:**
```
## Contexto
Listar endpoints que exponen recursos por id y validar patrón tenant (tenantId, joins).

## Estado (2026-05)
✅ Inventario mantenido: docs/arquitectura/TENANT-ISOLATION-INVENTORY.md — módulos listados en **OK** / BY_DESIGN; sin fila P0 abierta en el inventario (seguimiento P1: tests adicionales vía Issue 4).

## Alcance restante
- Revisión periódica al añadir endpoints (checklist en ese doc).
- Priorizar módulos con datos sensibles aún no cubiertos por tests de aislamiento (Issue 4).

## Criterios de aceptación
- [x] Inventario en repo vinculado desde PLAN-IMPLEMENTACION-SAAS-MULTI-TENANT.md
- [x] Gaps P0 del inventario: ninguno pendiente a 2026-05; nuevas rutas → rutina del doc + Issue hija si reaparece P0
```

---

### Issue 4
**Título:** `[P0][Tests] Integración: ampliar tests tenant-isolation a módulos pendientes`

**Cuerpo:**
```
## Contexto
Extender npm run test:integration siguiendo el patrón de ventas/reportes.

## Estado (2026-05)
✅ Cubiertos en repo: ventas, reportes, inventario, compras, devoluciones, **configuracion** (`configuracion-tenant-isolation.integration.test.ts`; ver `docs/arquitectura/TENANT-ISOLATION-INVENTORY.md`).

## Alcance
- Elegir 2–4 módulos prioritarios (p. ej. compras, devoluciones, configuración).
- Caso: tenant A no accede a id de tenant B → 404 o vacío según contrato.

## Criterios de aceptación
- [x] Tests de aislamiento P0 (ventas, reportes, inventario, compras, devoluciones) pasan en SQL Server + Redis — *CI:* job `integration` en `.github/workflows/ci.yml` (servicios SQL Server + Redis, `npm run test:integration`) **solo en push a `main`**; en PRs la suite corre local o en `main` tras merge.
- [x] Ampliación P1: al menos un módulo adicional prioritario — **`configuracion`** cubierto (`configuracion-tenant-isolation.integration.test.ts`; sin `/:id`: contrato = fila por JWT / `tenantId` en respuesta)
- [x] Inventario actualizado (tabla tests + brecha P1) en docs/arquitectura/TENANT-ISOLATION-INVENTORY.md
```

---

### Issue 5
**Título:** `[P0][E2E] Playwright: smoke login + navegación mínima en apps/frontend`

**Cuerpo:**
```
## Contexto
Reducir regresiones en releases con un flujo E2E mínimo.

## Estado
✅ Playwright + `e2e/smoke.spec.ts` + `apps/frontend/e2e/README.md` + scripts `test:e2e` / `test:e2e:ui`.

CI principal incluye paso `verify:docs-links` en job `typecheck-and-unit`; E2E manual sigue siendo workflow aparte.

## Alcance restante
- Opcional: E2E automático en cada PR (coste de pipeline); hoy cubierto por disparo manual.

## Criterios de aceptación
- [x] npm script documentado
- [x] Workflow manual + runbook: `docs/operacion/E2E-STAGING.md`, `.github/workflows/e2e-manual.yml` (secrets `E2E_EMAIL`, `E2E_PASSWORD`, `PLAYWRIGHT_BASE_URL`)
```

---

## Fase 2 — P0 Monetización

### Issue 6
**Título:** `[P0][Billing] Modelo y UX de trial: trialEndsAt (o equivalente) + banners`

**Cuerpo:**
```
## Contexto
Trial vendible requiere estado explícito en BD y mensajes en app.

## Alcance
- Migración + entidad Tenant si aplica
- GET /saas/context o billing status expone fin de trial
- UI: banner en layout o configuración cuando queden X días

## Criterios de aceptación
- [x] Comportamiento al expirar trial según decisión Fase 0 (banner, `/cuenta-suspendida`, `TRIAL_ENFORCE_EXPIRED` opt-in, recordatorios cron)
- [x] Tests integración o unitarios mínimos (`saas-trial`, `billing-guard` integration, `trial-reminders`)
```

---

### Issue 7
**Título:** `[P0][Billing] Pantalla y mensajes cuando billingGuard bloquea (402 / suspended)`

**Cuerpo:**
```
## Contexto
BILLING_ENFORCE_PAYMENT=true debe ser entendible para el usuario final.

## Alcance
- Interceptar respuesta 402/403 según implementación actual
- Página dedicada o modal: explicación, enlace a Portal Stripe, contacto soporte

## Criterios de aceptación
- [x] Flujo probado con estado past_due simulado (test `billing-guard.integration.test.ts` + staging según checklist Stripe §8)
- [x] Copy revisado en español (`/cuenta-suspendida`, portal Stripe cuando hay `stripeCustomerId`)
```

---

### Issue 8
**Título:** `[P0][Billing] Emails transaccionales: templates + hook webhook invoice.payment_failed`

**Cuerpo:**
```
## Contexto
Dunning básico para SaaS multi-tenant.

## Alcance
- Templates nodemailer para payment_failed, subscription_canceled/activated si faltan
- billing.webhook.ts dispara envío (respetar NOTIFICATIONS_EMAIL_ENABLED)

## Criterios de aceptación
- [x] Prueba en Stripe test mode documentada (`STRIPE-PROD-CHECKLIST.md` §8, plantilla `docs/operacion/evidence/STRIPE-VALIDATION-LOG.md`)
- [x] Log/auditoría si email desactivado (`stripe_audit_logs`, dedupe en webhook)
```

---

## Fase 3 — P1 Crecimiento

### Issue 9
**Título:** `[P1][Product] Onboarding: POST público crear tenant + admin (o formulario demo)`

**Cuerpo:**
```
## Contexto
Reducir fricción de alta; alternativa ligera: solo captura de lead.

## Estado (2026-05)
- **Opción C ligera:** página pública `/solicitar-demo` (mailto a contacto) sin crear tenant — alineado a Fase 0 decisión A + complemento en SAAS-FASE-0-DECISIONES.
- **Opción B** (registro público con API): pendiente si comercial elige canal self-service.

## Alcance
- Decisión Fase 0 define alcance
- Rate limit, validación email, slug único
- Opcional: CAPTCHA

## Criterios de aceptación
- [ ] OpenAPI / export spec actualizado **solo cuando** exista endpoint nuevo de alta (opción B); *pendiente de decisión comercial* — no aplica al flujo actual `/solicitar-demo` (mailto, sin POST público).
- [x] Sin crear tenants duplicados ni usuarios huérfanos en flujo demo actual (no hay POST)
```

---

### Issue 10
**Título:** `[P1][Product] Landing pública: planes alineados a plan-limits.ts`

**Cuerpo:**
```
## Contexto
VISIÓN §11: comparación Starter/Standard/Enterprise coherente con código.

## Alcance
- Sección en app/page o página marketing
- Script CI o checklist manual que valide límites vs PLAN_LIMITS

## Criterios de aceptación
- [x] Números publicados = backend (`npm run verify:landing-plans` + CI)
- [x] CTA a login / demo según Issue 9 (`/login`, `/solicitar-demo`, footer landing)

---

### Issue 11
**Título:** `[P1][Platform] Panel /plataforma: búsqueda y filtros en lista de tenants`

**Cuerpo:**
```
## Contexto
Soporte necesita encontrar organizaciones rápido.

## Alcance
- Backend: query params en GET /tenants/panel si no existen
- Frontend: buscar por nombre, slug, estado billing

## Estado (2026-05)
- Filtros y búsqueda **en cliente** sobre `GET /tenants/panel` (nombre/slug, facturación, plan). Query params en API quedan como optimización opcional si el volumen de tenants crece.

## Criterios de aceptación
- [x] Solo rol plataforma (sin cambios; ya aplicaba)
- [x] Búsqueda por nombre/slug y filtros por estado de facturación y `planCode` en `/plataforma` (filtrado en cliente sobre `GET /tenants/panel`; query params en API opcionales si crece el volumen)
- [ ] Auditoría extendida de acciones sensibles del panel (p. ej. “impersonar”, mutaciones masivas) — *pendiente humano/producto:* fuera de alcance actual; revisar si se implementa soporte con privilegios elevados.
```

---

## Fase 4 — P1 Operación

### Issue 12
**Título:** `[P1][Ops] Alertas mínimas: webhook Stripe fallido + tasa 5xx API`

**Cuerpo:**
```
## Contexto
SaaS multi-tenant requiere detección temprana de incidentes.

## Alcance
- Definir herramienta (logs, APM, uptime)
- Alertas: Stripe webhook 4xx/5xx, error rate backend

## Criterios de aceptación
- [x] Runbook: qué hacer ante alerta (enlace desde `DEPLOY-SAAS.md` §8 → `OBSERVABILITY-RUNBOOK.md` §6)
- [ ] Umbrales de alerta **activos** en producción (Stripe webhook fallidos, tasa 5xx) — *pendiente ops por entorno*; no se marca hecho sin evidencia en dashboard/canal de guardia (ver `PLAN-CIERRE-PROYECTO.md` WS5).
```

---

### Issue 13
**Título:** `[P1][Ops] Restore drill: evidencia de restore SQL en staging`

**Cuerpo:**
```
## Contexto
Backup sin restore probado no cuenta.

## Alcance
- Ejecutar restore según BACKUP-SQL-SERVER.md
- Documentar fecha, responsable, resultado

## Criterios de aceptación
- [ ] Nota en docs/operacion o anexo con checklist firmado
```

---

### Issue 14
**Título:** `[P1][Legal] Páginas Términos y Privacidad + enlaces en login/landing`

**Cuerpo:**
```
## Contexto
Venta SaaS multi-tenant requiere base legal mínima.

## Alcance
- Rutas /terminos /privacidad (contenido placeholder revisable por abogado)
- Enlaces visibles desde login y landing

## Criterios de aceptación
- [ ] Revisión jurídica externa antes de tráfico masivo (nota en doc)
```

---

## Fase 5 — P2 (opcional / backlog)

### Issue 15
**Título:** `[P2] Integración contable / e-commerce — spike y ICP`

**Cuerpo:**
```
## Contexto
Diferenciación post-MVP según mercado.

## Alcance
- Documentar 1 integración prioritaria y esfuerzo estimado
- No implementar hasta cerrar P0/P1 críticos

## Criterios de aceptación
- [ ] Documento spike en docs/ o issue hija con alcance acotado
```

---

## Cómo usarlos en GitHub

1. Crear milestone **SaaS MVP** (o **Fase 0–2**).
2. Crear labels: `saas`, `p0`, `p1`, `billing`, `security`, `ops`.
3. Pegar cada bloque como issue; asignar milestone y labels.
4. Orden sugerido: **1 → 2 → 3 → 4 → 6 → 7 → 8 → 5 → 9 → 10 → 11 → 12 → 13 → 14 → 15**.
