# Plan de cierre del proyecto (ejecución)

**Audiencia:** comercial, operaciones, legal, ingeniería.  
**Objetivo:** cerrar el ciclo “listo para operar SaaS multi-tenant en producción” con pasos **accionables**, responsables y evidencia donde aplique — sin sustituir los documentos de referencia.

**Alineación:** la definición de “cerrado” y el alcance de producto siguen el plan maestro SaaS y su checklist operativo en `docs/PLAN-IMPLEMENTACION-SAAS-MULTI-TENANT.md` (Fases 0–4 y sección *Checklist rápido «¿listo para vender SaaS multi-tenant?»*). Este archivo es el **plan de ejecución de cierre**: qué falta fuera del código, en qué orden y cómo demostrarlo.

---

## Definición de «proyecto cerrado» (criterio único)

Se considera **cerrado para go-live / venta controlada** cuando se cumplen **simultáneamente**:

1. **Checklist del plan SaaS** — todos los ítems marcados como obligatorios en `docs/PLAN-IMPLEMENTACION-SAAS-MULTI-TENANT.md` (*Checklist rápido*), en particular los que siguen **sin marcar** en ese documento al cierre de la última revisión (Stripe live con evidencia, backup + restore probado, revisión jurídica externa antes de escala).
2. **Fase 0 comercial** — criterio de §6 de `docs/arquitectura/SAAS-FASE-0-DECISIONES.md`: filas *Revisión comercial* completadas y checklist de esa sección marcada tras confirmación del equipo.
3. **Sin bloqueantes P0 abiertos** sin dueño — usar `docs/ISSUES-SAAS-BACKLOG.md` como inventario de issues; cualquier gap P0 debe tener responsable y fecha objetivo. *(Ingeniería: Issues 3–4 cerrados en repo — inventario + suites tenant-isolation incl. configuración; ver `docs/arquitectura/TENANT-ISOLATION-INVENTORY.md`.)*

Los ítems ya marcados como hechos en el checklist del plan maestro (aislamiento + tests, E2E mínimo, trial implementado, emails/auditoría, observabilidad documentada, legal mínimo en UI, landing/planes) **no se repiten aquí** salvo donde el cierre exige **evidencia en entorno real** (p. ej. observabilidad *conectada* en prod).

---

## Índice — documentación de apoyo (repo)

Atajo a plantillas y runbooks que apoyan el cierre por workstream (rutas bajo `docs/`).

| Workstream | Documento |
|------------|-----------|
| WS1 | [`SAAS-FASE-0-DECISIONES.md`](arquitectura/SAAS-FASE-0-DECISIONES.md) |
| WS2 | [`STRIPE-VALIDATION-LOG.md`](operacion/evidence/STRIPE-VALIDATION-LOG.md) |
| WS3 | [`BACKUP-RESTORE-DRILL-LOG.md`](operacion/evidence/BACKUP-RESTORE-DRILL-LOG.md) |
| WS4 | [`LEGAL-ADVISOR-HANDOFF.md`](operacion/LEGAL-ADVISOR-HANDOFF.md) |
| WS5 | [`OBSERVABILITY-RUNBOOK.md`](operacion/OBSERVABILITY-RUNBOOK.md) |
| WS6 | [`E2E-STAGING.md`](operacion/E2E-STAGING.md) |
| WS2–WS6 (hub evidencia) | [`evidence/README.md`](operacion/evidence/README.md) |

---

## Runbooks y plantillas de evidencia (enlaces)

La verificación raíz `npm run verify` incluye `npm run verify:docs-links` para validar enlaces internos de `docs/`.

| Recurso | Ruta |
|--------|------|
| Seguridad (divulgación responsable; enlace a plan de cierre / evidencia) | `SECURITY.md` |
| Estilo de edición común (EditorConfig) | `.editorconfig` |
| Normalización de fin de línea (Git) | `.gitattributes` |
| Pin de versión Node.js (local / nvm) | `.nvmrc` |
| Guía para contribuir (clone, tests, PR) | `CONTRIBUTING.md` |
| Workflows CI + E2E manual (GitHub Actions) | `.github/workflows/` |
| Enlaces internos en `docs/` (Markdown) | `scripts/check-docs-links.mjs`; `npm run verify:docs-links`; CI: job **TypeScript + Unit tests** (paso *Verify docs internal .md links* en `.github/workflows/ci.yml`) (modo diagnóstico: `node scripts/check-docs-links.mjs --verbose`) |
| Plantilla de issue (backlog SaaS / cierre) | `.github/ISSUE_TEMPLATE/saas-backlog.md` |
| E2E contra staging / secretos CI | `docs/operacion/E2E-STAGING.md` |
| Tests integración backend en local (SQL Server + Redis) | `docs/operacion/INTEGRATION-TESTS-LOCAL.md` |
| Desarrollo local: PowerShell, Docker, enlaces en docs | `docs/operacion/TROUBLESHOOTING-DEV.md` |
| Stripe producción / pre-live | `docs/operacion/STRIPE-PROD-CHECKLIST.md` |
| Backup SQL Server | `docs/operacion/BACKUP-SQL-SERVER.md` |
| Observabilidad y alertas | `docs/operacion/OBSERVABILITY-RUNBOOK.md` |
| Hub de evidencia operativa (plantillas Stripe/backup, qué subir / qué no) | `docs/operacion/evidence/README.md` |
| Decisiones Fase 0 (comercial + defaults) | `docs/arquitectura/SAAS-FASE-0-DECISIONES.md` |
| Backlog de issues SaaS | `docs/ISSUES-SAAS-BACKLOG.md` |
| Plantilla log Stripe | `docs/operacion/evidence/STRIPE-VALIDATION-LOG.md` |
| Plantilla drill restore | `docs/operacion/evidence/BACKUP-RESTORE-DRILL-LOG.md` |
| Checklist preparación handoff a asesor legal (WS4) | `docs/operacion/LEGAL-ADVISOR-HANDOFF.md` |
| Nombres de secretos (GitHub + runtime) | `docs/operacion/SECRETS-RUNBOOK.md` |
| Export OpenAPI local | `docs/operacion/OPENAPI.md` |

---

## Workstreams ordenados (ejecutar en este orden lógico)

### WS1 — Comercial: cerrar Fase 0 (`SAAS-FASE-0-DECISIONES`)

| Campo | Contenido |
|--------|-----------|
| **Estado en repo** | Documento **escrito** y técnicamente alineado; **pendiente** cierre formal: filas *Revisión comercial* con «(pendiente — rellenar fecha y responsable)» en §1 (registro), §2 (trial / tarjeta), §4 (fecha `BILLING_ENFORCE_PAYMENT=true`); §6 checklist no puede marcarse completa hasta esa revisión. |
| **Próximo paso concreto** | Reunión 30–60 min con comercial + ingeniería: rellenar fechas y responsables en esas filas; decidir política única trial (BD vs Stripe); acordar fecha objetivo de enforcement tras Stripe live. |
| **Responsable sugerido** | **Comercial** (dueño de fechas y política); **Ingeniería** (validar viabilidad técnica y orden con WS2). |
| **Artefacto de evidencia** | Mismo `docs/arquitectura/SAAS-FASE-0-DECISIONES.md` actualizado (sin secretos); opcional: acta breve en ticket enlazado desde `docs/ISSUES-SAAS-BACKLOG.md` (Issues 1–2). |

---

### WS2 — Stripe live + evidencia

| Campo | Contenido |
|--------|-----------|
| **Estado en repo** | Código billing/webhook/portal **implementado**; checklist del plan maestro: Stripe **live** y evidencia en log **pendientes** (`[ ]` en `docs/PLAN-IMPLEMENTACION-SAAS-MULTI-TENANT.md`). Plantillas vacías o locales: `docs/operacion/evidence/STRIPE-VALIDATION-LOG.md`. |
| **Próximo paso concreto** | Ejecutar `docs/operacion/STRIPE-PROD-CHECKLIST.md` en entorno **live** (claves live, webhook URL prod, precios live); completar `STRIPE-VALIDATION-LOG.md` (copia en `evidence/` según `evidence/README.md`); solo entonces fijar en WS1 la fecha de `BILLING_ENFORCE_PAYMENT=true` si aplica. |
| **Responsable sugerido** | **Ingeniería** (configuración técnica, pruebas); **Ops** (acceso dashboard Stripe, rotación secretos); **Comercial** (aceptación de mensajes de impago/suspensión). |
| **Artefacto de evidencia** | `docs/operacion/evidence/STRIPE-VALIDATION-LOG.md` (relleno + fecha + responsable); export o notas auditable en `stripe_audit_logs` según checklist §8–10 del runbook Stripe. **Paridad con backup:** misma convención de evidencia que [`docs/operacion/evidence/BACKUP-RESTORE-DRILL-LOG.md`](operacion/evidence/BACKUP-RESTORE-DRILL-LOG.md) (WS3) y hub [`docs/operacion/evidence/README.md`](operacion/evidence/README.md). |

---

### WS3 — Backup: drill real de restore

| Campo | Contenido |
|--------|-----------|
| **Estado en repo** | Runbook `docs/operacion/BACKUP-SQL-SERVER.md` y plantilla `docs/operacion/evidence/BACKUP-RESTORE-DRILL-LOG.md` **presentes**; ítem checklist plan maestro **pendiente** (restore probado con evidencia). |
| **Próximo paso concreto** | Programar ventana en **staging** (mínimo): restore desde backup real o copia anonimizada; cronometrar; documentar en `BACKUP-RESTORE-DRILL-LOG.md`; si política lo exige, repetir trimestral en prod con procedimiento del runbook. |
| **Responsable sugerido** | **Ops** (ejecución drill); **Ingeniería** (validación app tras restore). |
| **Artefacto de evidencia** | `docs/operacion/evidence/BACKUP-RESTORE-DRILL-LOG.md` con resultado OK, fecha, entorno y responsable (sin rutas con credenciales). |

---

### WS4 — Legal externo (antes de escala)

| Campo | Contenido |
|--------|-----------|
| **Estado en repo** | Rutas `/terminos` y `/privacidad` **publicadas** (checklist plan maestro marcado); **revisión jurídica externa** explícitamente pendiente antes de escala. |
| **Próximo paso concreto** | Reunir URLs y mapa de datos con la checklist en [`docs/operacion/LEGAL-ADVISOR-HANDOFF.md`](operacion/LEGAL-ADVISOR-HANDOFF.md) (placeholders `https://…`, contacto `TBD`); enviar a asesor externo; incorporar cambios de texto en frontend; registrar fecha de “aprobado para publicación” en ticket interno. |
| **Responsable sugerido** | **Legal** / asesor externo; **Comercial** (prioridad y presupuesto); **Ingeniería** (despliegue de textos acordados). |
| **Artefacto de evidencia** | Dictamen o email de conformidad (no necesariamente en git; referencia en wiki/ticket); enlaces finales visibles desde login/landing según `docs/PLAN-IMPLEMENTACION-SAAS-MULTI-TENANT.md` Fase 4.3. |

---

### WS5 — Observabilidad en producción

| Campo | Contenido |
|--------|-----------|
| **Estado en repo** | Runbook `docs/operacion/OBSERVABILITY-RUNBOOK.md` y prácticas en código (p. ej. `X-Request-Id`) **hechos** según checklist plan maestro; **pendiente** por entorno: conectar proveedor (logs/APM/uptime) y **alertas reales** en prod. |
| **Próximo paso concreto** | Seguir runbook: integrar destino de logs/métricas del entorno prod; crear 2–3 alertas (p. ej. tasa 5xx, fallos webhook Stripe); documentar canal de guardia y enlace al dashboard en el mismo runbook o wiki ops. Checklist previa en `OBSERVABILITY-RUNBOOK.md` §4; guía «ante alerta» en §7; enlace desde `DEPLOY-SAAS.md` §8. |
| **Responsable sugerido** | **Ops** (cuentas, alertas); **Ingeniería** (queries/dashboards si aplica). |
| **Artefacto de evidencia** | Captura o enlace interno al dashboard + lista de alertas activas (política de no versionar secretos: ver `docs/operacion/evidence/README.md`). |

---

### WS6 — E2E manual / staging y secretos

| Campo | Contenido |
|--------|-----------|
| **Estado en repo** | Playwright + smoke + workflow manual documentados (**hecho**); `docs/operacion/E2E-STAGING.md` alineado con job real (solo frontend + Chromium contra URL en secretos; sin SQL en ese workflow); E2E en cada PR **opcional**; secretos: `E2E_EMAIL`, `E2E_PASSWORD`, `PLAYWRIGHT_BASE_URL`. |
| **Próximo paso concreto** | Configurar secretos en GitHub (lista de nombres: `docs/operacion/SECRETS-RUNBOOK.md` §1) o ejecutar local según `docs/operacion/E2E-STAGING.md`, incl. snippet PowerShell; disparar workflow manual documentado; archivar resultado (log o artefacto CI) según política interna. |
| **Responsable sugerido** | **Ingeniería** (pipeline); **Ops** (credenciales de prueba en staging). |
| **Artefacto de evidencia** | Run verde en Actions + enlace al run; opcional: nota en ticket de release. |

---

### WS7 — Opcional: registro público (Issue 9, opción B)

| Campo | Contenido |
|--------|-----------|
| **Estado en repo** | Decisión Fase 0: **A** (invitación / provisioning); **Opción B** (POST público tenant + admin) **no implementada**; existe complemento **C** ligero (`/solicitar-demo`). Ver `docs/ISSUES-SAAS-BACKLOG.md` Issue 9. |
| **Próximo paso concreto** | Solo si WS1 elige canal self-service: especificar alcance (rate limit, email verificación, slug único); issue/ticket derivado; implementación en sprint dedicado **fuera** del cierre mínimo del checklist actual. |
| **Responsable sugerido** | **Comercial** (go / no-go); **Ingeniería** (API + seguridad); **Ops** (límites abuso). |
| **Artefacto de evidencia** | OpenAPI actualizado; pruebas de integración + E2E del flujo de alta; decisión reflejada en `SAAS-FASE-0-DECISIONES.md`. |

---

## Resumen de dependencias

- **WS1** desbloquea fechas de enforcement y trial en prod.  
- **WS2** es prerequisito duro para `BILLING_ENFORCE_PAYMENT=true` y cierre del ítem Stripe del checklist maestro.  
- **WS3** y **WS4** pueden avanzar en paralelo con WS2.  
- **WS5** debe existir antes de declarar “producción operable” aunque el checklist marque runbook como hecho.  
- **WS6** valida regresión end-to-end sin ampliar alcance funcional.  
- **WS7** es **post-cierre mínimo** salvo decisión comercial explícita.

---

## Registro de avance (repo)

Hechos **versionados** en esta línea de trabajo (no marca como hechos los ítems operativos humanos de WS1–WS6 sin evidencia en repo).

| Ítem | Estado | Nota | Fecha |
|------|--------|------|-------|
| Historial en `origin/main` agrupado por tema (ventas; backend auditoría + tests; frontend POS borrador + Vitest; chore monorepo) | Hecho | Push de commits locales ordenados al remoto | 2026-05-12 |
| Chore `*.tsbuildinfo`; dejar de versionar `apps/frontend/tsconfig.tsbuildinfo` | Hecho | Referencia de historia: `6ccc9f1` | 2026-05-12 |
| Docs troubleshooting Windows (rutas largas); enlaces en hub `docs/operacion/evidence/*` y plantilla `STRIPE-VALIDATION-LOG` | Hecho | Commit `c7dc102` | 2026-05-12 |
| Gate `npm run verify` (incluye `verify:docs-links`) previo a sincronizar documentación de cierre | Hecho | Verificación local verde (mismo gate que enlaces internos en `docs/`) | 2026-05-12 |
| Doc: checklist en `docs/operacion/E2E-STAGING.md` — secretos GitHub (`E2E_EMAIL`, `E2E_PASSWORD`, `PLAYWRIGHT_BASE_URL`) solo como nombres, sin valores | Hecho | Apoyo operativo a WS6 (config); no sustituye run verde ni secretos reales en el remoto | 2026-05-12 |
| Doc: checklist previa al drill en `docs/operacion/evidence/BACKUP-RESTORE-DRILL-LOG.md` (WS3; sin fechas de ejemplo) | Hecho | Complementa `BACKUP-SQL-SERVER.md`; no sustituye restore ejecutado ni filas de evidencia rellenas | 2026-05-12 |
| Doc: subsección «Cómo cerrar esta sección» (tabla checklist) en `docs/arquitectura/SAAS-FASE-0-DECISIONES.md` §6 — WS1; placeholders `TBD` | Hecho | Guía operativa repo-only; no sustituye reunión ni filas *Revisión comercial* rellenas | 2026-05-12 |
| Doc: checklist **previa a live** en `docs/operacion/evidence/STRIPE-VALIDATION-LOG.md` — WS2; enlaces a `STRIPE-PROD-CHECKLIST.md` / hub evidence | Hecho | Orden repo antes de Stripe live; **no** marca live ni WS2 completados | 2026-05-12 |
| Doc: `docs/operacion/LEGAL-ADVISOR-HANDOFF.md` — checklist preparación asesor (URLs placeholder, mapa datos PII/pagos/logs, rutas repo `/terminos` / `/privacidad`) | Hecho | Apoyo WS4 repo-only; **no** sustituye dictamen, revisión externa ni “legal operativo cerrado” | 2026-05-12 |
| Doc: checklist **previa a conectar prod** en `docs/operacion/OBSERVABILITY-RUNBOOK.md` — WS5 (logs, alertas mínimas, webhook billing, canal guardia; placeholders `TBD`); enlace en hub `docs/operacion/evidence/README.md` | Hecho | Complementa §3–§7 del runbook; **no** marca observabilidad prod conectada ni WS5 operativo cerrado | 2026-05-12 |
| Doc: sección **«Índice — documentación de apoyo (repo)»** en `docs/PLAN-CIERRE-PROYECTO.md` (enlaces WS1–WS6 + hub `evidence/README`) | Hecho | Navegación repo-only; no sustituye runbooks largos ni marca workstreams operativos cerrados | 2026-05-12 |
| Doc: `CONTRIBUTING.md` — enlace explícito al plan de cierre y al índice WS1–WS6 / hub evidence (tras checklist PR) | Hecho | Guía contribución; no duplica la tabla del plan | 2026-05-12 |
| Doc: `README.md` — tabla *Documentación destacada*: fila de cierre alinea texto con índice WS1–WS6 / apoyo en `PLAN-CIERRE-PROYECTO`; comprobado `PLAN-MEJORAS` ya enlaza el plan | Hecho | Descubrimiento desde entrada del repo; no marca workstreams operativos cerrados | 2026-05-12 |
| Doc: `.github/pull_request_template.md` — dos líneas (plan de cierre + índice de apoyo / hub `evidence`) para PRs que toquen go-live | Hecho | Cierra hilo doc repo-side sin duplicar subsección en plan (ya existen índice WS1–WS6 y tabla *Estado ingeniería vs pendiente humano*) | 2026-05-12 |
| Doc: `SECURITY.md` — sección *Operación, cierre y evidencia* con enlace al plan de cierre y al hub `docs/operacion/evidence/README.md` | Hecho | Divulgación responsable sigue siendo este doc; runbooks/evidencia son referencia, no canal de vulnerabilidades | 2026-05-12 |
| Doc: `docs/operacion/evidence/README.md` — distinción CVE vs evidencia operativa + enlace `SECURITY.md`; plantilla issue `saas-backlog.md` enlaza hub `evidence` | Hecho | Evita confundir plantillas de log con canal de seguridad; issues nuevos ven el hub en contexto | 2026-05-12 |
| **Próximo:** WS1–WS6 (Fase 0 formal, Stripe live + log relleno, drill restore real, legal externo, alertas prod, secretos E2E / run staging) | Pendiente | Seguir tablas de workstreams y semanas 1–2; no marcar completo sin artefacto o ticket acordado | — |

---

## Semana 1 — checklist humano (arranque de cierre)

Tareas **fuera del código** que desbloquean evidencia y fechas; orden sugerido dentro de la semana.

| Día | Tarea | Dueño sugerido | Artefacto |
|-----|--------|----------------|-----------|
| 1 | Reunión WS1: rellenar *Revisión comercial* y checklist §6 en `SAAS-FASE-0-DECISIONES` | Comercial + ingeniería | Doc actualizado |
| 1–2 | Abrir/configurar secretos E2E staging (`E2E_EMAIL`, `E2E_PASSWORD`, `PLAYWRIGHT_BASE_URL`) o ejecutar local según `E2E-STAGING.md` | Ingeniería + ops | Run verde o nota en ticket |
| 2–3 | Iniciar checklist Stripe **live** (`STRIPE-PROD-CHECKLIST`) y plantilla `evidence/STRIPE-VALIDATION-LOG.md` | Ingeniería | Log relleno (sin secretos) |
| 3–4 | Ventana restore **staging** + `BACKUP-RESTORE-DRILL-LOG.md` | Ops + ingeniería | Log con fecha y OK |
| 4–5 | Enviar URLs legales + flujo datos a asesor (WS4); ops: 2–3 alertas reales + enlace dashboard (WS5) | Legal / ops | Referencia en ticket o wiki |

---

## Semana 2 — micro-checklist (ops / evidencia)

Continuidad una vez Semana 1 iniciada; puede solaparse con WS2–WS5.

| Día | Tarea | Dueño sugerido | Artefacto |
|-----|--------|----------------|-----------|
| 1 | Cerrar o actualizar `STRIPE-VALIDATION-LOG.md` con resultado último test live (WS2) | Ingeniería | Log con fecha |
| 1–2 | Repetir o programar siguiente ventana restore staging si política lo exige (WS3) | Ops | `BACKUP-RESTORE-DRILL-LOG.md` |
| 2 | Confirmar canal de guardia y enlace dashboard accesible al equipo (WS5 §4 checklist / §7 guía alerta) | Ops | Nota en runbook o wiki |
| 3–5 | Seguimiento dictamen legal: incorporar textos acordados en frontend si aplica (WS4) | Legal + ingeniería | PR o ticket |

---

## Estado ingeniería vs pendiente humano (resumen)

| WS | En repo (ingeniería) | Pendiente humano / evidencia fuera de git |
|----|----------------------|------------------------------------------|
| **WS1** Fase 0 | `SAAS-FASE-0-DECISIONES.md`, `.env.example` alineados | Filas *Revisión comercial* con fecha/responsable; checklist §6 del mismo doc |
| **WS2** Stripe | Billing, webhooks, portal, plantillas `evidence/STRIPE-VALIDATION-LOG.md` | Stripe **live**, webhook prod, log rellenado con prueba real |
| **WS3** Backup | `BACKUP-SQL-SERVER.md`, plantilla `BACKUP-RESTORE-DRILL-LOG.md` | Restore drill en staging (fecha, responsable, OK en plantilla) |
| **WS4** Legal | Rutas `/terminos`, `/privacidad`, enlaces en login/landing | Dictamen / revisión jurídica externa antes de escala masiva |
| **WS5** Observabilidad | `OBSERVABILITY-RUNBOOK.md` §4 (checklist previa prod), §7 «ante alerta», `X-Request-Id`, enlace `DEPLOY-SAAS.md` §8 | Conectar proveedor (logs/APM), 2–3 alertas **activas** en prod, canal de guardia |
| **WS6** E2E | Playwright smoke, `e2e-manual.yml`, `E2E-STAGING.md` | Secretos `E2E_*` / `PLAYWRIGHT_BASE_URL` en GitHub o run local archivado |
| **WS7** Registro | `/solicitar-demo` (lead mailto); sin POST público tenant | Opción B (self-service) solo si WS1 lo define |

### Ingeniería: estado

#### Últimas entregas (repo) — 2026-05

- [x] Push a `origin/main` con commits agrupados por tema (ventas; backend auditoría y suites; frontend POS borrador + Vitest; chore monorepo).
- [x] Chore `*.tsbuildinfo` y exclusión de `apps/frontend/tsconfig.tsbuildinfo` del índice git (historial: `6ccc9f1`).
- [x] Documentación troubleshooting Windows (rutas largas), enlaces en `docs/operacion/evidence/*` y `STRIPE-VALIDATION-LOG` (historial: `c7dc102`).
- [x] Tests unitarios de límites por plan (`plan-limits`) para validar enforcement SaaS sin levantar DB.
- [x] Suite `trial-pure` (lógica de trial/fechas) aislada de integración.
- [x] Helpers fiscales NCF + tests dedicados (`ncf-pure` / resolución de proveedor fiscal).
- [x] Mejoras de accesibilidad (a11y) en flujos de auth, suspensión por billing y solicitud de demo.
- [x] Verificación de enlaces internos en `docs/` integrada en `npm run verify` (`verify:docs-links` / `scripts/check-docs-links.mjs`).
- [x] Hub de troubleshooting de desarrollo (`docs/operacion/TROUBLESHOOTING-DEV.md`) enlazado desde runbooks y README.
- [x] `CONTRIBUTING.md` ampliado con ejemplos prácticos (clone, tests por paquete, PR).
- [x] Test backend de acceso por tienda (`tienda-access.test.ts`).
- [x] Mejoras de accesibilidad (a11y) en `select-organizacion/page.tsx` (selector de organización).
- [x] Nota en `docs/operacion/E2E-STAGING.md` sobre smoke CI (workflow / expectativas del job).
- [x] `app-error.test.ts` — caso **5xx**.
- [x] Mejoras de accesibilidad (a11y) en `plataforma/page.tsx`.
- [x] Mejoras de accesibilidad (a11y) en `auditoria/page.tsx`.
- [x] Mejoras de accesibilidad (a11y) en `inventario/page.tsx`.
- [x] Mejoras de accesibilidad (a11y) en `ventas/page.tsx`.
- [x] Mejoras de accesibilidad (a11y) en `reportes/page.tsx`.
- [x] Mejoras de accesibilidad (a11y) en `clientes/page.tsx`.
- [x] Mejoras de accesibilidad (a11y) en `compras/page.tsx`.
- [x] Mejoras de accesibilidad (a11y) en `proveedores/page.tsx`.
- [x] Mejoras de accesibilidad (a11y) en `gastos/page.tsx`.
- [x] Mejoras de accesibilidad (a11y) en `promociones/page.tsx`.
- [x] Mejoras de accesibilidad (a11y) en `cotizaciones/page.tsx`.
- [x] Mejoras de accesibilidad (a11y) en `devoluciones/page.tsx`.
- [x] Mejoras de accesibilidad (a11y) en `kits/page.tsx`.
- [x] Mejoras de accesibilidad (a11y) en `tarjeta-de-regalo/page.tsx`.
- [x] Mejoras de accesibilidad (a11y) en `empleados/page.tsx`.
- [x] Mejoras de accesibilidad (a11y) en `recetas/page.tsx`.
- [x] Mejoras de accesibilidad (a11y) en `comprobante/page.tsx`.
- [x] Mejoras de accesibilidad (a11y) en `cajas/page.tsx`.
- [x] Mejoras de accesibilidad (a11y) en `tiendas/page.tsx`.
- [x] Mejoras de accesibilidad (a11y): landmark `<main>` en rutas `/configuracion`, `/inventario/buscar`, `/ventas/cierres-caja` y `/ventas/historial`.
- [x] **Ventas / login:** `PUT /ventas/:id` (actualización completa con **delivery**, total alineado) + **VentaModal** (rejilla de pago, UI de entrega); login — `<main>`, `h1` sr-only y `h2` visible (`apps/frontend/src/app/(auth)/login/page.tsx`).
- [x] **Ventas (fix backend) — edición completa sin cascade roto:** `fullUpdate` en `apps/backend/src/modules/ventas/ventas.service.ts` sincroniza el grafo de `venta.detalles` vía `syncFullUpdateVentaDetalleGraph` (`apps/backend/src/modules/ventas/ventas-full-update-detail-graph.ts`); evita que el cascade de TypeORM emita `UPDATE venta_detalles SET ventaId = NULL` sobre filas ya borradas y rompa SQL Server (`Cannot insert the value NULL into column 'ventaId'`).
- [x] **Ventas — respuestas HTTP sin JSON circular:** `stripVentaDetalleParentRef` (`ventas-full-update-detail-graph.ts`) aplicado en `ventas.service.ts` tras la persistencia / sync de detalles en `create`, `update`, `fullUpdate` y en `findById`, eliminando la referencia padre en cada línea para que `Venta.detalles` no cierre ciclo con `Venta` al responder (`sendSuccess` / `res.json`).
- [x] **Suite integración backend:** verde tras correcciones en `tenant-usage.ts` (conteos de ventas sin `anulada`), **403** desde `AppError` en `sendFail`/controladores, `findOne`+`where` en tests, `tienda` en apertura de caja, orden de teardown en configuración (FK) y esquema Zod de cotización (`clienteId`).

- Las iteraciones recientes en repo se orientaron principalmente a **DX y documentación**: runbooks, `verify:docs-links`, hub de troubleshooting en `docs/operacion/TROUBLESHOOTING-DEV.md` y aclaraciones en CI (jobs/comentarios útiles al contribuir).
- El **backlog de producto/ingeniería** y el cierre **humano** descrito en WS1–WS6 siguen pendientes; este documento ordena ese trabajo, no lo marca como hecho.
- Issues concretos de tamaño implementable: inventario en `docs/ISSUES-SAAS-BACKLOG.md`.

- **En repo:** código operativo multi-tenant, billing/trial, suites de aislamiento, E2E smoke, runbooks y CI; la verificación local del monorepo es `npm run verify` (raíz).
- **Pendiente humano / evidencia:** Stripe **live** y log, drill de restore con plantilla rellena, alertas reales en prod, dictamen legal externo y cierre formal de Fase 0 comercial (fechas y responsables en `SAAS-FASE-0-DECISIONES.md`).
- **Alcance:** el registro self-service (Issue 9 opción B) queda fuera del cierre mínimo salvo decisión explícita en WS1/WS7.

*Documento vivo: actualizar fechas y estado al completar cada workstream.*
