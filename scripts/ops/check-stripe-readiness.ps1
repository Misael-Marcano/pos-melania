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

  [switch]$RunCheckout,
  [switch]$RunPortal
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

function Write-WarnMsg {
  param([string]$Message)
  Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Fail {
  param([string]$Message)
  Write-Host "[FAIL] $Message" -ForegroundColor Red
}

function Normalize-BaseUrl {
  param([string]$Url)
  if ($Url.EndsWith("/")) {
    return $Url.TrimEnd("/")
  }
  return $Url
}

function Invoke-Api {
  param(
    [ValidateSet("GET", "POST")]
    [string]$Method,
    [string]$Url,
    [hashtable]$Headers,
    [object]$Body = $null
  )

  if ($null -eq $Body) {
    return Invoke-RestMethod -Method $Method -Uri $Url -Headers $Headers
  }

  $json = $Body | ConvertTo-Json -Depth 8
  return Invoke-RestMethod -Method $Method -Uri $Url -Headers $Headers -Body $json -ContentType "application/json"
}

$ApiBaseUrl = Normalize-BaseUrl -Url $ApiBaseUrl
$headers = @{
  Authorization = "Bearer $JwtToken"
}

if ($TenantId -gt 0) {
  $headers["X-Tenant-Id"] = "$TenantId"
}

Write-Step "Billing status"
$statusUrl = "$ApiBaseUrl/billing/status"
$statusResponse = Invoke-Api -Method "GET" -Url $statusUrl -Headers $headers

if (-not $statusResponse.success) {
  throw "La API devolvio success=false en /billing/status"
}

$statusData = $statusResponse.data

Write-Host ("provider={0} configured={1} webhookConfigured={2} pricesConfigured={3}" -f `
  $statusData.provider, $statusData.configured, $statusData.webhookConfigured, $statusData.pricesConfigured)
Write-Host ("hint={0}" -f $statusData.hint)

if ($statusData.provider -ne "stripe") {
  Write-WarnMsg "BILLING_PROVIDER no esta en stripe para esta instancia."
} else {
  Write-Ok "Billing provider = stripe"
}

if ($statusData.configured) {
  Write-Ok "STRIPE_SECRET_KEY parece configurada"
} else {
  Write-WarnMsg "STRIPE_SECRET_KEY pendiente o placeholder"
}

if ($statusData.webhookConfigured) {
  Write-Ok "STRIPE_WEBHOOK_SECRET detectado"
} else {
  Write-WarnMsg "Webhook no configurado (STRIPE_WEBHOOK_SECRET)"
}

if ($statusData.pricesConfigured) {
  Write-Ok "STRIPE_PRICE_* detectados"
} else {
  Write-WarnMsg "Faltan STRIPE_PRICE_* para checkout"
}

if ($null -ne $statusData.tenant) {
  Write-Host ("tenant.id={0} plan={1} billingStatus={2}" -f `
    $statusData.tenant.id, $statusData.tenant.planCode, $statusData.tenant.billingStatus)

  if ($statusData.tenant.stripeSubscriptionId) {
    Write-Ok "Tenant tiene stripeSubscriptionId"
  } else {
    Write-WarnMsg "Tenant sin stripeSubscriptionId aun"
  }
} else {
  Write-WarnMsg "Sin bloque tenant en respuesta; revisa JWT o X-Tenant-Id."
}

if ($RunCheckout) {
  Write-Step "Create checkout session"
  $checkoutUrl = "$ApiBaseUrl/billing/create-checkout-session"
  $checkoutBody = @{
    successUrl = $SuccessUrl
    cancelUrl  = $CancelUrl
    planCode   = $PlanCode
  }
  $checkoutResponse = Invoke-Api -Method "POST" -Url $checkoutUrl -Headers $headers -Body $checkoutBody
  if ($checkoutResponse.success -and $checkoutResponse.data.url) {
    Write-Ok "Checkout URL generada"
    Write-Host ("checkoutUrl={0}" -f $checkoutResponse.data.url)
  } else {
    Write-Fail "No se pudo generar checkout URL"
  }
}

if ($RunPortal) {
  Write-Step "Create portal session"
  $portalUrl = "$ApiBaseUrl/billing/create-portal-session"
  $portalBody = @{
    returnUrl = $ReturnUrl
  }
  $portalResponse = Invoke-Api -Method "POST" -Url $portalUrl -Headers $headers -Body $portalBody
  if ($portalResponse.success -and $portalResponse.data.url) {
    Write-Ok "Portal URL generada"
    Write-Host ("portalUrl={0}" -f $portalResponse.data.url)
  } else {
    Write-Fail "No se pudo generar portal URL"
  }
}

Write-Step "Done"
Write-Ok "Verificacion finalizada."
