# Полный сброс локальной dev-БД: Docker Postgres (если нужно) + prisma migrate reset + seed.
# НЕ использовать на production / удалённой БД — скрипт откажется, если DATABASE_URL не localhost.

$ErrorActionPreference = 'Stop'
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$EnvFile = Join-Path $RepoRoot 'backend\.env'

if (-not (Test-Path $EnvFile)) {
  Write-Error "Нет backend\.env. Скопируйте backend\.env.example и задайте DATABASE_URL на локальный Postgres."
}

$dbUrl = $null
foreach ($line in Get-Content $EnvFile) {
  if ($line -match '^\s*DATABASE_URL\s*=\s*(.+)\s*$') {
    $dbUrl = $matches[1].Trim().Trim('"').Trim("'")
    break
  }
}
if (-not $dbUrl) {
  Write-Error "В backend\.env не найдена строка DATABASE_URL."
}

$safe = $dbUrl -match '127\.0\.0\.1|localhost'
if (-not $safe) {
  Write-Error "DATABASE_URL не похож на локальный хост (нет 127.0.0.1 или localhost). Сброс отменён: $($dbUrl.Substring(0, [Math]::Min(60, $dbUrl.Length)))..."
}

Write-Host "[crm] DATABASE_URL — локальный хост, продолжаю."
Write-Host "[crm] Поднимаю postgres (docker compose)..."
Set-Location $RepoRoot
$composeEnv = Join-Path $RepoRoot 'deploy\.env'
if (Test-Path $composeEnv) {
  docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d postgres
} else {
  docker compose -f deploy/docker-compose.yml up -d postgres
}
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

Start-Sleep -Seconds 6
Set-Location (Join-Path $RepoRoot 'backend')
Write-Host "[crm] npm run db:reset (миграции + seed)..."
npm run db:reset
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
Write-Host "[crm] Готово: локальная БД сброшена и засеяна."
