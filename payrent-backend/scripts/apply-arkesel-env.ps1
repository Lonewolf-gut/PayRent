# Adds Arkesel SMS settings to .env (run from project root)
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/apply-arkesel-env.ps1

$ErrorActionPreference = "Stop"
$root = Join-Path $PSScriptRoot ".."
$envFile = Join-Path $root ".env"
$pasteFile = Join-Path $root "docs\arkesel-copy-to-env.txt"

if (-not (Test-Path $envFile)) {
  Copy-Item (Join-Path $root ".env.example") $envFile
  Write-Host "Created .env from .env.example"
}

$block = @"

# --- Arkesel SMS ---
SMS_PROVIDER=arkesel
SMS_API_KEY=b3Zabnd6V1RWQW9MeFlmUG9ialM
ARKESEL_SMS_SENDER_ID=PayForMe
ARKESEL_SMS_API_VERSION=legacy
SMS_API_URL=https://sms.arkesel.com/sms/api
"@

$content = Get-Content $envFile -Raw -ErrorAction SilentlyContinue
if ($content -match "SMS_PROVIDER=arkesel") {
  Write-Host "Arkesel SMS already in .env — update manually or edit docs/arkesel-copy-to-env.txt"
} else {
  Add-Content -Path $envFile -Value $block
  Write-Host "Added Arkesel SMS block to .env"
}

Write-Host ""
Write-Host "Edit ARKESEL_SMS_SENDER_ID in .env if your approved Sender ID is not PayForMe"
Write-Host "Then restart: npm run dev"
