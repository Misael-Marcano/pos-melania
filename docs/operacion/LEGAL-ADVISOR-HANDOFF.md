# Handoff operativo a asesoría legal (preparación)

**Audiencia interna:** comercial, operaciones, ingeniería antes de contratar o reunir con un asesor externo.  
**Alcance:** checklist de **qué reunir y qué enlaces dar**; **no** es asesoría jurídica, **no** sustituye dictamen ni revisión formal, y **no** documenta aquí el resultado de una revisión completada.

**Contacto del asesor / canal seguro para documentos:** `TBD` (rellenar antes del envío).

---

## 1. URLs públicas (rellenar con los dominios reales)

Sustituir los placeholders por las URLs definitivas de **staging** y **producción** (misma ruta relativa en ambos si aplica).

| Recurso | URL (placeholder) |
|--------|---------------------|
| Landing / marketing | `https://…` |
| Login (app) | `https://…` |
| Panel tras autenticación (ejemplo de URL interna) | `https://…` |
| Portal de cliente / facturación del producto (Stripe Customer Portal o equivalente, si está expuesto al usuario) | `https://…` |
| Documentación pública del producto (si existe) | `https://…` |

**Rutas legales en la app (path relativo):** en despliegue, las mismas rutas suelen resolverse como `https://<host>/terminos` y `https://<host>/privacidad` (ver §4).

---

## 2. Mapa de datos (orientación para el asesor)

Resumen **técnico-operativo** para contextualizar tratamiento de datos; el asesor debe cruzar con política interna y jurisdicción.

| Ámbito | Qué describir al asesor |
|--------|-------------------------|
| **Multi-tenant** | Cada organización/tenant tiene datos lógicos separados; identificar quién es responsable frente al usuario final (operador del SaaS vs. comercio cliente). |
| **PII** | Cuentas de usuario, empleados, clientes del POS, proveedores, datos de contacto en demos/solicitudes; campos aproximados según módulos usados en producción. |
| **Pagos (software)** | Facturación del producto vía Stripe (suscripción / portal); qué datos envía/recibe el backend (IDs de cliente, estado de suscripción — sin secretos en esta nota). Runbooks: [`STRIPE-PROD-CHECKLIST.md`](STRIPE-PROD-CHECKLIST.md), hub [`evidence/README.md`](evidence/README.md). |
| **Pagos (negocio del comercio)** | Ventas en caja / métodos de pago del día a día del tenant: aclarar si el asesor debe distinguir «dato del titular del SaaS» vs. «dato del comercio que usa el POS». |
| **Correo y notificaciones** | Envío transaccional (alta, billing, recuperación de contraseña, etc.): proveedor, plantillas a alto nivel, opt-out si aplica. |
| **Logs y trazas** | Retención, acceso interno, si se registran IPs o identificadores de cuenta; enlazar política interna y runbook [`OBSERVABILITY-RUNBOOK.md`](OBSERVABILITY-RUNBOOK.md). Nombres de secretos/CI (sin valores): [`SECRETS-RUNBOOK.md`](SECRETS-RUNBOOK.md). |
| **Auditoría en producto** | Si existe trazabilidad de acciones de usuario en BD (quién vio o cambió qué): solo descripción funcional, sin dumps. |

---

## 3. Documentación de producto / cierre (solo referencia)

- Plan de cierre y workstreams (incl. WS4 legal externo): [`docs/PLAN-CIERRE-PROYECTO.md`](../PLAN-CIERRE-PROYECTO.md)
- Plan maestro SaaS: [`docs/PLAN-IMPLEMENTACION-SAAS-MULTI-TENANT.md`](../PLAN-IMPLEMENTACION-SAAS-MULTI-TENANT.md)
- Decisiones Fase 0 (comercial + defaults): [`docs/arquitectura/SAAS-FASE-0-DECISIONES.md`](../arquitectura/SAAS-FASE-0-DECISIONES.md)

---

## 4. Términos y privacidad en el repositorio (rutas de código)

Las **páginas** viven en el frontend Next.js; el **texto mostrado** es orientativo hasta revisión jurídica (así lo indican las propias pantallas y el README del monorepo).

| Ruta pública | Archivo fuente en repo |
|--------------|-------------------------|
| `/terminos` | `apps/frontend/src/app/terminos/page.tsx` |
| `/privacidad` | `apps/frontend/src/app/privacidad/page.tsx` |

**Enlaces en UI hacia esas rutas (para revisar contexto del usuario):**

| Ubicación | Archivo |
|-----------|---------|
| Landing | `apps/frontend/src/app/page.tsx` |
| Login | `apps/frontend/src/app/(auth)/login/page.tsx` |
| Solicitar demo | `apps/frontend/src/app/solicitar-demo/page.tsx` |

**Resumen en documentación:** `README.md` (sección *Páginas legales (frontend)*).

---

## 5. Checklist antes de la reunión o envío al asesor

- [ ] URLs de §1 rellenas (staging y prod o la política acordada).
- [ ] Contacto y canal seguro acordados (sustituir `TBD` arriba).
- [ ] Mapa de §2 revisado internamente (PII, Stripe, logs) sin pegar secretos ni datos reales de clientes.
- [ ] Enlaces a `/terminos` y `/privacidad` probados en el entorno que verá el asesor.
- [ ] Responsable interno y fecha de seguimiento anotados en ticket o [`docs/PLAN-CIERRE-PROYECTO.md`](../PLAN-CIERRE-PROYECTO.md) *Registro de avance* según política del equipo.

Tras dictamen: incorporar textos acordados en el frontend y registrar conformidad donde corresponda (proceso interno; **no** obligatorio versionar el dictamen en git).
