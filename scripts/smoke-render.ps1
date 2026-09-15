param([string]$BaseUrl = "https://sk-store-ke6x.onrender.com")
$ErrorActionPreference = "Stop"
$paths = @("/api/health", "/api/payment/mode", "/api/catalog", "/api/catalog/sensi-normal", "/api/catalog/sensi-premium", "/api/catalog/sensi-emulator")
foreach ($path in $paths) {
  $response = Invoke-WebRequest -Uri ($BaseUrl.TrimEnd("/") + $path) -UseBasicParsing -TimeoutSec 30
  if ($response.StatusCode -ne 200) { throw "$path returned $($response.StatusCode)" }
  Write-Output "$path OK"
}
