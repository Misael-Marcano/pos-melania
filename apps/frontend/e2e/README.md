# Pruebas E2E (Playwright)

## Requisitos

1. **Backend** en marcha (p. ej. `npm run dev` en `apps/backend`, puerto por defecto 4000).
2. **Frontend** en marcha (`npm run dev` en `apps/frontend`, puerto 3000).
3. Variables de entorno del cliente Next.js coherentes con el API (`NEXT_PUBLIC_API_URL` en `.env` del frontend o entorno).
4. Navegador Chromium instalado para Playwright:
   ```bash
   cd apps/frontend
   npx playwright install chromium
   ```

## Credenciales de prueba

Deben coincidir con un usuario real de tu BD (p. ej. tras `npm run seed` en backend).

| Variable        | Ejemplo (seed README raíz) |
|-----------------|----------------------------|
| `E2E_EMAIL`     | `admin@pos.com`            |
| `E2E_PASSWORD`  | `Admin123!`                |

Opcional: `PLAYWRIGHT_BASE_URL` (por defecto `http://127.0.0.1:3000`).

## Ejecución

Desde `apps/frontend`:

**PowerShell (Windows)**

```powershell
$env:E2E_EMAIL="admin@pos.com"
$env:E2E_PASSWORD="Admin123!"
npm run test:e2e
```

**bash**

```bash
E2E_EMAIL=admin@pos.com E2E_PASSWORD='Admin123!' npm run test:e2e
```

UI interactiva:

```bash
npm run test:e2e:ui
```

Si faltan `E2E_EMAIL` / `E2E_PASSWORD`, el test se **omite** (skip) para no fallar en CI sin secretos.

## CI / staging

Disparo manual con GitHub Actions y URL de frontend en staging: ver [E2E-STAGING.md](../../../docs/operacion/E2E-STAGING.md) (secretos `E2E_EMAIL`, `E2E_PASSWORD`, `PLAYWRIGHT_BASE_URL`).
`smoke.spec.ts` espera `main` o UI en `/select-organizacion` tras login (25s); consulta [E2E-STAGING.md](../../../docs/operacion/E2E-STAGING.md).

## Documentación en repo

Si modificas archivos bajo `docs/`, antes del PR ejecuta desde la raíz del monorepo `npm run verify:docs-links`. Convenciones y flujo de contribución: [CONTRIBUTING.md](../../../CONTRIBUTING.md). Si `verify:docs-links` falla, usa `node scripts/check-docs-links.mjs --verbose` desde la raíz del repositorio (o `node ../../../scripts/check-docs-links.mjs --verbose` desde `apps/frontend/e2e`).

## Informes

Tras la corrida: `npx playwright show-report` (carpeta `playwright-report/`).
