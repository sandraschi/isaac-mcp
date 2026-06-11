# isaac-mcp

**General-purpose NVIDIA Isaac Sim/Lab simulation via MCP** — start, control, and query Isaac Sim simulations from any MCP client (Claude Desktop, Cursor).

**Ports:** Backend 11049 / Frontend 11048

**Version:** 0.2.0-alpha

---

## Quick Start

```powershell
git clone https://github.com/sandraschi/isaac-mcp
cd isaac-mcp
uv sync
uv run python -m isaac_mcp
```

Or use the start script:

```powershell
.\start.bat          # backend + webapp
.\start.ps1 -Headless # backend only
```

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

- **NVIDIA GPU** with at least 8 GB VRAM (RTX 3060+)
- **Isaac Sim** installed (2023.1+)
- Windows or Linux

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
