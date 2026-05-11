# Docker en desarrollo local

Guía operativa para levantar **SQL Server** y **Redis** con Docker Compose durante el desarrollo local del monorepo (ejecutando backend y frontend con `npm run dev:*` contra esos servicios). Para el flujo de **build + arranque de toda la pila** ver la sección [Inicio rápido (Docker)](../../README.md#inicio-rápido-docker) del `README.md` y, para perfil productivo, [`docs/operacion/DEPLOY-SAAS.md`](DEPLOY-SAAS.md).

Para PowerShell, CI local y enlaces en docs, ver [TROUBLESHOOTING-DEV.md](TROUBLESHOOTING-DEV.md).

Para correr la **suite de integración del backend** con esta misma infraestructura, ver [`INTEGRATION-TESTS-LOCAL.md`](INTEGRATION-TESTS-LOCAL.md): variables esperadas, migraciones, seed y paridad con CI.

Antes de un PR que modifique documentación bajo `docs/`, ejecute en la raíz `npm run verify:docs-links` para higiene de enlaces internos entre archivos Markdown (paridad con el paso *Verify docs internal .md links* del job **TypeScript + Unit tests** en `.github/workflows/ci.yml`).

**Docs + Docker:** En PRs que toquen a la vez `docker-compose*.yml` y muchos Markdown bajo `docs/`, corre igualmente `npm run verify:docs-links` en la raíz. Para enlaces rotos, `node scripts/check-docs-links.mjs --verbose` (ver [`CONTRIBUTING.md`](../../CONTRIBUTING.md)).

> Ejemplos en PowerShell (Windows). Se evita el operador `&&` (no es portable en PowerShell 5.x); se usan invocaciones separadas y `Set-Location`.

---

## 1. Archivos `docker-compose` en la raíz

| Archivo | Uso | Detalle |
| ------- | --- | ------- |
| `docker-compose.yml` | **Desarrollo local** | Construye imágenes de `backend` y `frontend` desde el repo; expone SQL Server y Redis a `localhost`; credenciales por defecto (no usar en producción). |
| `docker-compose.production.yml` | Plantilla productiva | Sin credenciales hardcodeadas; healthchecks en todos los servicios; volúmenes con nombre; Redis con AOF. Documentado en `docs/operacion/DEPLOY-SAAS.md`. |

Para desarrollo del día a día normalmente **basta con levantar SQL Server + Redis** y correr backend/frontend en host con `npm run dev:*` (ver §3). Levantar también `backend` y `frontend` contenerizados es útil para validar las imágenes del repo.

---

## 2. Servicios, puertos y healthchecks (`docker-compose.yml`)

| Servicio | Imagen | Puerto host | Variables relevantes | Healthcheck |
| -------- | ------ | ----------- | -------------------- | ----------- |
| `sqlserver` | `mcr.microsoft.com/mssql/server:2019-latest` | `1433` → `1433` | `SA_PASSWORD=Misael0530!` (default del compose), `MSSQL_PID=Express`, `ACCEPT_EULA=Y` | `sqlcmd ... -Q "SELECT 1"` cada `10s` (retries `15`, `start_period: 30s`). Backend espera `service_healthy`. |
| `redis` | `redis:7-alpine` | `6379` → `6379` | — | Sin healthcheck en dev; `service_started` es suficiente. |
| `backend` | build local (`apps/backend/Dockerfile`) | `4000` → `4000` | `DB_HOST=sqlserver`, `REDIS_URL=redis://redis:6379`, `NODE_ENV=production` (en la imagen) | Depende de `sqlserver` `healthy` y `redis` started. |
| `frontend` | build local (`apps/frontend/Dockerfile`) | `3000` → `3000` | `NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1` | Depende de `backend`. |

Volúmenes nombrados: `sqlserver_data` (datos SQL Server) y `redis_data`.

> En producción, además del healthcheck de `sqlserver`, `redis` y `backend` tienen healthcheck propio y `frontend` espera al backend healthy (`docker-compose.production.yml`).

---

## 3. Arranque típico para desarrollo local

Levanta sólo la base de datos y caché; backend/frontend se ejecutan en el host con `ts-node-dev` / `next dev` para recarga rápida.

```powershell
Set-Location "C:\ruta\al\repo\pos-melania"

docker compose up -d sqlserver redis

docker compose ps
```

Espera a que `pos_sqlserver` aparezca como `healthy` antes de aplicar migraciones (puede tardar 20–40 s la primera vez).

Configura `apps/backend/.env` y `apps/frontend/.env.local` desde `.env.example` (ver README §Variables de entorno). Para la suite de integración, alinea credenciales con el compose (`DB_PASS=Misael0530!`, `DB_HOST=localhost`, `REDIS_URL=redis://localhost:6379`) según [`INTEGRATION-TESTS-LOCAL.md`](INTEGRATION-TESTS-LOCAL.md).

Migraciones + seed (primera vez o tras `docker compose down -v`):

```powershell
Set-Location "C:\ruta\al\repo\pos-melania\apps\backend"

npm install
npm run migration:run
npm run seed
```

Servicios en host (dos terminales o usando los scripts de raíz):

```powershell
Set-Location "C:\ruta\al\repo\pos-melania"

npm run dev:backend
```

```powershell
Set-Location "C:\ruta\al\repo\pos-melania"

npm run dev:frontend
```

---

## 4. Operaciones útiles

```powershell
Set-Location "C:\ruta\al\repo\pos-melania"

docker compose logs -f sqlserver
docker compose logs -f redis

docker compose stop sqlserver redis
docker compose down

docker compose down -v
```

> `down -v` **borra los volúmenes** (`sqlserver_data`, `redis_data`): tendrás que volver a correr migraciones y seed.

Atajos definidos en `package.json` de la raíz (toda la pila, dev):

```powershell
Set-Location "C:\ruta\al\repo\pos-melania"

npm run docker:up
npm run docker:down
```

---

## 5. Problemas comunes

- **`sqlserver` reinicia o se queda en `starting`:** suele ser falta de memoria asignada a Docker (mín. ~2 GB). Aumentar recursos en Docker Desktop.
- **Login fallido contra SQL Server desde el host:** verifica que `apps/backend/.env` usa `DB_PASS=Misael0530!` (mismo valor que `SA_PASSWORD` del compose) y `DB_HOST=localhost`, `DB_PORT=1433`.
- **Puerto 1433 o 6379 ocupado:** detén instancias locales de SQL Server / Redis o ajusta el mapeo de puertos en `docker-compose.yml` (sólo entorno local).
- **Healthcheck no pasa:** la imagen `mssql/server:2019-latest` incluye `mssql-tools18` o `mssql-tools`; el test ya cubre ambos paths.

---

## 6. Referencias

- README, sección [Inicio rápido (Docker)](../../README.md#inicio-rápido-docker) y [Docker (utilidades en raíz)](../../README.md#docker-utilidades-en-raíz).
- Tests de integración (local): [`INTEGRATION-TESTS-LOCAL.md`](INTEGRATION-TESTS-LOCAL.md).
- Despliegue productivo: [`DEPLOY-SAAS.md`](DEPLOY-SAAS.md) y `docker-compose.production.yml`.
- Backup del volumen SQL Server: [`BACKUP-SQL-SERVER.md`](BACKUP-SQL-SERVER.md).
