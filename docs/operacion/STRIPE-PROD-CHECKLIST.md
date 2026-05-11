# Checklist de ejecución — Stripe en producción

Objetivo: dejar facturación SaaS operativa end-to-end con evidencia verificable.

**Evidencia y plantillas:** índice en [`docs/operacion/evidence/README.md`](evidence/README.md) (qué versionar y qué no).

---

## 1) Precondiciones

- API pública disponible por HTTPS (`https://api.tudominio.com`).
- Frontend público disponible por HTTPS (`https://app.tudominio.com`).
- Variables de entorno de backend cargadas desde `.env.production`.
- Al menos un tenant admin existente para ejecutar pruebas reales.

Variables mínimas:

```env
BILLING_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_STANDARD=price_...
STRIPE_PRICE_ENTERPRISE=price_...
```

---

## 2) Base de datos y migraciones

Ejecutar migraciones pendientes:

```powershell
Set-Location "apps/backend"
npm run migration:run
```

Validar que existen columnas Stripe en `tenants`:

```sql
SELECT TOP 1
  stripeCustomerId,
  stripeSubscriptionId,
  billingStatus
FROM tenants;
```

Evidencia esperada:

- Sin errores en `migration:run`.
- Consulta SQL responde con columnas existentes.

---

## 3) Stripe Dashboard (modo live)

1. Crear o revisar productos/precios recurrentes:
  - `starter`
  - `standard`
  - `enterprise`
2. Copiar `price_...` a `STRIPE_PRICE_*`.
3. Configurar Customer Portal en Stripe (branding, métodos de pago, cancelación, etc.).

Evidencia esperada:

- Los 3 `price_...` están en `.env.production`.
- Portal habilitado en dashboard.

---

## 4) Webhook

Registrar endpoint:

- URL: `https://api.tudominio.com/api/v1/billing/webhook`
- Eventos:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`

Copiar signing secret (`whsec_...`) a `STRIPE_WEBHOOK_SECRET` y reiniciar backend.

Prueba rápida local (opcional con Stripe CLI):

```powershell
stripe listen --forward-to https://api.tudominio.com/api/v1/billing/webhook
stripe trigger checkout.session.completed
```

Evidencia esperada:

- Stripe muestra `2xx` en entregas del webhook.
- El backend no devuelve errores de firma.

---

## 5) Smoke test funcional (real)

Con usuario `admin/soporte/plataforma`:

1. Ir a `/configuracion`.
2. En "Facturación (Stripe)", elegir plan y pulsar "Suscribirse / cambiar plan".
3. Completar checkout con método de pago de prueba/live según entorno.
4. Volver a `/configuracion` y validar:
  - `billingStatus` actualizado.
  - `stripeSubscriptionId` presente.
5. Pulsar "Portal de facturación":
  - Debe abrir Customer Portal.
  - Debe regresar a `/configuracion`.

Evidencia esperada:

- Flujo sin errores visibles en frontend.
- Estado en backend reflejado en `GET /api/v1/billing/status`.

---

## 6) Validaciones por API

Desde una sesión autenticada:

- `GET /api/v1/billing/status` responde `200` y `provider=stripe`.
- `POST /api/v1/billing/create-checkout-session` responde `200` con `{ url }`.
- `POST /api/v1/billing/create-portal-session` responde `200` con `{ url }` (si ya existe `stripeCustomerId`).

Opcional: rol `plataforma` con `X-Tenant-Id` para operar otra organización.

Script de verificacion rapida (PowerShell):

```powershell
Set-Location "c:\ruta\al\repo"

# Solo lectura de estado
.\scripts\ops\check-stripe-readiness.ps1 `
  -ApiBaseUrl "https://api.tudominio.com/api/v1" `
  -JwtToken "<JWT_ADMIN_O_PLATAFORMA>"

# Incluir creacion de URLs de checkout y portal
.\scripts\ops\check-stripe-readiness.ps1 `
  -ApiBaseUrl "https://api.tudominio.com/api/v1" `
  -JwtToken "<JWT_ADMIN_O_PLATAFORMA>" `
  -RunCheckout `
  -RunPortal
```

---

## 7) Auditoría e idempotencia

Verificar inserciones en `stripe_audit_logs`:

```sql
SELECT TOP 20
  stripeEventId,
  eventType,
  tenantId,
  billingStatus,
  processedAt
FROM stripe_audit_logs
ORDER BY processedAt DESC;
```

Evidencia esperada:

- Eventos recientes de Stripe registrados.
- No duplicados por `stripeEventId` (idempotencia correcta).

Script de verificacion SQL (PowerShell + sqlcmd):

```powershell
Set-Location "c:\ruta\al\repo"
.\scripts\ops\check-stripe-audit.ps1 `
  -SqlServer "localhost,1433" `
  -Database "pos_db" `
  -SqlUser "sa" `
  -SqlPassword "<DB_PASS>"
```

El script ejecuta `scripts/ops/check-stripe-audit.sql` y reporta:

- eventos recientes,
- agregados por tipo de evento (7 dias),
- posibles duplicados por `stripeEventId`,
- ultimo evento Stripe por tenant.

---

## 8) Validación en modo test (Stripe test / staging)

Antes de pasar a `sk_live_…`, conviene dejar evidencia en **test mode**:

1. **Claves y webhook de test:** `sk_test_…`, `whsec_…` del endpoint de test apuntando a API staging (HTTPS o túnel).
2. **Checkout y Portal:** completar un flujo con tarjeta de prueba; verificar `tenants.stripeCustomerId` / `billingStatus` y filas en `stripe_audit_logs`.
3. **Impago simulado:** usar tarjetas o flujos de Stripe para `past_due` / `invoice.payment_failed`; comprobar email (si SMTP activo) o al menos eventos en auditoría.
4. **Bloqueo producto:** con `BILLING_ENFORCE_PAYMENT=true`, confirmar **402** en rutas de negocio y redirección a **`/cuenta-suspendida`**; abrir **Customer Portal** desde esa pantalla o desde Configuración.
5. **Emails desactivados:** si `NOTIFICATIONS_EMAIL_ENABLED=false`, los eventos deben quedar registrados en `stripe_audit_logs` como trazabilidad mínima.

---

## 9) Go-live guardrails

- `BILLING_ENFORCE_PAYMENT` definido según política comercial:
  - `false`: no bloquear por impago.
  - `true`: bloquear estados impagos con `402`.
- Existe runbook de soporte para fallos de pago.
- Backups SQL activos (ver `docs/operacion/BACKUP-SQL-SERVER.md`).

---

## 10) Criterio de cierre

**Archivo de evidencia:** copiar y rellenar la plantilla [`docs/operacion/evidence/STRIPE-VALIDATION-LOG.md`](evidence/STRIPE-VALIDATION-LOG.md) (ver también [`evidence/README.md`](evidence/README.md)).

Se considera "Stripe producción listo" cuando:

1. Migraciones aplicadas.
2. Webhook entregando `2xx`.
3. Checkout + Portal verificados sobre tenant real.
4. `billing/status` y `stripe_audit_logs` reflejan cambios en minutos.

---

## 11) Comando unificado (pre-go-live)

Para ejecutar API + auditoria BD en una sola corrida:

```powershell
Set-Location "c:\ruta\al\repo"
.\scripts\ops\pre-go-live.ps1 `
  -ApiBaseUrl "https://api.tudominio.com/api/v1" `
  -JwtToken "<JWT_ADMIN_O_PLATAFORMA>" `
  -SqlServer "localhost,1433" `
  -Database "pos_db" `
  -SqlUser "sa" `
  -SqlPassword "<DB_PASS>" `
  -RunCheckout `
  -RunPortal
```

Para guardar evidencia en archivo `.txt` con timestamp:

```powershell
.\scripts\ops\pre-go-live.ps1 `
  -ApiBaseUrl "https://api.tudominio.com/api/v1" `
  -JwtToken "<JWT_ADMIN_O_PLATAFORMA>" `
  -SqlServer "localhost,1433" `
  -Database "pos_db" `
  -SqlUser "sa" `
  -SqlPassword "<DB_PASS>" `
  -RunCheckout `
  -RunPortal `
  -SaveReport
```

Notas:
- Si algo critico falla, el script termina con `exit code 1`.
- Para rol `plataforma`, agrega `-TenantId <id>`.
- Con `-SaveReport`, el archivo se guarda en `scripts/ops/reports/pre-go-live-YYYYMMDD-HHMMSS.txt`.
- Matriz resumida de comandos: `scripts/ops/README.md`.

### Higiene (documentación)

Si editas documentación de forma extensa, desde la raíz del repositorio ejecuta `npm run verify:docs-links` (sin duplicar lo ya indicado en CONTRIBUTING).

