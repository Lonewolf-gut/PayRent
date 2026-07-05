$ErrorActionPreference = "Stop"

$root = Join-Path $PSScriptRoot ".."
Set-Location $root

Write-Host "=== PayRent stack startup ==="
& (Join-Path $PSScriptRoot "docker-up.ps1")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Syncing database schema..."
npm run db:push
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Done. Start the app with: npm run dev:webpack"
