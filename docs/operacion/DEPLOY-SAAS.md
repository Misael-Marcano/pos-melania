# Runbook de despliegue — POS SaaS

Guía operativa para desplegar una nueva instancia y agregar organizaciones.

**Nombres de secretos** (GitHub Actions vs variables de runtime como Stripe y cron): `docs/operacion/SECRETS-RUNBOOK.md`.

**Plan de cierre (go-live, workstreams WS1–WS6, registro de avance en repo, hub de evidencia):** [`docs/PLAN-CIERRE-PROYECTO.md`](../PLAN-CIERRE-PROYECTO.md).

**Higiene (documentación):** Tras ediciones en bloque de `docs/`, ejecutar desde la raíz del repositorio `npm run verify:docs-links`.

---

## 1. Prerequisitos

| Componente | Versión mínima |
|------------|----------------|
| Docker + Compose | 24+ |
| Node.js (para scripts) | 20 LTS |
| SQL Server | 2019 Express o superior |
| Redis | 7+ |

---

## 2. Primera instalación

### 2.1 Clonar y configurar entorno

```bash
git clone <repo>
cd pos-melania
cp .env.example .env.production
# Editar .env.production con los valores reales (ver sección Variables)
```

### 2.2 Variables obligatorias en `.env.production`

```env
# Base de datos
DB_USER=sa
DB_PASS=<contraseña_segura>
DB_NAME=pos_db

# JWT — generar con: openssl rand -hex 32
JWT_SECRET=<64_chars_aleatorios>
JWT_REFRESH_SECRET=<64_chars_aleatorios_diferentes>

# URLs
FRONTEND_URL=https://app.tudominio.com
NEXT_PUBLIC_API_URL=https://api.tudominio.com/api/v1

# Marca
NEXT_PUBLIC_APP_SHORT_NAME=NombreApp
NEXT_PUBLIC_APP_COPYRIGHT_ENTITY=Tu Empresa SRL
```

### 2.3 Arrancar servicios

```bash
docker compose -f docker-compose.production.yml --env-file .env.production up -d

# Verificar salud
docker compose -f docker-compose.production.yml ps
curl http://localhost:4000/health
```

El backend aplica migraciones automáticamente al arrancar.

### 2.4 Crear la primera organización y su admin

```bash
cd apps/backend
TENANT_NOMBRE="Mi Empresa SRL" \
TENANT_SLUG="mi-empresa" \
ADMIN_EMAIL="admin@miempresa.com" \
ADMIN_PASSWORD="CambiarEsto123!" \
PLAN_CODE="standard" \
TRIAL_DAYS=14 \
ts-node src/seeds/new-tenant.seed.ts
```

---

## 3. Agregar una nueva organización

Mismo comando que el paso 2.4, con los datos del nuevo cliente:

```bash
cd apps/backend
TENANT_NOMBRE="Ferretería ABC" \
TENANT_SLUG="ferreteria-abc" \
ADMIN_EMAIL="admin@ferreteria-abc.com" \
ADMIN_PASSWORD="CambiarEsto123!" \
PLAN_CODE="starter" \
TRIAL_DAYS=14 \
ts-node src/seeds/new-tenant.seed.ts
```

`TRIAL_DAYS` es opcional: si se omite, `trialEndsAt` queda sin fijar en el alta. Ver `docs/arquitectura/SAAS-FASE-0-DECISIONES.md` (trial).

El admin del tenant puede cambiar su contraseña desde el primer login.

---

## 4. Configurar Stripe (si aplica)

1. Crear **Products** y **Prices** recurrentes en el dashboard de Stripe.
2. Añadir a `.env.production`:
   ```env
   BILLING_PROVIDER=stripe
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRICE_STARTER=price_...
   STRIPE_PRICE_STANDARD=price_...
   STRIPE_PRICE_ENTERPRISE=price_...
   ```
3. Registrar el webhook en Stripe dashboard:
   - URL: `https://api.tudominio.com/api/v1/billing/webhook`
   - Eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
4. Para activar bloqueo por impago: `BILLING_ENFORCE_PAYMENT=true`
5. Ejecutar validación operativa completa: `docs/operacion/STRIPE-PROD-CHECKLIST.md`

---

## 5. Configurar email (si aplica)

```env
NOTIFICATIONS_EMAIL_ENABLED=true
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxx
SMTP_FROM="POS App <noreply@tudominio.com>"
```

Se envían emails automáticamente ante: pago fallido, suscripción cancelada, suscripción activada y **recordatorios de trial** (si configuras el cron más abajo).

### Recordatorios de trial (cron)

Requiere migración `1700000000035` (columnas `trialReminderWeekSent`, `trialReminderLastDaySent` en `tenants`), `NOTIFICATIONS_EMAIL_ENABLED=true`, SMTP y `CRON_SECRET` en el backend.

Programar **una vez al día** (por ejemplo 09:00 hora del servidor o UTC):

```bash
curl -sS -X POST "https://api.tudominio.com/api/v1/internal/cron/trial-reminders" \
  -H "X-Cron-Secret: ${CRON_SECRET}"
```

- **Semana**: envía un correo la primera vez que el trial entra en el rango de **2 a 7 días** restantes (texto con días concretos).
- **Último día**: envía cuando quedan **0 o 1** días (variante “último día”).
- Si el tenant ya tiene suscripción Stripe `active` o `trialing`, no se envía.
- Si `NOTIFICATIONS_EMAIL_ENABLED` no está activo, el job no marca flags (volverá a intentar cuando haya SMTP).

---

## 6. Actualizaciones

```bash
git pull
docker compose -f docker-compose.production.yml --env-file .env.production build
docker compose -f docker-compose.production.yml --env-file .env.production up -d
```

Las migraciones se ejecutan automáticamente al reiniciar el backend.

### Smoke tras despliegue

- Comprobar el backend con **`GET /health`** (por ejemplo `curl` contra la URL pública del API).
- Opcional: **`npm run verify`** desde el pipeline solo si el artefacto o el job incluye la raíz del monorepo; si el despliegue solo publica el frontend empaquetado sin el repo, ejecutar `npm run verify` en un job de CI que tenga el monorepo completo.

### Rollback

```bash
# Revertir última migración (ejecutar dentro del contenedor o con .env cargado)
docker compose exec backend npm run migration:revert

# O volver a la imagen anterior
docker compose -f docker-compose.production.yml --env-file .env.production up -d --no-build
```

---

## 7. Backups

Ver `docs/operacion/BACKUP-SQL-SERVER.md` para el runbook completo de backup de SQL Server.

Resumen rápido:
```bash
# Backup del volumen SQL Server
docker run --rm \
  --volumes-from pos_sqlserver \
  -v $(pwd)/backups:/backup \
  ubuntu tar czf /backup/sqlserver_$(date +%Y%m%d_%H%M).tar.gz /var/opt/mssql
```

---

## 8. Monitoreo

**Alertas y respuesta ante incidentes:** ver `docs/operacion/OBSERVABILITY-RUNBOOK.md` (métricas mínimas, 2–3 alertas recomendadas y **§7 — ante una alerta**).

| Endpoint | Qué indica |
|----------|------------|
| `GET /health` | Backend vivo |
| `GET /api/v1/billing/status` (admin JWT) | Estado Stripe |
| `GET /api/v1/saas/context` (admin JWT) | Plan y uso |
| `GET /api/v1/tenants/panel` (plataforma JWT) | Todas las orgs con métricas |

Validacion operativa de billing (script):

```powershell
Set-Location "<repo>"
.\scripts\ops\check-stripe-readiness.ps1 -ApiBaseUrl "https://api.tudominio.com/api/v1" -JwtToken "<JWT>"
```

Validacion de auditoria Stripe en BD:

```powershell
Set-Location "<repo>"
.\scripts\ops\check-stripe-audit.ps1 -SqlServer "localhost,1433" -Database "pos_db" -SqlUser "sa" -SqlPassword "<DB_PASS>"
```

Ejecucion unificada pre-go-live (API + BD):

```powershell
Set-Location "<repo>"
.\scripts\ops\pre-go-live.ps1 -ApiBaseUrl "https://api.tudominio.com/api/v1" -JwtToken "<JWT>" -SqlServer "localhost,1433" -Database "pos_db" -SqlUser "sa" -SqlPassword "<DB_PASS>"
```

Para generar evidencia de release en `.txt`:

```powershell
.\scripts\ops\pre-go-live.ps1 -ApiBaseUrl "https://api.tudominio.com/api/v1" -JwtToken "<JWT>" -SqlServer "localhost,1433" -Database "pos_db" -SqlUser "sa" -SqlPassword "<DB_PASS>" -SaveReport
```

---

## 9. Gestión de tenants desde el panel web

1. Autenticarse con un usuario de rol **`plataforma`**.
2. En el selector de organización (`/select-organizacion`), elegir la org a gestionar.
3. Para la vista global de todas las organizaciones: **Panel instancia** en el sidebar (`/plataforma`).

---

## 10. Checklist pre-lanzamiento

- [ ] Contraseñas de BD y JWT cambiadas (no usar defaults del repo)
- [ ] `SWAGGER_ENABLED=false` en producción
- [ ] Webhook Stripe registrado y verificado
- [ ] Backup automatizado configurado
- [ ] DNS apuntando a los servidores correctos
- [ ] SSL/TLS configurado (nginx reverse proxy o Caddy recomendado)
- [ ] Primera organización creada con `new-tenant.seed.ts`
- [ ] Login de prueba exitoso
