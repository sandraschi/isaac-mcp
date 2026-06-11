# isaac-mcp

**General-purpose NVIDIA Isaac Sim/Lab simulation via MCP** — start, control, and query Isaac Sim simulations from any MCP client (Claude Desktop, Cursor).

**Ports:** Backend 11049 / Frontend 11048

**Version:** 0.2.0-alpha

---

## Quick Start

```powershell
git clone https://github.com/sandraschi/isaac-mcp
cd isaac-mcp
uv sync                                  # server venv (3.12)

# Simulation venv: Isaac Sim 5.1 requires Python 3.11 exactly (~10 GB)
uv venv .venv-isaac311 -p 3.11
uv pip install "isaacsim[all,extscache]==5.1.0" --extra-index-url https://pypi.nvidia.com -p .venv-isaac311

# One-time bring-up: ACCEPTS the NVIDIA Omniverse EULA, pulls extensions (10+ min)
.\scripts\first_launch.ps1

uv run python -m isaac_mcp               # run the MCP server
```

The server runs on Python 3.12; simulations launch under the dedicated 3.11
interpreter (`.venv-isaac311`, override via `ISAAC_PYTHON`). A binary Isaac Sim
install (`ISAAC_SIM_PATH`) is auto-detected as a fallback.

---

## Tools (14 total)

| # | Tool | Description |
|---|------|-------------|
| 1 | `sim_status` | Health check: Isaac Python, GPU, depot, active jobs |
| 2 | `load_scene` | Load a USD/URDF scene into the depot |
| 3 | `spawn_model` | Spawn a model into a loaded scene |
| 4 | `start_sim` | Launch Isaac Sim as a subprocess |
| 5 | `stop_sim` | Terminate a running simulation |
| 6 | `get_state` | Read joint positions, velocities, sensor data |
| 7 | `apply_control` | Apply control signals to actuators |
| 8 | `list_scenes` | List loaded scenes in the depot |
| 9 | `list_jobs` | List active and completed simulation jobs |
| 10 | `agentic_sim_workflow` | 🤖 Multi-step AI orchestration via host LLM |
| 11 | `natural_language_control` | 🎯 NL to actuator values |
| 12 | `analyze_sim_state` | 📊 NL analysis of robot posture/behaviour |
| 13 | `analyze_sim_logs` | 🔍 NL diagnosis of sim errors |
| 14 | `discover_model` | 🌐 AI-powered USD/URDF discovery from GitHub |

---

## Architecture

```
MCP client -> FastMCP (11049) -> subprocess (isaac_sim runner)
                                  -> Isaac Sim Python API
                                  -> control loop at sim frequency
                                  -> state sync via JSON over pipe
```

Each simulation runs as an isolated subprocess. See `docs/ARCHITECTURE.md`.

---

## Webapp

Vite + React dashboard at **11048** with scene depot browser, simulation control panel, real-time state viewer, and LLM chat interface.

---

## Fleet Integration

- **mujoco-mcp** (11046/11047) — lighter alternative for simpler physics
- **gazebo-mcp** (10990) — ROS-integrated simulation alternative

---

## Requirements

- **NVIDIA GPU** with at least 8 GB VRAM (RTX 3060+); driver 580.65.06+
- **Python 3.11** for the sim venv (Isaac Sim 5.x pip pins it exactly); 3.11–3.12 for the server
- **Isaac Sim 5.1** via pip (see Quick Start) or a binary install (2023.1+)
- Windows or Linux
- First launch requires accepting the NVIDIA Omniverse EULA and pulls Kit extensions (10+ minutes)

The sim runner (`src/isaac_mcp/_sim_runner.py`) implements the fleet
file-protocol (state.json / control.json / stop.signal) and supports both the
Isaac Sim 5.x (`isaacsim.core.api`) and 4.x (`omni.isaac.core`) namespaces.
USD scenes only for now; URDF import is a future tool.

---

## Development

```powershell
just lint              # ruff check
just test              # pytest
just dev               # backend + frontend
just e2e               # Playwright e2e tests (future)
just build-native      # Tauri native app (future)
```

See `mcp-central-docs/standards/rules/` for fleet conventions.
