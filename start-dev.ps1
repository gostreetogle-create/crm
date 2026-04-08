# Local dev: two PowerShell windows (backend + frontend).
# Start PostgreSQL first, e.g.: docker compose up -d postgres
#
# Run: .\start-dev.ps1
# If blocked: Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
#
# Inner Start-Process commands use ASCII only (PowerShell 5 + encoding-safe).

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

$backend = Join-Path $root "backend"
$front = Join-Path $root "crm-web"

Write-Host "Starting backend (port 3000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-NoLogo",
    "-Command",
    "Set-Location -LiteralPath '$backend'; Write-Host 'BACKEND http://localhost:3000' -ForegroundColor Green; npm run dev"
)

Start-Sleep -Seconds 1

Write-Host "Starting frontend (port 4200)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-NoLogo",
    "-Command",
    "Set-Location -LiteralPath '$front'; Write-Host 'FRONT http://localhost:4200' -ForegroundColor Green; npm start"
)

Write-Host ""
Write-Host "Done. Site: http://localhost:4200" -ForegroundColor Yellow
Write-Host "Close both windows when finished." -ForegroundColor Gray
