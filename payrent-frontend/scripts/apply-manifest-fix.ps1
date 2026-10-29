# Applies Next.js "manifests singleton" fix locally (no git required).
# Run from PayRent-Frontend folder:
#   powershell -ExecutionPolicy Bypass -File scripts\apply-manifest-fix.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

Write-Host "PayRent Frontend: applying manifests fix in $root" -ForegroundColor Cyan

# 1) Marketing layout — force-dynamic
$layoutPath = Join-Path $root "app\(marketing)\layout.tsx"
if (-not (Test-Path $layoutPath)) {
  Write-Host "ERROR: Missing $layoutPath" -ForegroundColor Red
  exit 1
}
$layout = Get-Content $layoutPath -Raw
if ($layout -notmatch 'export const dynamic = "force-dynamic"') {
  $layout = $layout -replace '(import \{ MarketingThemeGuard \}[^\r\n]+[\r\n]+)', "`$1`r`nexport const dynamic = `"force-dynamic`";`r`n`r`n"
  if ($layout -notmatch 'export const dynamic = "force-dynamic"') {
    $layout = "export const dynamic = `"force-dynamic`";`r`n`r`n" + $layout
  }
  Set-Content -Path $layoutPath -Value $layout -NoNewline
  Write-Host "  Updated app\(marketing)\layout.tsx" -ForegroundColor Green
} else {
  Write-Host "  layout.tsx already has force-dynamic" -ForegroundColor DarkGray
}

# 2) Remove duplicate app/page.tsx
$pagePath = Join-Path $root "app\page.tsx"
if (Test-Path $pagePath) {
  Remove-Item $pagePath -Force
  Write-Host "  Removed app\page.tsx" -ForegroundColor Green
}

# 3) Ensure .env has AUTH_SECRET
$envPath = Join-Path $root ".env"
if (-not (Test-Path $envPath)) {
  Copy-Item (Join-Path $root ".env.example") $envPath -ErrorAction SilentlyContinue
}
if (Test-Path $envPath) {
  $envText = Get-Content $envPath -Raw
  if ($envText -notmatch 'AUTH_SECRET=') {
    Add-Content $envPath "`nAUTH_SECRET=local-dev-secret-change-me`n"
    Write-Host "  Added AUTH_SECRET to .env" -ForegroundColor Green
  }
  if ($envText -notmatch 'API_URL=') {
    Add-Content $envPath "API_URL=http://localhost:3001`n"
    Write-Host "  Added API_URL to .env" -ForegroundColor Green
  }
}

# 4) Clean build caches
Write-Host "  Cleaning .next / .next-dev ..." -ForegroundColor DarkGray
npm run clean 2>$null
if ($LASTEXITCODE -ne 0) {
  foreach ($d in @(".next", ".next-dev")) {
    $p = Join-Path $root $d
    if (Test-Path $p) { Remove-Item $p -Recurse -Force -ErrorAction SilentlyContinue }
  }
}

Write-Host ""
Write-Host "Done. Start the app with:" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Open http://localhost:3000 (use npm run dev, not npm start for daily work)." -ForegroundColor Yellow
