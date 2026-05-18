<#
.SYNOPSIS
  Prepara .env.production para despliegue LAN (un PC servidor, clientes en navegador).

.DESCRIPTION
  Detecta la IPv4 principal de la LAN (o usa -LanIp), genera/actualiza URLs y Redis para Docker Compose.
  No sobrescribe archivos existentes sin -Force.

.EXAMPLE
  .\scripts\ops\setup-lan-env.ps1

.EXAMPLE
  .\scripts\ops\setup-lan-env.ps1 -LanIp 192.168.1.50 -Force
#>
param(
  [string]$LanIp = "",
  [switch]$Force,
  [switch]$Interactive
)

$ErrorActionPreference = "Stop"

function Write-Info([string]$Message) {
  Write-Host $Message -ForegroundColor Cyan
}

function Write-Ok([string]$Message) {
  Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Warn([string]$Message) {
  Write-Host "[AVISO] $Message" -ForegroundColor Yellow
}

function Get-PrimaryLanIPv4 {
  $candidates = @(
    Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
      Where-Object {
        $_.IPAddress -notmatch '^127\.' -and
        $_.IPAddress -notmatch '^169\.254\.' -and
        $_.PrefixOrigin -ne 'WellKnown'
      }
  )
  if (-not $candidates -or $candidates.Count -eq 0) {
    throw "No se detectó ninguna IPv4 de LAN. Use -LanIp 192.168.x.x"
  }
  $sorted = $candidates | Sort-Object InterfaceMetric, SkipAsSource
  return ($sorted[0].IPAddress)
}

function Test-ValidIPv4([string]$Ip) {
  return [bool]([System.Net.IPAddress]::TryParse($Ip, [ref]$null))
}

function Set-DotEnvValue {
  param(
    [string]$FilePath,
    [string]$Key,
    [string]$Value
  )
  $escapedKey = [regex]::Escape($Key)
  $line = "${Key}=${Value}"
  if (-not (Test-Path $FilePath)) {
    Set-Content -Path $FilePath -Value $line -Encoding utf8
    return
  }
  $lines = Get-Content -Path $FilePath
  $found = $false
  $newLines = foreach ($existing in $lines) {
    if ($existing -match "^\s*${escapedKey}\s*=") {
      $found = $true
      $line
    }
    else {
      $existing
    }
  }
  if (-not $found) {
    $newLines = @($newLines) + $line
  }
  Set-Content -Path $FilePath -Value $newLines -Encoding utf8
}

function Update-LanEnvFile {
  param(
    [string]$FilePath,
    [string]$TemplatePath,
    [string]$Ip,
    [bool]$AllowWrite
  )
  if ((Test-Path $FilePath) -and -not $AllowWrite) {
    Write-Warn "Ya existe $FilePath — omitido (use -Force para actualizar URLs LAN)."
    return $false
  }
  if (-not (Test-Path $FilePath)) {
    if (-not (Test-Path $TemplatePath)) {
      throw "No se encontró $TemplatePath"
    }
    Copy-Item -Path $TemplatePath -Destination $FilePath -Force
    Write-Ok "Creado $FilePath desde .env.example"
  }
  Set-DotEnvValue -FilePath $FilePath -Key "NODE_ENV" -Value "production"
  Set-DotEnvValue -FilePath $FilePath -Key "FRONTEND_URL" -Value "http://${Ip}:3000"
  Set-DotEnvValue -FilePath $FilePath -Key "NEXT_PUBLIC_API_URL" -Value "http://${Ip}:4000/api/v1"
  Set-DotEnvValue -FilePath $FilePath -Key "REDIS_URL" -Value "redis://redis:6379"
  Set-DotEnvValue -FilePath $FilePath -Key "SWAGGER_ENABLED" -Value "false"
  return $true
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $repoRoot

$envExample = Join-Path $repoRoot ".env.example"
$rootEnv = Join-Path $repoRoot ".env.production"
$frontendEnv = Join-Path $repoRoot "apps\frontend\.env.production"

$ip = $LanIp.Trim()
if (-not $ip) {
  $ip = Get-PrimaryLanIPv4
}
if (-not (Test-ValidIPv4 $ip)) {
  throw "IPv4 inválida: '$ip'"
}

if ($Interactive -or (-not $LanIp)) {
  Write-Info "IPv4 detectada para la LAN: $ip"
  $answer = Read-Host "¿Usar esta IP? [S/n]"
  if ($answer -match '^[nN]') {
    $ip = (Read-Host "Introduzca la IPv4 del servidor").Trim()
    if (-not (Test-ValidIPv4 $ip)) {
      throw "IPv4 inválida: '$ip'"
    }
  }
}

$allowWrite = $Force.IsPresent
if (-not $allowWrite) {
  Write-Info "Sin -Force: solo se crean archivos que no existan."
}

$rootUpdated = Update-LanEnvFile -FilePath $rootEnv -TemplatePath $envExample -Ip $ip -AllowWrite $allowWrite
if ($rootUpdated) {
  Write-Ok "URLs LAN en $rootEnv"
}

if ((Test-Path $frontendEnv) -and -not $allowWrite) {
  Write-Warn "Ya existe $frontendEnv — omitido (use -Force)."
}
else {
  $apiUrl = "http://${ip}:4000/api/v1"
  if (-not (Test-Path $frontendEnv)) {
    @(
      "# Generado por scripts/ops/setup-lan-env.ps1 — builds locales del frontend"
      "NEXT_PUBLIC_API_URL=$apiUrl"
    ) | Set-Content -Path $frontendEnv -Encoding utf8
    Write-Ok "Creado $frontendEnv"
  }
  elseif ($allowWrite) {
    Set-DotEnvValue -FilePath $frontendEnv -Key "NEXT_PUBLIC_API_URL" -Value $apiUrl
    Write-Ok "Actualizado NEXT_PUBLIC_API_URL en $frontendEnv"
  }
}

Write-Host ""
Write-Info "Siguiente (en la raíz del repo, PowerShell como administrador solo para firewall la primera vez):"
Write-Host ""
Write-Host "  # Firewall (una vez)"
Write-Host "  New-NetFirewallRule -DisplayName 'POS Frontend LAN' -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow"
Write-Host "  New-NetFirewallRule -DisplayName 'POS API LAN' -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow"
Write-Host ""
Write-Host "  # Build e inicio"
Write-Host "  docker compose -f docker-compose.production.yml --env-file .env.production build"
Write-Host "  docker compose -f docker-compose.production.yml --env-file .env.production up -d"
Write-Host ""
Write-Host "  # Clientes en otros PCs del mismo Wi‑Fi/LAN:"
Write-Host "  http://${ip}:3000"
Write-Host ""
Write-Host "  Runbook: docs/operacion/DEPLOY-LAN-UN-PC.md"
Write-Host ""

if (-not (Test-Path $rootEnv)) {
  Write-Warn "Edite .env.production: DB_PASS, JWT_SECRET y JWT_REFRESH_SECRET antes de 'docker compose up'."
}
