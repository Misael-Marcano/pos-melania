# E2E Playwright en staging o CI

**Objetivo:** cumplir el backlog [docs/ISSUES-SAAS-BACKLOG.md](../ISSUES-SAAS-BACKLOG.md) Issue 5 (job CI opcional) sin obligar secretos en forks.

## Requisitos

- Frontend accesible (HTTPS o red interna) con la API que ese frontend usa ya configurada.
- Usuario de prueba con credenciales conocidas (p. ej. seed `admin@pos.com` solo en entornos no productivos).
- Variables de entorno **`E2E_EMAIL`** y **`E2E_PASSWORD`** disponibles para el proceso que ejecuta Playwright.
- Opcional en local: **`PLAYWRIGHT_BASE_URL`** (por defecto `http://127.0.0.1:3000`); en GitHub Actions va en **secret** con el mismo nombre.

### Secretos y Actions

Nombres de secretos en el repo, propósito y tabla E2E: [SECRETS-RUNBOOK.md § 1](SECRETS-RUNBOOK.md#1-github-actions-repositorio). El workflow es **`.github/workflows/e2e-manual.yml`** (nombre en la UI de GitHub: **E2E Playwright (manual dispatch)**).

### Checklist — secretos en GitHub (solo nombres)

Antes de **Run workflow** en Actions, confirmar que el repositorio tiene configurados estos **repository secrets** (no pegar valores en `docs/`, PRs ni issues públicos):

- [ ] `E2E_EMAIL`
- [ ] `E2E_PASSWORD`
- [ ] `PLAYWRIGHT_BASE_URL`
- [ ] (opcional) `E2E_PLATAFORMA_EMAIL` / `E2E_PLATAFORMA_PASSWORD` — para `e2e/plataforma.spec.ts` (seed `plataforma@pos.com`)

En local, usar variables de sesión como en la sección *Ejecución local (Windows PowerShell)*; no versionar credenciales.

## Ejecución local (bash)

```bash
# Terminal 1: backend + BD + Redis (o docker-compose)
# Terminal 2: frontend
cd apps/frontend
export E2E_EMAIL=admin@pos.com
export E2E_PASSWORD='Admin123!'
npm run test:e2e:install
npm run test:e2e
```

## Ejecución local (Windows PowerShell)

En PowerShell clásico, `&&` no encadena comandos como en bash; usa `;`, líneas separadas o `Set-Location` explícito:

```powershell
Set-Location C:\ruta\al\repo\pos-melania\apps\frontend
$env:E2E_EMAIL = "admin@pos.com"
$env:E2E_PASSWORD = "Admin123!"
npm run test:e2e:install
npm run test:e2e
```

Si el frontend corre en otro host/puerto:

```powershell
$env:PLAYWRIGHT_BASE_URL = "http://127.0.0.1:3000"
```

Detalle: [apps/frontend/e2e/README.md](../../apps/frontend/e2e/README.md).

## CI — disparo manual (recomendado)

En GitHub: **Actions → workflow "E2E Playwright (manual dispatch)" → Run workflow**.

Configurar en el repositorio los **secrets**:

- `E2E_EMAIL`
- `E2E_PASSWORD`
- `PLAYWRIGHT_BASE_URL` — URL base del frontend ya desplegado (ej. `https://staging-app.example.com`)

El job **no** levanta SQL Server ni el backend: solo instala dependencias del frontend, instala Chromium y ejecuta `npm run test:e2e` contra la URL indicada.

## CI — smoke

El smoke `e2e/smoke.spec.ts` comprueba URL post-login y espera landmark `main` o copy en `/select-organizacion` (timeout 25s). No secrets.

## CI — automático en cada PR (opcional)

Requiere secretos en el repo y mayor tiempo de pipeline. Activar solo cuando el equipo asuma el coste; hasta entonces usar disparo manual o staging dedicado.

## Doc hygiene (enlaces)

Si el PR modifica `docs/`, desde la raíz del repo ejecutar `npm run verify:docs-links` antes de abrir/revisar el PR (comprueba enlaces internos en Markdown).
