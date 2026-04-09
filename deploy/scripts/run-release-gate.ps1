param(
  [switch]$SkipMigrate,
  [switch]$SkipSmoke,
  [switch]$DryRun,
  [switch]$CriticalOnly,
  [switch]$Help,
  [string]$ReportPath = ""
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw "npm not found in PATH. Install Node.js/npm before running release gate."
}

if ($Help) {
  Write-Host @"
Usage:
  powershell -ExecutionPolicy Bypass -File deploy/scripts/run-release-gate.ps1 [options]

Options:
  -SkipMigrate          Skip backend db:migrate:deploy
  -SkipSmoke            Skip frontend e2e:smoke
  -CriticalOnly         Shortcut for -SkipMigrate + -SkipSmoke
  -DryRun               Print steps without running commands
  -ReportPath <file>    Write JSON report to file
  -Help                 Show this help

Examples:
  powershell -ExecutionPolicy Bypass -File deploy/scripts/run-release-gate.ps1 -CriticalOnly -ReportPath "./release-gate-report.json"
  powershell -ExecutionPolicy Bypass -File deploy/scripts/run-release-gate.ps1 -SkipMigrate
"@
  exit 0
}

if ($CriticalOnly) {
  $SkipMigrate = $true
  $SkipSmoke = $true
}

$script:steps = [System.Collections.Generic.List[object]]::new()

function Add-StepRecord {
  param(
    [string]$Title,
    [string]$Status,
    [int]$DurationMs = 0,
    [string]$Error = ""
  )
  $script:steps.Add([pscustomobject]@{
    title = $Title
    status = $Status
    durationMs = $DurationMs
    error = $Error
  }) | Out-Null
}

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)][string]$Title,
    [Parameter(Mandatory = $true)][scriptblock]$Action
  )
  Write-Host ""
  Write-Host "==> $Title" -ForegroundColor Cyan
  if ($DryRun) {
    Write-Host "[dry-run] step skipped"
    Add-StepRecord -Title $Title -Status "dry-run"
    return
  }
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  try {
    & $Action
    $sw.Stop()
    Add-StepRecord -Title $Title -Status "ok" -DurationMs ([int]$sw.ElapsedMilliseconds)
  } catch {
    $sw.Stop()
    Add-StepRecord -Title $Title -Status "failed" -DurationMs ([int]$sw.ElapsedMilliseconds) -Error $_.Exception.Message
    throw
  }
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent (Split-Path -Parent $ScriptDir)
$BackendDir = Join-Path $RepoRoot "backend"
$FrontendDir = Join-Path $RepoRoot "crm-web"

if (-not (Test-Path $BackendDir)) { throw "Не найден backend: $BackendDir" }
if (-not (Test-Path $FrontendDir)) { throw "Не найден crm-web: $FrontendDir" }
if (-not (Test-Path (Join-Path $BackendDir "node_modules"))) {
  throw "backend/node_modules not found. Run: cd backend; npm install"
}
if (-not (Test-Path (Join-Path $FrontendDir "node_modules"))) {
  throw "crm-web/node_modules not found. Run: cd crm-web; npm install"
}

Write-Host "Release gate started. Repo root: $RepoRoot" -ForegroundColor Green
if ($DryRun) {
  Write-Host "Dry-run mode enabled: commands will not execute." -ForegroundColor Yellow
}

try {
if (-not $SkipMigrate) {
  Invoke-Step -Title "backend: migrate deploy" -Action {
    Push-Location $BackendDir
    try {
      npm run db:migrate:deploy
    } finally {
      Pop-Location
    }
  }
} else {
  Write-Host "==> backend: migrate deploy (SKIPPED)" -ForegroundColor Yellow
  Add-StepRecord -Title "backend: migrate deploy" -Status "skipped"
}

Invoke-Step -Title "backend: test:critical" -Action {
  Push-Location $BackendDir
  try {
    npm run test:critical
  } finally {
    Pop-Location
  }
}

Invoke-Step -Title "crm-web: test:critical" -Action {
  Push-Location $FrontendDir
  try {
    npm run test:critical
  } finally {
    Pop-Location
  }
}

if (-not $SkipSmoke) {
  Invoke-Step -Title "crm-web: e2e:smoke" -Action {
    Push-Location $FrontendDir
    try {
      try {
        npm run e2e:smoke
      } catch {
        Write-Host ""
        Write-Host "Smoke failed. Hint: ensure Playwright browser is installed:" -ForegroundColor Yellow
        Write-Host "  cd crm-web && npx playwright install chromium" -ForegroundColor Yellow
        throw
      }
    } finally {
      Pop-Location
    }
  }
} else {
  Write-Host "==> crm-web: e2e:smoke (SKIPPED)" -ForegroundColor Yellow
  Add-StepRecord -Title "crm-web: e2e:smoke" -Status "skipped"
}

Write-Host ""
Write-Host "Release gate passed." -ForegroundColor Green
  $gateStatus = "passed"
} catch {
  $gateStatus = "failed"
  throw
} finally {
  if ($ReportPath.Trim()) {
    $report = [pscustomobject]@{
      ts = (Get-Date).ToString("o")
      gateStatus = $gateStatus
      dryRun = [bool]$DryRun
      criticalOnly = [bool]$CriticalOnly
      skipMigrate = [bool]$SkipMigrate
      skipSmoke = [bool]$SkipSmoke
      steps = @($script:steps)
    }
    $reportDir = Split-Path -Parent $ReportPath
    if ($reportDir -and -not (Test-Path $reportDir)) {
      New-Item -ItemType Directory -Path $reportDir -Force | Out-Null
    }
    $report | ConvertTo-Json -Depth 8 | Set-Content -Path $ReportPath -Encoding UTF8
    Write-Host "Release gate report written: $ReportPath"
  }
}
