# isaac-mcp Setup

## Prerequisites

- Python 3.11+
- `uv` package manager
- NVIDIA GPU with RTX (required for Isaac Sim)
- NVIDIA Isaac Sim installed (see below)

## Installation

```powershell
git clone https://github.com/sandraschi/isaac-mcp.git
cd isaac-mcp
uv sync
```

## Simulator Setup

### Option 1: NVIDIA Isaac Sim (Binary Install)

1. Download Isaac Sim from [developer.nvidia.com/isaac-sim](https://developer.nvidia.com/isaac-sim)
2. Install (default path: `C:\Program Files\NVIDIA\Isaac Sim`)
3. Verify Isaac Python is on PATH or set `ISAAC_SIM_PATH`

The server auto-detects Isaac Sim's Python interpreter from common install locations:
- `C:\Program Files\NVIDIA\Isaac Sim\python.bat`
- `~/.local/share/ov/pkg/isaac_sim-*/python.sh`

### Option 2: pip install (if supported)

```bash
uv pip install isaacsim[all,extscache]==5.1.0 --extra-index-url https://pypi.nvidia.com
```

Create a Python 3.11 virtualenv and install from the NVIDIA index:
```bash
uv venv .venv-isaac311
uv pip install isaacsim[all,extscache]==5.1.0 --extra-index-url https://pypi.nvidia.com
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ISAAC_SIM_PATH` | `C:/Program Files/NVIDIA/Isaac Sim` | Isaac Sim installation path |
| `ISAAC_PYTHON` | auto-detected | Full path to Isaac Sim's Python interpreter |
| `ISAAC_MCP_SCENES_DIR` | `./scenes/` | Scene USD depot directory |
| `ISAAC_MCP_JOBS_DIR` | `./jobs/` | Job state directories |

### Ports

| Service | Port |
|---------|------|
| Backend (REST + MCP HTTP) | 11049 |
| Frontend (Vite dev) | 11048 |

## Running

### MCP stdio

```powershell
uv run python -m isaac_mcp
```

### Web Dashboard

```powershell
.\web_sota\start.ps1
```

## Testing

```powershell
uv run pytest tests/ -q
ruff check src/ web_sota/backend/
```

## Troubleshooting

### "Isaac Sim Python not found"

**Cause:** Auto-detection failed or Isaac Sim not installed.  
**Fix:** Set `ISAAC_SIM_PATH` or `ISAAC_PYTHON` to the correct install path. Verify: `python.bat -c "import omni.isaac.core; print('ok')"`

### "No GPU found" / no GPUs in sim_status

**Cause:** `nvidia-smi` not available or no NVIDIA GPU.  
**Fix:** Isaac Sim requires an NVIDIA RTX GPU. Run `nvidia-smi` to verify driver installation.

### Isaac Sim startup takes >10 minutes

**Cause:** First launch pulls extensions from the NVIDIA index.  
**Fix:** This is normal for the first run. Subsequent launches are faster. Use `get_state` to poll for readiness.

### "Runner exited immediately" on start_sim

**Cause:** Missing scene file, Python dependency issue, or GPU incompatibility.  
**Fix:** Check `jobs/<job_id>/runner.log` for the full error traceback.

### USD file not found

**Cause:** The URI path doesn't exist or the depot hasn't been populated.  
**Fix:** Use `load_scene` with a valid URL or local path. Verify with `list_scenes`.

### Port 11048/11049 already in use

**Cause:** Another process is bound.  
**Fix:**
```powershell
Get-NetTCPConnection -LocalPort 11048 | ForEach { Stop-Process $_.OwningProcess -Force }
```

### Out of GPU memory

**Cause:** Isaac Sim consumes VRAM per instance.  
**Fix:** Close other GPU applications. Use `start_sim(headless=True)` to reduce memory usage.

### apply_control has no effect

**Cause:** Actuator names in the ctrl dict don't match the USD robot definition.  
**Fix:** Use `get_state` first to see the available joint/actuator names.
