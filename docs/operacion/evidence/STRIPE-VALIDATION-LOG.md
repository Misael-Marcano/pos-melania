# Registro de validación — Stripe (test / pre-live)

**Entorno:** (test | staging | prod)  
**Fecha:** YYYY-MM-DD  
**Responsable:**  

Marque cada ítem al completarlo (criterio alineado a `docs/operacion/STRIPE-PROD-CHECKLIST.md` §8 y §10).

## 1. Configuración

- [ ] `BILLING_PROVIDER=stripe`
- [ ] `STRIPE_SECRET_KEY` (test o live según entorno)
- [ ] `STRIPE_WEBHOOK_SECRET` del endpoint correspondiente
- [ ] `STRIPE_PRICE_*` definidos y coincidentes con dashboard Stripe
- [ ] `FRONTEND_URL` coincide con origen real del frontend

## 2. Webhook

- [ ] Endpoint `POST /api/v1/billing/webhook` responde `2xx` en eventos de prueba
- [ ] Filas en `stripe_audit_logs` para `checkout.session.completed`, `customer.subscription.updated`, `invoice.payment_failed` (según pruebas realizadas)

## 3. Checkout y Portal

- [ ] Checkout de prueba completa → `stripeCustomerId` / `billingStatus` actualizados en `tenants`
- [ ] Portal de cliente abre y vuelve a `returnUrl` correcta

## 4. Impago y producto

- [ ] Simulación `past_due` / `invoice.payment_failed` actualiza estado y (si SMTP activo) email recibido
- [ ] Con `BILLING_ENFORCE_PAYMENT=true`: API de negocio devuelve **402** y frontend muestra `/cuenta-suspendida`
- [ ] Con SMTP desactivado: trazabilidad mínima verificada en `stripe_audit_logs`

## 5. Evidencia adjunta

- Salida de script / capturas / IDs de evento Stripe (sin secretos):

```
(pegar aquí o referenciar ruta del reporte)
```
