# Собирает deploy/prebuilt-web.zip из crm-web/dist/crm-web/browser/ (после nx build).
# Zip с путями через «/» — чтобы Linux unzip не ругался на backslashes из Compress-Archive.
# Запуск: powershell -ExecutionPolicy Bypass -File deploy/scripts/pack-prebuilt-web.ps1

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

$browserFull = (Resolve-Path -LiteralPath $browser).Path.TrimEnd('\') + '\'
Add-Type -AssemblyName System.IO.Compression
$zipStream = [System.IO.File]::Open($zip, [System.IO.FileMode]::Create)
try {
  $archive = New-Object System.IO.Compression.ZipArchive($zipStream, [System.IO.Compression.ZipArchiveMode]::Create)
  try {
    Get-ChildItem -LiteralPath $browser -Recurse -File | ForEach-Object {
      $rel = $_.FullName.Substring($browserFull.Length).Replace('\', '/')
      $entry = $archive.CreateEntry($rel, [System.IO.Compression.CompressionLevel]::Fastest)
      $entryStream = $entry.Open()
      try {
        $fileStream = [System.IO.File]::OpenRead($_.FullName)
        try { $fileStream.CopyTo($entryStream) }
        finally { $fileStream.Dispose() }
      }
      finally { $entryStream.Dispose() }
    }
  }
  finally { $archive.Dispose() }
}
finally { $zipStream.Dispose() }

Write-Host "OK: $zip"
