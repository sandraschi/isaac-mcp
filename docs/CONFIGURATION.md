# isaac-mcp — Configuration

All settings are environment variables (see `.env.example`; never commit `.env`).

| Variable | Default | Purpose |
|----------|---------|---------|
| `ISAAC_SIM_PATH` | `C:/Program Files/NVIDIA/Isaac Sim` | Isaac Sim install root (auto-detected from common locations) |
| `ISAAC_PYTHON` | auto (`.venv-isaac311` → bundle `python.bat`) | Isaac Sim Python 3.11 interpreter |
| `ISAAC_MCP_SCENES_DIR` | `./scenes/` | USD scene depot (registry `.depot/registry.json`) |
| `ISAAC_MCP_JOBS_DIR` | `./jobs/` | Sim job dirs (`state.json`, `control.json`, `stop.signal`) |
| `ISAAC_MCP_HOST` / `ISAAC_MCP_PORT` | `127.0.0.1` / `11049` | Backend bind (fleet registry) |

## Ports (fleet registry)

- `11049` backend (FastAPI + FastMCP HTTP `/mcp`), `11048` Vite frontend.
- CORS: explicit origins (11048/11049, Tauri schemes) + unconditional
  LAN/Tailscale regex in `web_sota/backend/server.py`. Never `["*"]`.

## Launcher

`fleet-start.config.ps1` (repo root) is the source of truth:
`Kind='uvicorn-web-app'`, `UvicornTarget='web_sota.backend.server:app'`,
`HealthPath='/health'`. `start.ps1` delegates to `web_sota/start.ps1`
(fleet engine, standalone fallback when `mcp-central-docs` is absent).

## Isaac interpreter resolution (`_find_isaac_python`)

1. `ISAAC_PYTHON` env var → 2. repo `.venv-isaac311` (pip
   `isaacsim[all,extscache]==5.1.0` on Python 3.11) → 3. bundle
   `python.bat`/`python.sh` under `ISAAC_SIM_PATH` → 4. `~/.local/share/ov`
   packages. `sim_status().isaac_python` shows the winner.

## Logging

`isaac-mcp` logger (INFO) on stderr; web backend ring buffer
(`web_sota/backend/log_buffer.py`) served at `/api/logs` with file watch on
`logs/server.log`. Per-job logs: `jobs/<id>/runner.log`.
