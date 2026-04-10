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

function Stop-ProcessByPort {
    param(
        [Parameter(Mandatory = $true)]
        [int]$Port
    )

    $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if (-not $connections) {
        return
    }

    $pids = $connections |
        Select-Object -ExpandProperty OwningProcess -Unique |
        Where-Object { $_ -gt 0 }

    $allowedProcessNames = @("node", "npm", "npx")

    foreach ($pid in $pids) {
        try {
            $proc = Get-Process -Id $pid -ErrorAction Stop
            $processName = $proc.ProcessName.ToLowerInvariant()
            if ($allowedProcessNames -contains $processName) {
                Write-Host "Stopping PID $pid on port $Port ($($proc.ProcessName))..." -ForegroundColor DarkYellow
                Stop-Process -Id $pid -Force -ErrorAction Stop
            } else {
                Write-Host "Skip PID $pid on port $Port ($($proc.ProcessName)): not node/npm/npx." -ForegroundColor Yellow
            }
        } catch {
            Write-Host "Cannot stop PID $pid on port ${Port}: $($_.Exception.Message)" -ForegroundColor DarkGray
        }
    }
}

Write-Host "Freeing ports 3000 and 4200..." -ForegroundColor Cyan
Stop-ProcessByPort -Port 3000
Stop-ProcessByPort -Port 4200

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
