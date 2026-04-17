# Facturación del producto (SaaS) — Stripe

Integración con **Stripe** para suscripciones por organización (`tenants`). Los **límites por plan** (`plan-limits.ts`, `enforce-plan.ts`) siguen siendo la fuente de verdad en la app; Stripe **actualiza** `tenants.planCode` y el estado de facturación vía webhooks.

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `BILLING_PROVIDER` | `stripe` (defecto) o `none` para desactivar cobro integrado. |
| `STRIPE_SECRET_KEY` | Clave secreta (`sk_test_…` / `sk_live_…`). |
| `STRIPE_WEBHOOK_SECRET` | Secreto del endpoint de webhook (`whsec_…`). |
| `STRIPE_PRICE_STARTER` | ID de precio recurrente Stripe para plan `starter`. |
| `STRIPE_PRICE_STANDARD` | ID de precio para `standard`. |
| `STRIPE_PRICE_ENTERPRISE` | ID de precio para `enterprise`. |
| `BILLING_ENFORCE_PAYMENT` | `true` para activar el bloqueo por impago (402). Defecto `false` (opt-in). |
| `TEST_STRIPE_CUSTOMER_ID` | `cus_…` de Stripe para el happy-path del test de integración del portal. |

Crea los **Products / Prices** en el dashboard de Stripe (modo recurring) y copia los `price_…` a `.env`.

## API

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/v1/billing/status` | admin, soporte, plataforma | Estado global (claves, webhook, precios) + datos de la **org del JWT** (`stripeCustomerId`, `stripeSubscriptionId`, `billingStatus`). |
| POST | `/api/v1/billing/create-checkout-session` | mismo | Body JSON: `successUrl`, `cancelUrl`, `planCode` opcional (`starter` \| `standard` \| `enterprise`). Respuesta: `{ url }` para redirigir al Checkout. |
| POST | `/api/v1/billing/create-portal-session` | mismo | Body JSON: `returnUrl` (URI). Respuesta: `{ url }` del Customer Portal de Stripe. Requiere que la org ya tenga `stripeCustomerId` (haber pasado por Checkout). Permite al cliente gestionar tarjeta, ver facturas y cancelar la suscripción. |
| POST | `/api/v1/billing/webhook` | firma Stripe | **Sin JWT.** Cuerpo **raw** JSON; configurado en `app.ts` **antes** de `express.json`. |

Rol **plataforma**: enviar **`X-Tenant-Id`** para operar sobre la organización correcta (checkout, portal y filas en BD).

## Webhook en Stripe

1. URL pública: `https://<tu-api>/api/v1/billing/webhook`.
2. Eventos recomendados: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
3. Copiar el **signing secret** a `STRIPE_WEBHOOK_SECRET`.
4. Para checklist operativo completo de salida a producción, ver `docs/operacion/STRIPE-PROD-CHECKLIST.md`.

El handler verifica la firma con el SDK y actualiza `tenants`:

- `stripeCustomerId`, `stripeSubscriptionId`, `billingStatus`, `planCode` (mapeo por **Price ID** ↔ variables `STRIPE_PRICE_*`).

## Base de datos

Migración `1700000000031-TenantStripeBilling`: columnas opcionales en `tenants`:

- `stripeCustomerId`, `stripeSubscriptionId`, `billingStatus`

## Código relevante

- `apps/backend/src/modules/billing/` — servicio, rutas, DTO, webhook.
- `apps/backend/src/modules/billing/stripe.ts` — cliente singleton y mapeo precio → plan.
- `apps/backend/src/app.ts` — registro del webhook con `express.raw({ type: 'application/json' })`.

## Tests de integración

| Archivo | Cobertura |
|---------|-----------|
| `src/__tests__/integration/billing-portal.integration.test.ts` | `POST /billing/create-portal-session` — 401 sin token, 422 body inválido, 400 sin `stripeCustomerId`, 400 `BILLING_PROVIDER=none`, 503 sin clave Stripe, 200 happy-path (requiere `TEST_STRIPE_CUSTOMER_ID` en `.env`). |

Variable opcional para el happy-path:

| Variable | Descripción |
|----------|-------------|
| `TEST_STRIPE_CUSTOMER_ID` | ID de customer Stripe de test (`cus_…`) para el happy-path del test de integración. Si no se define, ese caso se omite con `console.warn`. |

## Política de impago (`billingGuard`)

Middleware global en `apps/backend/src/middlewares/billing-guard.middleware.ts`.

- **Opt-in**: solo activo con `BILLING_ENFORCE_PAYMENT=true`; por defecto `false`.
- **Respuesta**: `402 Payment Required` con mensaje que apunta a `/configuracion`.
- **Estados bloqueados**: `past_due`, `canceled`, `unpaid`, `incomplete_expired`.
- **Rutas exentas**: `/api/v1/auth/**` (login/refresh), `/api/v1/billing/**` (pagar), `/health`.
- **Roles exentos**: `plataforma` (soporte/plataforma siempre pasa).
- **Caché Redis** con TTL 5 min (`billing:status:{tenantId}`). El webhook invalida la clave al recibir un evento que cambia el estado.

## Auditoría de eventos Stripe

Tabla `stripe_audit_logs` (migración `1700000000032-StripeAuditLog`):

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `stripeEventId` | NVARCHAR(255) UNIQUE | ID del evento (`evt_…`) — garantiza idempotencia ante reenvíos |
| `eventType` | NVARCHAR(100) | `checkout.session.completed`, `customer.subscription.updated`, … |
| `tenantId` | INT nullable | Organización afectada (null si no resoluble) |
| `stripeCustomerId` | NVARCHAR(255) nullable | `cus_…` |
| `stripeSubscriptionId` | NVARCHAR(255) nullable | `sub_…` |
| `planCode` | NVARCHAR(32) nullable | Plan resultante |
| `billingStatus` | NVARCHAR(32) nullable | Estado resultante |
| `rawPayload` | NVARCHAR(MAX) | Payload completo del evento serializado como JSON |
| `processedAt` | DATETIME2 | Fecha/hora UTC del procesamiento |

El webhook escribe en esta tabla tras procesar cada evento. Los reenvíos de Stripe se detectan por el índice único en `stripeEventId` y se ignoran con `console.warn`.

## Próximos pasos opcionales

- Provisioning guiado: UI de onboarding que lleva al nuevo tenant por Checkout en su primer login.
- Métricas/storage por tenant (limitar uploads, exportaciones, etc.).
