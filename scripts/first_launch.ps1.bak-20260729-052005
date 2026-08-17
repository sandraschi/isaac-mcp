# first_launch.ps1 — one-time Isaac Sim bring-up for isaac-mcp.
#
# Running this script ACCEPTS the NVIDIA Omniverse License Agreement
# (https://docs.omniverse.nvidia.com/platform/latest/common/NVIDIA_Omniverse_License_Agreement.html)
# via OMNI_KIT_ACCEPT_EULA=YES. Do not run it if you do not accept those terms.
#
# First launch pulls Kit extensions (10+ minutes) and compiles shaders.
# Subsequent launches use the cache and start in seconds.

$ErrorActionPreference = "Continue"
$repo = "D:\Dev\repos\isaac-mcp"
$env:OMNI_KIT_ACCEPT_EULA = "YES"
$env:ACCEPT_EULA = "Y"

Set-Location $repo

# Register the test scene in the depot
$registry = "$repo\scenes\.depot\registry.json"
$depot = if (Test-Path $registry) { Get-Content $registry -Raw | ConvertFrom-Json -AsHashtable } else { @{} }
$depot["test_cube"] = @{ uri = "builtin"; path = "$repo\scenes\test_cube.usda"; size_kb = 0.4; format = ".usda" }
$depot | ConvertTo-Json -Depth 4 | Set-Content $registry

Write-Host "Launching Isaac Sim runner (headless) against test_cube.usda ..."
Write-Host "First run pulls extensions — expect 10+ minutes. Log: $repo\jobs\firstlaunch\runner.log"
New-Item -ItemType Directory -Path "$repo\jobs\firstlaunch" -Force | Out-Null

& "$repo\.venv-isaac311\Scripts\python.exe" "$repo\src\isaac_mcp\_sim_runner.py" `
    --scene-path "$repo\scenes\test_cube.usda" `
    --job-id "firstlaunch" `
    --jobs-dir "$repo\jobs" `
    --headless *>&1 | Tee-Object "$repo\jobs\firstlaunch\runner.log"

Write-Host "`nTo stop: New-Item '$repo\jobs\firstlaunch\stop.signal' -ItemType File"
Write-Host "Verify:  Get-Content '$repo\jobs\firstlaunch\state.json'"
