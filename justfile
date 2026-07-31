set windows-shell := ["powershell.exe", "-NoProfile", "-Command"]

import 'scripts/just/fleet.just'

# === Fleet-standard ===
bootstrap:
    uv sync

serve:
    uv run python -m isaac_mcp

lint:
    uv run ruff check src/ web_sota/backend/

fix:
    uv run ruff check --fix src/ web_sota/backend/

test:
    uv run pytest tests/ -q

e2e:
    cd web_sota && npx playwright test

web:
    powershell.exe -NoProfile -File ./web_sota/start.ps1

clean:
    powershell.exe -NoProfile -c "Remove-Item -Recurse -Force -Path dist,.venv,__pycache__ -ErrorAction SilentlyContinue"

# === Repo-specific ===
gpu-info:
    powershell.exe -NoProfile -c "if (Get-Command nvidia-smi -ErrorAction SilentlyContinue) { nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv } else { Write-Host 'No NVIDIA GPU detected' }"

check-isaac:
    powershell.exe -NoProfile -c "try { & 'C:\Program Files\NVIDIA Corporation\Isaac Sim\python.bat' -c 'import omni.isaac.core; print(\"Isaac Sim OK\")' 2>&1 } catch { Write-Host 'Isaac Sim not found' }"

scenes:
    uv run python -c "from pathlib import Path; p = Path('scenes'); print('Scenes:', [f.name for f in p.glob('*.usd')]) if p.exists() else print('no scenes dir')"

# Bootstrap: install dev deps + pre-commit hook
