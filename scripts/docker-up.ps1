$ErrorActionPreference = "Continue"

function Invoke-WithTimeout {
  param(
    [string]$FilePath,
    [string[]]$ArgumentList,
    [int]$TimeoutSeconds = 30
  )

  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $FilePath
  $psi.Arguments = ($ArgumentList -join " ")
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true

  $process = [System.Diagnostics.Process]::Start($psi)
  if (-not $process.WaitForExit($TimeoutSeconds * 1000)) {
    try { $process.Kill() } catch {}
    return @{ Ok = $false; Output = "Timed out after ${TimeoutSeconds}s" }
  }

  $stdout = $process.StandardOutput.ReadToEnd()
  $stderr = $process.StandardError.ReadToEnd()
  return @{
    Ok = ($process.ExitCode -eq 0)
    Output = ($stdout + $stderr).Trim()
    ExitCode = $process.ExitCode
  }
}

Set-Location (Join-Path $PSScriptRoot "..")

Write-Host "Checking Docker engine (fresh installs can take several minutes)..."
$ready = $false
for ($i = 1; $i -le 24; $i++) {
  $info = Invoke-WithTimeout -FilePath "docker" -ArgumentList @("info", "--format", "{{.ServerVersion}}") -TimeoutSeconds 25
  if ($info.Ok -and $info.Output -match "\d") {
    Write-Host "Docker engine ready: $($info.Output)"
    $ready = $true
    break
  }
  Write-Host "  attempt $i/24... $($info.Output)"
  Start-Sleep -Seconds 5
}

if (-not $ready) {
  Write-Error "Docker engine is not ready. Open Docker Desktop and wait for 'Engine running', then run: npm run docker:up"
  exit 1
}
Write-Host "Starting postgres and redis..."
$up = Invoke-WithTimeout -FilePath "docker" -ArgumentList @("compose", "up", "-d", "postgres", "redis") -TimeoutSeconds 600
Write-Host $up.Output
if (-not $up.Ok) { exit 1 }

Write-Host ""
Write-Host "Waiting for postgres health..."
$healthy = $false
for ($i = 1; $i -le 30; $i++) {
  $status = Invoke-WithTimeout -FilePath "docker" -ArgumentList @(
    "inspect", "-f", "{{.State.Health.Status}}", "rentvest-postgres"
  ) -TimeoutSeconds 10
  if ($status.Output -eq "healthy") {
    $healthy = $true
    break
  }
  Start-Sleep -Seconds 2
}

if (-not $healthy) {
  Write-Warning "Postgres health check did not report healthy yet. Continuing anyway..."
}

Write-Host ""
Write-Host "Container status:"
$ps = Invoke-WithTimeout -FilePath "docker" -ArgumentList @("ps", "--format", "table {{.Names}}\t{{.Status}}\t{{.Ports}}") -TimeoutSeconds 20
Write-Host $ps.Output

Write-Host ""
Write-Host "Next: npm run db:push && npm run dev:webpack"
