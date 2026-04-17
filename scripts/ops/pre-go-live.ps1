param(
  [Parameter(Mandatory = $true)]
  [string]$JwtToken,

  [string]$ApiBaseUrl = "http://localhost:4000/api/v1",

  [int]$TenantId = 0,

  [ValidateSet("starter", "standard", "enterprise")]
  [string]$PlanCode = "standard",

  [string]$SuccessUrl = "http://localhost:3000/configuracion?billing=success",
  [string]$CancelUrl = "http://localhost:3000/configuracion?billing=cancel",
  [string]$ReturnUrl = "http://localhost:3000/configuracion",

  [string]$SqlServer = "localhost,1433",
  [string]$Database = "pos_db",
  [string]$SqlUser = "sa",
  [Parameter(Mandatory = $true)]
  [string]$SqlPassword,

  [switch]$RunCheckout,
  [switch]$RunPortal,
  [switch]$SaveReport,
  [string]$ReportPath = ""
)

$ErrorActionPreference = "Stop"

function Write-Section {
  param([string]$Message)
  Write-Host ""
  Write-Host "====================================================" -ForegroundColor Cyan
  Write-Host $Message -ForegroundColor Cyan
  Write-Host "====================================================" -ForegroundColor Cyan
}

function Write-Ok {
  param([string]$Message)
  Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Fail {
  param([string]$Message)
  Write-Host "[FAIL] $Message" -ForegroundColor Red
}

function Resolve-ReportPath {
  param([string]$BaseDir, [string]$CustomPath)
  if ($CustomPath -and $CustomPath.Trim().Length -gt 0) {
    return $CustomPath
  }
  $ts = Get-Date -Format "yyyyMMdd-HHmmss"
  $dir = Join-Path $BaseDir "reports"
  if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }
  return (Join-Path $dir "pre-go-live-$ts.txt")
}

$opsDir = $PSScriptRoot
$readinessScript = Join-Path $opsDir "check-stripe-readiness.ps1"
$auditScript = Join-Path $opsDir "check-stripe-audit.ps1"
$reportEnabled = $SaveReport -or ($ReportPath -and $ReportPath.Trim().Length -gt 0)
$finalReportPath = $null

if (-not (Test-Path $readinessScript)) {
  throw "No se encontro $readinessScript"
}
if (-not (Test-Path $auditScript)) {
  throw "No se encontro $auditScript"
}

try {
  if ($reportEnabled) {
    $finalReportPath = Resolve-ReportPath -BaseDir $opsDir -CustomPath $ReportPath
    Start-Transcript -Path $finalReportPath -Force | Out-Null
    Write-Section "Reporte"
    Write-Ok ("Guardando salida en: {0}" -f $finalReportPath)
  }

  Write-Section "Paso 1/2 - Verificacion API de billing"

  $readinessParams = @{
    JwtToken   = $JwtToken
    ApiBaseUrl = $ApiBaseUrl
    PlanCode   = $PlanCode
    SuccessUrl = $SuccessUrl
    CancelUrl  = $CancelUrl
    ReturnUrl  = $ReturnUrl
  }
  if ($TenantId -gt 0) {
    $readinessParams["TenantId"] = $TenantId
  }
  if ($RunCheckout) {
    $readinessParams["RunCheckout"] = $true
  }
  if ($RunPortal) {
    $readinessParams["RunPortal"] = $true
  }

  & $readinessScript @readinessParams
  if ($LASTEXITCODE -ne 0) {
    throw "check-stripe-readiness.ps1 finalizo con codigo $LASTEXITCODE"
  }

  Write-Section "Paso 2/2 - Verificacion auditoria Stripe en BD"
  & $auditScript `
    -SqlServer $SqlServer `
    -Database $Database `
    -SqlUser $SqlUser `
    -SqlPassword $SqlPassword

  if ($LASTEXITCODE -ne 0) {
    throw "check-stripe-audit.ps1 finalizo con codigo $LASTEXITCODE"
  }

  Write-Section "Resultado final"
  Write-Ok "Pre-go-live Stripe completado sin errores criticos."
  if ($reportEnabled) {
    Write-Ok ("Reporte generado: {0}" -f $finalReportPath)
  }
  if ($reportEnabled) {
    Stop-Transcript | Out-Null
  }
  exit 0
}
catch {
  Write-Section "Resultado final"
  Write-Fail ("Pre-go-live Stripe fallo: {0}" -f $_.Exception.Message)
  if ($reportEnabled) {
    Write-Fail ("Revisa el reporte: {0}" -f $finalReportPath)
    Stop-Transcript | Out-Null
  }
  exit 1
}
