# SaaS multi-tenant — Fase 0: decisiones y línea base

**Estado:** adoptado para implementación incremental (Fase 1+).  
**Audiencia:** producto, ingeniería, operaciones.  
**Ver también:** `docs/PLAN-CIERRE-PROYECTO.md` · `CONTRIBUTING.md` · `npm run verify:docs-links`  
**Relación:** `docs/PLAN-IMPLEMENTACION-SAAS-MULTI-TENANT.md` · `apps/backend/src/saas/plan-limits.ts`

Este documento fija **política y defaults** antes de construir registro público, trial en base de datos o enforcement agresivo. Los valores marcados como *revisión comercial* deben confirmarse antes del primer go-live masivo.

---

## 1. Modelo de alta de organizaciones (registro)


| Opción | Descripción                                                                 |
| ------ | --------------------------------------------------------------------------- |
| A      | Solo **invitación / provisioning manual**: seed, panel plataforma, scripts. |
| B      | **Registro público** con verificación de email.                             |
| C      | **Formulario “Solicitar demo”** (lead) sin crear tenant automáticamente.    |


**Decisión Fase 0:** **A como camino actual** — las organizaciones se crean con `new-tenant.seed.ts`, operación interna o rol `plataforma`, coherente con el código hoy.

**Próximo paso (Fase 3):** elegir B o C según canal de ventas; implica API, rate limiting, posible CAPTCHA y emails transaccionales.

**Revisión comercial:** fecha objetivo de activar registro público: **(pendiente — rellenar fecha y responsable)**.

**Complemento técnico (opción C ligera):** existe página pública **`/solicitar-demo`** en el frontend para captar leads por correo sin crear tenant; no sustituye la decisión B si el canal de ventas lo exige.

---

## 2. Trial (periodo de prueba)


| Parámetro             | Valor adoptado (Fase 0) | Notas                                                                                                                                               |
| --------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Duración              | **14 días**             | Estándar SaaS B2B; ajustable a 7/30 según oferta.                                                                                                   |
| Plan durante el trial | `**starter`**           | Alineado a `PLAN_LIMITS.starter` (límites: 3 usuarios, 1 sucursal, 500 artículos, módulos core). Misma fuente que `plan-limits.ts`.                 |
| Tras expirar trial    | **Configurable en despliegue** | **Implementado:** banner (`TrialBanner`), pantalla `/cuenta-suspendida`, emails de recordatorio (cron con `CRON_SECRET` → `POST /api/v1/internal/cron/trial-reminders`), y bloqueo opcional con `TRIAL_ENFORCE_EXPIRED=true` (402). **Comercial:** decidir si el estándar es solo avisos o también bloqueo en prod. |


**Revisión comercial:** ¿trial solo en Stripe Checkout o también “trial sin tarjeta”? **(pendiente — hoy coexisten trial por fecha en BD + Stripe `trialing`; documentar política única)**.

---

## 3. Dominios y URLs


| Tema               | Decisión Fase 0                                                                                                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App URL            | Un **origen** de frontend por entorno (`FRONTEND_URL` / `NEXT_PUBLIC_API_URL`). Ej.: `https://app.tudominio.com`.                                                                 |
| Login multi-tenant | **Slug de organización** vía `NEXT_PUBLIC_TENANT_SLUG` fijo por despliegue **o** subdominio / campo en login (`login-tenant-slug.ts`). Sin multi-subdominio por tenant en Fase 0. |
| API                | Un solo host API (`https://api.tudominio.com`); JWT + `tenantId` + opcional `X-Tenant-Id` para rol `plataforma`.                                                                  |


**Próximo paso (opcional):** subdominio `{slug}.tudominio.com` implica DNS wildcard, cookies y CORS; proyecto aparte.

---

## 4. Impago y facturación del software (Stripe)


| Variable                  | Recomendación Fase 0                                                                            | Motivo                                                                     |
| ------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `BILLING_ENFORCE_PAYMENT` | `**false`** hasta validar webhook en producción y flujo Portal.                                 | Evita bloquear clientes si Stripe o webhooks fallan durante el despliegue. |
| Tras go-live estable      | Pasar a `**true`** cuando el equipo de soporte esté listo para mensajes de “cuenta suspendida”. | Documentado en `docs/arquitectura/BILLING-SAAS.md`.                        |


**Revisión comercial:** fecha objetivo `BILLING_ENFORCE_PAYMENT=true` en producción: **(pendiente — recomendación ingeniería: solo tras checklist Stripe live en `STRIPE-PROD-CHECKLIST.md`)**.

---

## 4.1 Valores recomendados para `.env` de producción (ingeniería)

Hasta que comercial confirme lo contrario, usar como **línea base segura**:

| Variable | Valor recomendado inicial | Notas |
|----------|---------------------------|--------|
| `BILLING_ENFORCE_PAYMENT` | `false` | Activar `true` cuando webhooks y Portal estén validados en prod. |
| `TRIAL_ENFORCE_EXPIRED` | `false` | Activar `true` si se acuerda bloqueo duro post-trial sin tarjeta. |
| `NOTIFICATIONS_EMAIL_ENABLED` | `true` si hay SMTP | Imprescindible para dunning y recordatorios de trial. |
| `CRON_SECRET` | cadena aleatoria larga | Obligatorio si se programa el cron de recordatorios de trial. |
| `FRONTEND_URL` | URL real del frontend | CORS, enlaces en emails y Stripe return URLs. |

---

## 5. Variables de entorno (línea base)

Los placeholders de trial “global” y registro público están en `**.env.example`** (sección `SaaS Fase 0`).  
**Importante:** `SAAS_TRIAL`_* y `PUBLIC_REGISTRATION_*` siguen siendo **intención** hasta que el backend los lea de forma centralizada.

**Ya implementado (provisioning / modelo):**

| Elemento                      | Rol                                                                                                                                 |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Columna `tenants.trialEndsAt` | Fecha/hora fin de trial (nullable). Migración `1700000000034-TenantTrialEndsAt`.                                                     |
| `TRIAL_DAYS`                  | Opcional al ejecutar `new-tenant.seed.ts`: si es un entero `> 0`, fija `trialEndsAt` a **hoy + N días** al crear la organización.     |
| `TRIAL_ENFORCE_EXPIRED`       | Opt-in: bloqueo API (402) si el trial venció y no hay suscripción `active`/`trialing`. Ver `BILLING-SAAS.md`.                        |
| Flags recordatorio email      | `trialReminderWeekSent`, `trialReminderLastDaySent` + cron `CRON_SECRET` (ver `DEPLOY-SAAS.md`).                                    |
| Legal (plantilla frontend)    | Rutas `/terminos` y `/privacidad` (texto genérico; revisar antes de go-live público).                                                 |

**Planeado (futuro):**

| Variable (planeada)           | Rol                                                                                                        |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `FRONTEND_URL`                | Ya usada en backend (CORS, enlaces en eventos de billing). Debe coincidir con el origen real del frontend. |
| `SAAS_TRIAL_DAYS`             | Futuro: duración del trial en días (sustituto o complemento de `TRIAL_DAYS` en seed si se unifica política). |
| `SAAS_TRIAL_PLAN_CODE`        | Futuro: `starter`                                                                                          |
| `PUBLIC_REGISTRATION_ENABLED` | Futuro: `true` cuando exista endpoint de registro.                                                         |


---

## 6. Criterio de cierre de Fase 0

- Decisiones escritas en este documento.
- `.env.example` actualizado con comentarios y `FRONTEND_URL`.
- Equipo confirma filas “Revisión comercial” (fecha o responsable).
- Tras confirmación: marcar en `docs/PLAN-IMPLEMENTACION-SAAS-MULTI-TENANT.md` que Fase 0 está **cerrada** y comenzar Fase 1 (inventario de aislamiento).

### Cómo cerrar esta sección

Checklist operativo para la reunión WS1 (ver `docs/PLAN-CIERRE-PROYECTO.md`). Sustituir `TBD` por valores reales solo tras acuerdo del equipo; no versionar secretos ni datos personales.

| Paso | Acción | Owner | Fecha / reunión |
|------|--------|-------|-----------------|
| 1 | Agendar reunión comercial + ingeniería (30–60 min) | **TBD** | **TBD** |
| 2 | Designar responsable de seguimiento de este documento hasta cierre formal | **TBD** | **TBD** |
| 3 | Actualizar las filas *Revisión comercial* de §1, §2 y §4 (fecha y responsable donde aplique) | **TBD** | **TBD** |
| 4 | Acordar política única de trial (BD vs Stripe) y anotarla en §2 | **TBD** | **TBD** |
| 5 | Solo con checklist Stripe live cumplido: fijar fecha objetivo de `BILLING_ENFORCE_PAYMENT=true` en §4 | **TBD** | **TBD** |
| 6 | Marcar los ítems de la lista anterior (§6) como cumplidos con evidencia o acta interna acordada | **TBD** | **TBD** |

---

## 7. Historial de cambios


| Fecha      | Cambio                                              |
| ---------- | --------------------------------------------------- |
| 2026-04-18 | Creación del documento Fase 0 y defaults iniciales. |
| 2026-04-19 | Alineación con `trialEndsAt` en BD, seed `TRIAL_DAYS` y contexto SaaS. |
| 2026-05-11 | Tabla §4.1 defaults prod; revisiones comercial explícitas como pendientes; enlace flujo demo. |
| 2026-05-12 | Subsección §6 *Cómo cerrar esta sección*: checklist operativo WS1 con placeholders `TBD`. |
