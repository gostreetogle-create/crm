param(
  [string]$OfferId = "",
  [string]$AuthToken = "",
  [string]$BaseApiUrl = "http://127.0.0.1:3000/api",
  [ValidateSet("proposal_draft", "proposal_waiting", "proposal_paid")]
  [string]$TargetStatus = "proposal_paid",
  [int]$Requests = 20,
  [int]$Concurrency = 5,
  [int]$TimeoutSec = 15,
  [string]$ReportPath = "",
  [switch]$Strict,
  [switch]$Help
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

if ($Help) {
  Write-Host @"
Usage:
  powershell -ExecutionPolicy Bypass -File deploy/scripts/run-concurrency-probe.ps1 `
    -OfferId <offer-id> `
    -AuthToken <jwt> `
    [-BaseApiUrl http://127.0.0.1:3000/api] `
    [-TargetStatus proposal_paid] `
    [-Requests 50] `
    [-Concurrency 10] `
    [-TimeoutSec 15] `
    [-ReportPath ./probe-report.json] `
    [-Strict]
"@
  exit 0
}

if (-not $OfferId.Trim()) { throw "OfferId is required. Use -OfferId <offer-id>" }
if (-not $AuthToken.Trim()) { throw "AuthToken is required. Use -AuthToken <jwt>" }
if ($Requests -lt 1) { throw "Requests must be >= 1" }
if ($Concurrency -lt 1) { throw "Concurrency must be >= 1" }
if ($TimeoutSec -lt 1) { throw "TimeoutSec must be >= 1" }

$endpoint = "$($BaseApiUrl.TrimEnd('/'))/commercial-offers/$OfferId/status"
$headers = @{
  Authorization = "Bearer $AuthToken"
  "Content-Type" = "application/json"
}
$body = (@{ statusKey = $TargetStatus } | ConvertTo-Json -Depth 3)

Write-Host "Concurrency probe started" -ForegroundColor Cyan
Write-Host "Endpoint: $endpoint"
Write-Host "Requests: $Requests, Concurrency: $Concurrency, TargetStatus: $TargetStatus"
Write-Host "TimeoutSec: $TimeoutSec"

$jobs = @()
for ($i = 1; $i -le $Requests; $i++) {
  while (($jobs | Where-Object { $_.State -eq "Running" }).Count -ge $Concurrency) {
    Start-Sleep -Milliseconds 100
  }
  $jobs += Start-Job -ScriptBlock {
    param($url, $h, $b, $timeoutSec)
    try {
      $resp = Invoke-WebRequest -Uri $url -Method POST -Headers $h -Body $b -UseBasicParsing -TimeoutSec $timeoutSec
      return [pscustomobject]@{
        ok = $true
        statusCode = [int]$resp.StatusCode
        error = ""
      }
    } catch {
      $status = 0
      $msg = $_.Exception.Message
      if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
        $status = [int]$_.Exception.Response.StatusCode
      }
      return [pscustomobject]@{
        ok = $false
        statusCode = $status
        error = $msg
      }
    }
  } -ArgumentList $endpoint, $headers, $body, $TimeoutSec
}

Wait-Job -Job $jobs | Out-Null
$results = $jobs | Receive-Job
$jobs | Remove-Job -Force | Out-Null

$total = $results.Count
$success = ($results | Where-Object { $_.ok }).Count
$fail = $total - $success
$byCode = $results | Group-Object statusCode | Sort-Object Name

Write-Host ""
Write-Host "Probe summary" -ForegroundColor Green
Write-Host "Total: $total"
Write-Host "Success: $success"
Write-Host "Failed: $fail"
Write-Host "By status code:"
foreach ($g in $byCode) {
  Write-Host ("  {0}: {1}" -f $g.Name, $g.Count)
}

if ($fail -gt 0) {
  Write-Host ""
  Write-Host "Sample errors:" -ForegroundColor Yellow
  $results | Where-Object { -not $_.ok } | Select-Object -First 5 | ForEach-Object {
    Write-Host ("  [{0}] {1}" -f $_.statusCode, $_.error)
  }
}

Write-Host ""
Write-Host "Done."

if ($ReportPath.Trim()) {
  $report = [pscustomobject]@{
    ts = (Get-Date).ToString("o")
    endpoint = $endpoint
    targetStatus = $TargetStatus
    requests = $Requests
    concurrency = $Concurrency
    timeoutSec = $TimeoutSec
    strict = [bool]$Strict
    total = $total
    success = $success
    failed = $fail
    byStatusCode = @(
      $byCode | ForEach-Object {
        [pscustomobject]@{
          statusCode = [int]$_.Name
          count = [int]$_.Count
        }
      }
    )
  }
  $reportDir = Split-Path -Parent $ReportPath
  if ($reportDir -and -not (Test-Path $reportDir)) {
    New-Item -ItemType Directory -Path $reportDir -Force | Out-Null
  }
  $report | ConvertTo-Json -Depth 5 | Set-Content -Path $ReportPath -Encoding UTF8
  Write-Host "Report written: $ReportPath"
}

if ($Strict -and $fail -gt 0) {
  throw "Concurrency probe failed in strict mode: non-2xx responses detected."
}
