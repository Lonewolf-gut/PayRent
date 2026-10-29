# Quick check: is Postgres reachable on localhost:5432?
Write-Host "Checking Docker..." -ForegroundColor Cyan
docker info 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Docker is not running. Start Docker Desktop and try again." -ForegroundColor Red
  exit 1
}

Write-Host "`nContainer status:" -ForegroundColor Cyan
docker compose -f "$PSScriptRoot\..\docker-compose.yml" ps -a

Write-Host "`nStarting postgres + redis if needed..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot\.."
docker compose up -d postgres redis

Start-Sleep -Seconds 5
docker compose ps

Write-Host "`nTesting port 5432..." -ForegroundColor Cyan
$tcp = Test-NetConnection -ComputerName localhost -Port 5432 -WarningAction SilentlyContinue
if ($tcp.TcpTestSucceeded) {
  Write-Host "Port 5432 is open. Run: npx prisma db push" -ForegroundColor Green
} else {
  Write-Host "Port 5432 is NOT reachable. Check Docker Desktop and container logs:" -ForegroundColor Red
  Write-Host "  docker compose logs postgres"
}
