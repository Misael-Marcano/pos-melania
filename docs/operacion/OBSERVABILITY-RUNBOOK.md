# Observabilidad y alertas — runbook mínimo

Objetivo: cumplir el criterio de [docs/PLAN-IMPLEMENTACION-SAAS-MULTI-TENANT.md](../PLAN-IMPLEMENTACION-SAAS-MULTI-TENANT.md) Fase 4.1 sin imponer un proveedor concreto.

## 1. Lo que ya existe en código

- Cabecera **`X-Request-Id`** por petición y token en logs Morgan (`apps/backend/src/middlewares/request-id.middleware.ts`, `app.ts`).
- Rate limits en login, refresh, reportes, PDF de cierre y API global.

## 2. Métricas mínimas recomendadas

| Métrica | Fuente típica | Uso |
|---------|----------------|-----|
| Tasa de **5xx** por ruta o prefijo `/api/v1` | reverse proxy (nginx), APM o logs agregados | Detectar regresiones tras deploy |
| Latencia **p95** del API | APM o métricas del balanceador | Degradación de BD o CPU |
| **Webhook Stripe** `4xx`/`5xx` y cuerpo rechazado | logs del backend filtrando `billing/webhook` | Firma incorrecta o payload inválido |
| Redis / SQL **conexión** | healthchecks Docker o monitor del host | Caída de dependencias |

## 3. Alertas (2–3 condiciones críticas)

Ejemplos a configurar en el sistema de monitoreo elegido (Datadog, Grafana Cloud, Uptime Kuma, etc.):

1. **API down:** `GET /health` distinto de `200` durante N minutos.
2. **Errores elevados:** ratio de `5xx` / total > umbral en ventana de 5 minutos.
3. **Webhook Stripe:** más de X respuestas `400` en 15 minutos (posible secreto rotado o tráfico malicioso).

Rotación de `STRIPE_WEBHOOK_SECRET` y otros secretos runtime: [SECRETS-RUNBOOK.md § 3](SECRETS-RUNBOOK.md#3-rotación-e-incidentes).

## 4. Correlación en incidentes

- Recoger **`X-Request-Id`** del cliente o de los logs del proxy.
- Buscar la misma cadena en logs del backend para la traza completa.

## 5. Revisión periódica

- Tras cada cambio en facturación o auth, validar que los dashboards siguen alimentados.
- Documentar aquí el **enlace al dashboard** interno (no público) si aplica:

```
URL dashboard: ___
Responsable on-call: ___
```

## 6. Ante una alerta (guía rápida)

Usar esta sección como checklist operativo; enlazada desde [DEPLOY-SAAS.md](DEPLOY-SAAS.md) §8.

| Alerta | Comprobar primero | Acciones típicas |
|--------|-------------------|------------------|
| **`/health` no 200** | Contenedor backend, SQL Server, Redis; DNS/SSL del proxy | Reinicio controlado del stack; ver logs del backend en la ventana del incidente; escalar si BD corrupta o disco lleno. |
| **Pico de `5xx`** | Deploy reciente; saturación DB; timeouts | Correlacionar con `X-Request-Id` (§4); revertir imagen si coincide con release; revisar queries lentas / pool de conexiones. |
| **Webhook Stripe `4xx`/`5xx`** | `STRIPE_WEBHOOK_SECRET` y URL del endpoint en Stripe; reloj del servidor | Verificar firma y payload en logs (`billing/webhook`); reprocesar eventos desde Stripe si aplica; coordinar con [STRIPE-PROD-CHECKLIST.md](STRIPE-PROD-CHECKLIST.md) §8–10. |

Tras mitigar: anotar causa raíz breve y, si aplica, actualizar umbrales o runbooks en la wiki interna (sin secretos en git).

## Doc hygiene (enlaces)

Si el PR modifica `docs/`, desde la raíz del repo ejecutar `npm run verify:docs-links` antes de abrir/revisar el PR (comprueba enlaces internos en Markdown).
