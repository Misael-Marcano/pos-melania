param(
  [string]$SqlServer = "localhost,1433",
  [string]$Database = "pos_db",
  [string]$SqlUser = "sa",
  [Parameter(Mandatory = $true)]
  [string]$SqlPassword
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-Ok {
  param([string]$Message)
  Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Fail {
  param([string]$Message)
  Write-Host "[FAIL] $Message" -ForegroundColor Red
}

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$sqlFile = Join-Path $repoRoot "scripts\ops\check-stripe-audit.sql"

if (-not (Test-Path $sqlFile)) {
  throw "No se encontro el archivo SQL: $sqlFile"
}

Write-Step "Validando sqlcmd"
$sqlcmdCmd = Get-Command sqlcmd -ErrorAction SilentlyContinue
if (-not $sqlcmdCmd) {
  Write-Fail "sqlcmd no esta disponible en PATH."
  throw "Instala SQL Server Command Line Utilities (sqlcmd) y vuelve a ejecutar."
}
Write-Ok ("sqlcmd detectado en {0}" -f $sqlcmdCmd.Source)

Write-Step "Ejecutando check-stripe-audit.sql"

$args = @(
  "-S", $SqlServer,
  "-d", $Database,
  "-U", $SqlUser,
  "-P", $SqlPassword,
  "-i", $sqlFile,
  "-b"
)

& sqlcmd @args
if ($LASTEXITCODE -ne 0) {
  throw "sqlcmd finalizo con codigo $LASTEXITCODE"
}

Write-Step "Done"
Write-Ok "Verificacion de auditoria Stripe finalizada."
