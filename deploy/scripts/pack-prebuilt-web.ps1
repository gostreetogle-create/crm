# Собирает deploy/prebuilt-web.zip из crm-web/dist/crm-web/browser/ (после nx build).
# Запуск из любого каталога:  powershell -ExecutionPolicy Bypass -File deploy/scripts/pack-prebuilt-web.ps1

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$browser = Join-Path $repoRoot 'crm-web\dist\crm-web\browser'
$zip = Join-Path $repoRoot 'deploy\prebuilt-web.zip'

if (-not (Test-Path (Join-Path $browser 'index.html'))) {
  Write-Error "Missing $($browser)\index.html - run: cd crm-web; node scripts/sync-canonical-roles.cjs; npx nx run crm-web:build:production"
}

$zipDir = Split-Path -Parent $zip
if (-not (Test-Path $zipDir)) { New-Item -ItemType Directory -Path $zipDir | Out-Null }
if (Test-Path $zip) { Remove-Item -Force $zip }

Compress-Archive -Path (Join-Path $browser '*') -DestinationPath $zip -CompressionLevel Fastest
Write-Host "OK: $zip"
