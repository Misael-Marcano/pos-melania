# Despliegue LAN — un PC servidor

Un solo **Windows** actúa como servidor (Docker). El resto de equipos abre el navegador en `http://<IP-LAN>:3000`. No hace falta instalar la app en cada PC.

Runbook SaaS / dominio público: [`DEPLOY-SAAS.md`](DEPLOY-SAAS.md).

---

## 1. Prerrequisitos

| Requisito | Notas |
|-----------|--------|
| **Docker Desktop** | Con motor Linux (WSL2 recomendado) |
| **WSL2** | Habilitado en Windows si Docker lo pide |
| **Node.js 20** (opcional) | Solo para `new-tenant.seed.ts` desde el host |
| **RAM** | ≥ 8 GB recomendado (SQL Server + servicios) |
| **Red** | Servidor y clientes en la misma LAN (Wi‑Fi o cable) |

---

## 2. Detectar la IP del servidor

En PowerShell en el PC que será servidor:

```powershell
ipconfig
```

Use la **IPv4** de la interfaz activa (por ejemplo `192.168.1.50`), no `127.0.0.1`.

Automatizar plantilla de entorno:

```powershell
cd C:\ruta\al\repo\pos-melania
.\scripts\ops\setup-lan-env.ps1
# o: .\scripts\ops\setup-lan-env.ps1 -LanIp 192.168.1.50
```

El script crea `.env.production` desde `.env.example` (si no existe) y ajusta `FRONTEND_URL`, `NEXT_PUBLIC_API_URL` y `REDIS_URL` para Compose. Con `-Force` actualiza esas claves en archivos ya existentes.

**Editar a mano** (obligatorio antes del primer `up`):

- `DB_PASS` — contraseña fuerte para SQL Server (`SA_PASSWORD`)
- `JWT_SECRET` y `JWT_REFRESH_SECRET` — aleatorios (p. ej. `openssl rand -hex 32` en Git Bash)
- Marca opcional: `NEXT_PUBLIC_APP_SHORT_NAME`, etc.

No subir `.env.production` a git.

---

## 3. Firewall de Windows

Permitir tráfico entrante a los puertos del POS (ejecutar **una vez** en el servidor):

```powershell
New-NetFirewallRule -DisplayName "POS Frontend LAN" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "POS API LAN" -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow
```

SQL Server queda en `127.0.0.1:1433` (solo el host); no se expone a la LAN.

---

## 4. Build y arranque

Desde la raíz del repositorio:

```powershell
docker compose -f docker-compose.production.yml --env-file .env.production build
docker compose -f docker-compose.production.yml --env-file .env.production up -d
docker compose -f docker-compose.production.yml ps
```

Comprobar en el servidor:

```powershell
curl http://localhost:4000/health
curl http://localhost:3000
```

En otro PC de la misma red: **`http://<IP-LAN>:3000`** (sustituya `<IP-LAN>` por la IPv4 del servidor).

> **Importante:** Si cambia la IP del servidor, vuelva a ejecutar `setup-lan-env.ps1 -Force` y haga **`build`** del frontend: `NEXT_PUBLIC_API_URL` se embebe en la imagen en tiempo de build.

---

## 5. Primera organización (tenant)

Con los contenedores en marcha y migraciones aplicadas (automático al arrancar el backend):

```powershell
cd apps\backend
$env:DB_HOST = "localhost"
$env:DB_PORT = "1433"
$env:DB_USER = "sa"
# Mismo valor que DB_PASS en .env.production:
$env:DB_PASS = "<su_contraseña>"
$env:DB_NAME = "pos_melania"
$env:JWT_SECRET = "<desde .env.production>"
$env:JWT_REFRESH_SECRET = "<desde .env.production>"
$env:TENANT_NOMBRE = "Mi Negocio"
$env:TENANT_SLUG = "mi-negocio"
$env:ADMIN_EMAIL = "admin@minegocio.local"
$env:ADMIN_PASSWORD = "CambiarEsto123!"
$env:PLAN_CODE = "standard"
npx ts-node src/seeds/new-tenant.seed.ts
```

Login en el navegador con ese email y contraseña. Si usa multi-tenant con slug, configure `NEXT_PUBLIC_TENANT_SLUG` o el slug en login según su política.

---

## 6. Volúmenes y datos

| Volumen | Contenido |
|---------|-----------|
| `pos_sqlserver_data` | Base de datos |
| `pos_redis_data` | Redis (AOF) |
| `pos_uploads_data` | Logotipos / archivos subidos |

Backups SQL: [`BACKUP-SQL-SERVER.md`](BACKUP-SQL-SERVER.md).

---

## 7. Actualizar versión

```powershell
git pull
docker compose -f docker-compose.production.yml --env-file .env.production build
docker compose -f docker-compose.production.yml --env-file .env.production up -d
```

---

## 8. Solución de problemas

### CORS o “blocked by CORS policy”

`FRONTEND_URL` en `.env.production` debe coincidir con la URL que usan los clientes, por ejemplo `http://192.168.1.50:3000` (mismo host/puerto que en el navegador). Tras cambiarla:

```powershell
docker compose -f docker-compose.production.yml --env-file .env.production up -d backend
```

### El frontend llama a `localhost:4000` desde otro PC

`NEXT_PUBLIC_API_URL` debe ser la IP LAN (`http://192.168.x.x:4000/api/v1`), no `localhost`. Regenerar env y **reconstruir** el frontend:

```powershell
.\scripts\ops\setup-lan-env.ps1 -Force
docker compose -f docker-compose.production.yml --env-file .env.production build frontend --no-cache
docker compose -f docker-compose.production.yml --env-file .env.production up -d
```

### No abre desde otro equipo

- Misma subred Wi‑Fi/LAN
- Firewall (sección 3)
- Ping a la IP del servidor desde el cliente

### SQL / seed desde el host falla

- Contenedores `up` y SQL healthy: `docker compose -f docker-compose.production.yml ps`
- `DB_HOST=localhost` y `DB_PASS` igual que en `.env.production`
- Puerto `127.0.0.1:1433` publicado en `docker-compose.production.yml`

### Backend unhealthy al inicio

SQL Server puede tardar 1–2 minutos la primera vez. Ver logs:

```powershell
docker compose -f docker-compose.production.yml logs backend sqlserver
```

---

## 9. Referencias

- Variables y secretos: [`.env.example`](../../.env.example), [`SECRETS-RUNBOOK.md`](SECRETS-RUNBOOK.md)
- Despliegue con dominio/Stripe: [`DEPLOY-SAAS.md`](DEPLOY-SAAS.md)
