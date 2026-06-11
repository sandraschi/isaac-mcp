param([switch]$NoBrowser)
$ErrorActionPreference = "Stop"
$ScriptRoot = Split-Path -Parent $PSCommandPath
Write-Host "=== isaac-mcp ===" -ForegroundColor Cyan
if ($NoBrowser) { & "$ScriptRoot\web_sota\start.ps1" -NoBrowser } else { & "$ScriptRoot\web_sota\start.ps1" }
