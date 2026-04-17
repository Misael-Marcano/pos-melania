# Scripts operativos (Stripe SaaS)

Atajos para validar facturación antes de go-live y durante soporte.

## 1) Check rápido (solo API billing)

Valida estado general de Stripe (`/billing/status`) con JWT autenticado.

```powershell
Set-Location "c:\Users\creed\OneDrive\Escritorio\pos-melania"
.\scripts\ops\check-stripe-readiness.ps1 `
  -ApiBaseUrl "https://api.tudominio.com/api/v1" `
  -JwtToken "<JWT_ADMIN_O_PLATAFORMA>"
```

## 2) Check completo (API + checkout + portal)

Además de estado, genera URL de Checkout y URL de Customer Portal.

```powershell
Set-Location "c:\Users\creed\OneDrive\Escritorio\pos-melania"
.\scripts\ops\check-stripe-readiness.ps1 `
  -ApiBaseUrl "https://api.tudominio.com/api/v1" `
  -JwtToken "<JWT_ADMIN_O_PLATAFORMA>" `
  -RunCheckout `
  -RunPortal
```

## 3) Check auditoría en BD

Requiere `sqlcmd` en PATH.

```powershell
Set-Location "c:\Users\creed\OneDrive\Escritorio\pos-melania"
.\scripts\ops\check-stripe-audit.ps1 `
  -SqlServer "localhost,1433" `
  -Database "pos_db" `
  -SqlUser "sa" `
  -SqlPassword "<DB_PASS>"
```

## 4) Pre-go-live unificado

Ejecuta check API + check auditoría SQL en secuencia.

```powershell
Set-Location "c:\Users\creed\OneDrive\Escritorio\pos-melania"
.\scripts\ops\pre-go-live.ps1 `
  -ApiBaseUrl "https://api.tudominio.com/api/v1" `
  -JwtToken "<JWT_ADMIN_O_PLATAFORMA>" `
  -SqlServer "localhost,1433" `
  -Database "pos_db" `
  -SqlUser "sa" `
  -SqlPassword "<DB_PASS>"
```

### Con evidencia en archivo

```powershell
.\scripts\ops\pre-go-live.ps1 `
  -ApiBaseUrl "https://api.tudominio.com/api/v1" `
  -JwtToken "<JWT_ADMIN_O_PLATAFORMA>" `
  -SqlServer "localhost,1433" `
  -Database "pos_db" `
  -SqlUser "sa" `
  -SqlPassword "<DB_PASS>" `
  -RunCheckout `
  -RunPortal `
  -SaveReport
```

Salida en: `scripts/ops/reports/pre-go-live-YYYYMMDD-HHMMSS.txt` (ignorado por git).

## 5) Rol plataforma (`X-Tenant-Id`)

Cuando el JWT es de rol `plataforma`, especifica tenant objetivo:

```powershell
.\scripts\ops\check-stripe-readiness.ps1 `
  -ApiBaseUrl "https://api.tudominio.com/api/v1" `
  -JwtToken "<JWT_PLATAFORMA>" `
  -TenantId 12 `
  -RunCheckout `
  -RunPortal
```

También aplica en `pre-go-live.ps1`:

```powershell
.\scripts\ops\pre-go-live.ps1 `
  -ApiBaseUrl "https://api.tudominio.com/api/v1" `
  -JwtToken "<JWT_PLATAFORMA>" `
  -TenantId 12 `
  -SqlServer "localhost,1433" `
  -Database "pos_db" `
  -SqlUser "sa" `
  -SqlPassword "<DB_PASS>" `
  -SaveReport
```

## Notas de falla comunes

- `provider != stripe`: revisar `BILLING_PROVIDER`.
- `configured=false`: revisar `STRIPE_SECRET_KEY`.
- `pricesConfigured=false`: faltan `STRIPE_PRICE_*`.
- `create-portal-session` falla con 400: el tenant no tiene `stripeCustomerId` aun.
- `sqlcmd` no encontrado: instalar SQL Server Command Line Utilities.
