$ErrorActionPreference = "Continue"

function Invoke-WithTimeout {
  param(
    [string]$FilePath,
    [string[]]$ArgumentList,
    [int]$TimeoutSeconds = 15
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

Write-Host "Stopping Docker Desktop processes..."
Get-Process -Name "Docker Desktop", "com.docker.backend", "com.docker.proxy" -ErrorAction SilentlyContinue |
  Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 8

$dockerExe = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
if (-not (Test-Path $dockerExe)) {
  Write-Error "Docker Desktop executable not found at $dockerExe"
  exit 1
}

Write-Host "Starting Docker Desktop..."
Start-Process $dockerExe

Write-Host "Waiting for Docker engine (up to 3 minutes)..."
$ready = $false
for ($i = 1; $i -le 18; $i++) {
  Start-Sleep -Seconds 10
  $result = Invoke-WithTimeout -FilePath "docker" -ArgumentList @("info", "--format", "{{.ServerVersion}}") -TimeoutSeconds 15
  if ($result.Ok -and $result.Output -match "\d") {
    Write-Host "Docker engine ready. Server version: $($result.Output)"
    $ready = $true
    break
  }
  Write-Host "  attempt $i/18... $($result.Output)"
}

if (-not $ready) {
  Write-Error "Docker engine did not become ready. Open Docker Desktop and wait for 'Engine running', then run: npm run docker:up"
  exit 1
}

Set-Location (Join-Path $PSScriptRoot "..")
Write-Host "Recreating PayRent containers (postgres + redis)..."
Invoke-WithTimeout -FilePath "docker" -ArgumentList @("compose", "down") -TimeoutSeconds 60 | Out-Null
$up = Invoke-WithTimeout -FilePath "docker" -ArgumentList @("compose", "up", "-d", "postgres", "redis") -TimeoutSeconds 120
Write-Host $up.Output
if (-not $up.Ok) { exit 1 }

Write-Host ""
Write-Host "Container status:"
$ps = Invoke-WithTimeout -FilePath "docker" -ArgumentList @("ps", "--format", "table {{.Names}}\t{{.Status}}\t{{.Ports}}") -TimeoutSeconds 30
Write-Host $ps.Output
