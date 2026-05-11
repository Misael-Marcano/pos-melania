# Secretos y cabeceras sensibles — referencia (sin valores)

Este runbook lista **nombres** de variables y dónde se usan. **No** pegues valores reales en tickets ni en git.

Si falla el entorno local (shell, Docker, paths) al probar secretos, ver [TROUBLESHOOTING-DEV.md](TROUBLESHOOTING-DEV.md).

Si vas a tocar muchos `.md` a la vez, ejecuta desde la raíz `npm run verify:docs-links` para validar enlaces relativos antes de abrir el PR.

## 1. GitHub Actions (repositorio)

| Secreto (nombre sugerido) | Dónde se consume | Propósito |
|---------------------------|------------------|-----------|
| `E2E_EMAIL` | `.github/workflows/e2e-manual.yml` | Usuario de prueba en staging para Playwright. |
| `E2E_PASSWORD` | Mismo workflow | Contraseña del usuario de prueba. |
| `PLAYWRIGHT_BASE_URL` | Mismo workflow | URL base del frontend ya desplegado (p. ej. `https://staging-app.example.com`). |

Guía E2E (local, staging, disparo manual): **[E2E-STAGING.md](E2E-STAGING.md)**. Configuración en GitHub: **Settings → Secrets and variables → Actions**. Archivo del workflow: `.github/workflows/e2e-manual.yml` (nombre en UI: **E2E Playwright (manual dispatch)**).

Si en el futuro un workflow de despliegue inyectara Stripe u otros desde GitHub, documentar aquí el nombre exacto del secreto y el job que lo lee.

## 2. Backend en runtime (hosting / `.env` producción)

No son obligatoriamente secretos de GitHub; suelen vivir en el proveedor de hosting o en un gestor de secretos.

| Variable | Uso |
|----------|-----|
| `STRIPE_SECRET_KEY` | API Stripe (servidor). |
| `STRIPE_WEBHOOK_SECRET` | Firma de eventos `POST /api/v1/billing/webhook` (`whsec_…`). |
| `CRON_SECRET` | Cabecera esperada en `POST /api/v1/internal/cron/trial-reminders` (recordatorios de trial por email). |

Referencias: `docs/arquitectura/BILLING-SAAS.md`, `docs/operacion/DEPLOY-SAAS.md`, `.env.example` en la raíz del repo.

## 3. Rotación e incidentes

- **Webhook Stripe:** si rota el signing secret en el dashboard de Stripe, actualizar `STRIPE_WEBHOOK_SECRET` en todos los entornos que reciban webhooks y reiniciar el backend.
- **Cron:** rotar `CRON_SECRET` y actualizar el scheduler (curl, GitHub scheduled workflow, etc.) que envía `X-Cron-Secret`.
- **E2E:** rotar credenciales de la cuenta de staging y los tres secretos de Actions si la cuenta quedó expuesta.
