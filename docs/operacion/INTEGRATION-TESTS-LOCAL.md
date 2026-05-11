# Tests de integración (backend) en local

Los tests bajo `apps/backend/src/__tests__/integration/**/*.test.ts` usan **SQL Server** y **Redis** reales (misma configuración que desarrollo vía `apps/backend/.env`). Jest carga `src/__tests__/setup-env.ts` (`NODE_ENV=test`).

Para incidencias de shell, Docker o enlaces en documentación, consulte [TROUBLESHOOTING-DEV.md](TROUBLESHOOTING-DEV.md).

**Comando:** desde `apps/backend`, `npm run test:integration` (ver `package.json` del backend).

## 1. Levantar solo base de datos y Redis (Docker)

En la raíz del monorepo, el `docker-compose.yml` expone **SQL Server** en el puerto **1433** y **Redis** en **6379**:

```powershell
Set-Location "C:\ruta\al\repo\pos-melania"
docker compose up -d sqlserver redis
```

Espere a que el contenedor `sqlserver` esté **healthy** (healthcheck en el compose). Redis arranca en segundos.

**Contraseña del `sa` del compose:** variable `SA_PASSWORD` del servicio (por defecto en el archivo: `Misael0530!`). El `apps/backend/.env` debe usar la **misma** `DB_PASS` (y `DB_HOST=localhost`, `DB_PORT=1433`, `DB_USER=sa`, `DB_NAME` acorde a lo que use para local, p. ej. `pos_melania`).

**Redis:** `REDIS_URL=redis://localhost:6379` (como en `.env.example` en la raíz).

## 2. Migraciones y seed (una vez o tras reset de volumen)

```powershell
Set-Location "C:\ruta\al\repo\pos-melania\apps\backend"
npm install
npm run migration:run
npm run seed
```

Sin seed, varios tests carecen de datos y fallarán.

## 3. Variables recomendadas al ejecutar la suite (alinear con CI)

El job de integración en `.github/workflows/ci.yml` fija entre otras:

- `NODE_ENV=test`
- `BILLING_PROVIDER=none`
- `FISCAL_JURISDICTION=NONE`

En PowerShell, antes de `npm run test:integration`:

```powershell
$env:NODE_ENV = "test"
$env:BILLING_PROVIDER = "none"
$env:FISCAL_JURISDICTION = "NONE"
npm run test:integration
```

Algunos tests de portal Stripe usan `TEST_STRIPE_CUSTOMER_ID` si quieres el camino feliz con `BILLING_PROVIDER=stripe`; no es obligatorio para toda la suite.

## 4. Paridad con GitHub Actions

En **push a `main`**, CI instala dependencias, corre migraciones + seed con variables de servicio (`DB_HOST`, `DB_PASS`, etc.) y luego `npm run test:integration`. En **pull requests** la suite no corre en Actions: conviene ejecutarla localmente con este documento antes de fusionar cambios que toquen API o multi-tenant.

Antes de abrir un PR que toque `docs/`, ejecute en la raíz `npm run verify:docs-links` para comprobar que los enlaces internos `.md` bajo `docs/` no estén rotos (misma lógica que el job **TypeScript + Unit tests** en CI).

## Referencias

- Tabla de pruebas en el README del repo (sección **Pruebas**).
- Cierre operativo: `docs/PLAN-CIERRE-PROYECTO.md` (WS6 / evidencia local).
- E2E frontend (distinto): `docs/operacion/E2E-STAGING.md`.
