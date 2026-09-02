param([switch]$Headless, [switch]$BackendOnly, [switch]$NoBrowser)
$ErrorActionPreference = "Stop"
$ScriptRoot = Split-Path -Parent $PSCommandPath
$RepoRoot = Split-Path -Parent $ScriptRoot
$BackendPort = 11049
$FrontendPort = 11048

Write-Host "==> Isaac MCP Webapp" -ForegroundColor Cyan

Get-NetTCPConnection -LocalPort $BackendPort -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
}
Get-NetTCPConnection -LocalPort $FrontendPort -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
}
Start-Sleep 1

Write-Host "==> Starting backend on port $BackendPort..." -ForegroundColor Cyan
$BackendJob = Start-Job -Name "isaac-backend" -ScriptBlock {
    param($Root, $Port)
    Set-Location $Root
    uv run python -m web_sota.backend.server --port $Port
} -ArgumentList $RepoRoot, $BackendPort

Write-Host "==> Waiting for backend..." -ForegroundColor Yellow
for ($i = 0; $i -lt 60; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:$BackendPort/health" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
        if ($r.StatusCode -eq 200) { Write-Host "==> Backend ready" -ForegroundColor Green; break }
    } catch {}
    Start-Sleep 1
}

if ($BackendOnly) {
    Write-Host "Backend running at http://127.0.0.1:$BackendPort" -ForegroundColor Green
    while ($true) { Start-Sleep 10 }
}

Write-Host "==> Starting frontend on port $FrontendPort..." -ForegroundColor Cyan
$WebRoot = Join-Path $ScriptRoot "."
Start-Process -NoNewWindow -FilePath "cmd.exe" -ArgumentList "/c","npx vite --port $FrontendPort --host" -WorkingDirectory $WebRoot

Start-Sleep 3

if (-not $NoBrowser) {
    Start-Process "http://127.0.0.1:$FrontendPort"
}

Write-Host "==> Frontend at http://127.0.0.1:$FrontendPort" -ForegroundColor Green
Write-Host "==> Backend at http://127.0.0.1:$BackendPort" -ForegroundColor Green

while ($true) {
    if ($BackendJob.State -eq "Completed" -or $BackendJob.State -eq "Failed") {
        Receive-Job $BackendJob
        break
    }
    Start-Sleep 2
}
