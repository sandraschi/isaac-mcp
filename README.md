# isaac-mcp

**NVIDIA Isaac Sim[^1]/Lab simulation via MCP. GPU-accelerated physics, USD[^2] scenes.**

[![CI](https://github.com/sandraschi/isaac-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/sandraschi/isaac-mcp/actions/workflows/ci.yml)
[![Ruff](https://img.shields.io/badge/code%20style-ruff-000000.svg)](https://github.com/astral-sh/ruff)
[![FastMCP](https://img.shields.io/badge/FastMCP-3.4+-blue)](https://github.com/jlowin/fastmcp)
[![Python](https://img.shields.io/badge/python-3.11%2B-blue)](https://www.python.org)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](LICENSE)

isaac-mcp bridges NVIDIA Isaac Sim and Isaac Lab with the MCP ecosystem. Load USD scenes, spawn robots and objects, start and stop GPU-accelerated physics, stream state tensors, and control actuators — all through MCP tools. The server manages a scene depot, a job queue, and supports both Isaac Sim GUI and Isaac Lab headless modes.

Built for high-throughput training and evaluation workflows: isaac-mcp can serve as the simulator backend for reinforcement learning rollouts (ros-mcp reward feedback), domain-randomized scene generation, and parallel GPU-accelerated policy evaluation.

## Table of Contents

- [Quick Start](#quick-start)
- [Tools](#tools)
- [Architecture](#architecture)
- [Documentation](#documentation)
- [Ports](#ports)
- [Footnotes](#footnotes)

## Quick Start

```powershell
# 1. Clone and enter
git clone https://github.com/sandraschi/isaac-mcp
cd isaac-mcp

# 2. Run the MCP server
uv run python -m isaac_mcp

# 3. Or launch the full web dashboard
.\start.ps1
```

## Tools

| # | Tool | Description |
|---|------|-------------|
| 1 | `sim_status` | Health check — Isaac Sim availability, GPU status, active jobs |
| 2 | `load_scene` | Load a USD scene file into the scene depot |
| 3 | `spawn_model` | Spawn a robot or object into the active scene |
| 4 | `start_sim` | Start physics stepping (GUI or headless) |
| 5 | `stop_sim` | Stop physics stepping |
| 6 | `get_state` | Read rigid body states, joint states, contact tensors |
| 7 | `apply_control` | Apply joint efforts, position targets, or PD control |
| 8 | `list_scenes` | List all USD scenes in the depot |
| 9 | `list_jobs` | List active and completed simulation jobs |
| 10 | `agentic_sim_workflow` | Multi-step Isaac workflow via LLM sampling |
| 11 | `natural_language_control` | Control the sim via natural language ("open the gripper") |
| 12 | `analyze_sim_state` | Physics diagnostics — contact forces, torque limits, stability |
| 13 | `analyze_sim_logs` | Parse Isaac Sim / Omniverse logs for GPU errors and warnings |
| 14 | `discover_model` | Search and download USD assets from GitHub |
| 15 | `isaac_shutdown` | Stop active sims and terminate the server (confirmed=true) |
| 16 | `show_sim_status_card` | Prefab card: Isaac/GPU/depot status |
| 17 | `show_scenes_card` | Prefab card: scene depot contents |
| 18 | `show_jobs_card` | Prefab card: active + completed jobs |

[Full tool reference →](docs/TOOLS.md)

## Architecture

isaac-mcp connects to either a running Isaac Sim GUI instance (via Python bindings) or launches Isaac Lab headless (`isaaclab` Python package). Job isolation is managed per-GPU process with Omniverse Kit subprocesses. USD scenes are cached in `scenes/` and can reference assets from the Omniverse Nucleus server or local depot.

```
MCP Client  ──►  isaac-mcp (FastMCP 3.4)
                        │
              ┌─────────┴──────────┐
              │  Job Scheduler      │
              │  (state machine)    │
              └─────────┬──────────┘
                        │
              ┌─────────▼──────────────┐
              │  Isaac Sim / Lab       │
              │  (Omniverse Kit, GPU)  │
              └────────────────────────┘
```

[Architecture deep-dive →](docs/ISAAC_VS_OTHERS.md)

## Documentation

| Doc | Contents |
|-----|----------|
| `docs/TOOLS.md` | Full reference for all 18 tools with inputs, outputs, examples |
| `docs/SETUP.md` | Installation, NVIDIA driver requirements, Isaac Sim setup, troubleshooting |
| `docs/ONBOARDING.md` | Zero-to-sim guide: wrappee install, env, sanity checklist |
| `docs/CONFIGURATION.md` | Env vars, ports, launcher, interpreter resolution, logging |
| `docs/DEVELOPMENT.md` | Setup, commands, architecture, conventions |
| `docs/TROUBLESHOOTING.md` | Sim/startup/dashboard/CI failure table |
| `docs/ISAAC_VS_OTHERS.md` | Comparison with MuJoCo, Gazebo, and other physics backends |

## Ports

| Port | Service |
|------|---------|
| 11049 | FastAPI backend + MCP HTTP (`/mcp`) |
| 11048 | Vite React frontend (dev, proxies `/api` + `/health` to 11049) |

## Stack

- Backend: Python 3.11+, FastMCP `>=3.4.4,<4`, FastAPI + uvicorn
- Frontend: React 19 + Vite 6 + TailwindCSS 4 + react-router-dom 7
  (+ `@tauri-apps/api` v2 for the desktop shell)
- Desktop: Tauri 2.0 (NSIS, `native/`)
- Local LLM: Ollama (`llama3.2:3b` fallback) for the AI tools

## Environment

Copy `.env.example` to `.env`:

| Variable | Default | Purpose |
|----------|---------|---------|
| `ISAAC_SIM_PATH` | `C:/Program Files/NVIDIA/Isaac Sim` | Isaac Sim install root (auto-detected) |
| `ISAAC_PYTHON` | auto (`.venv-isaac311` first) | Isaac Sim Python 3.11 interpreter |
| `ISAAC_MCP_SCENES_DIR` | `./scenes/` | USD scene depot |
| `ISAAC_MCP_JOBS_DIR` | `./jobs/` | Sim job state/control dirs |

## Claude Desktop config

```json
{
  "mcpServers": {
    "isaac": {
      "command": "uv",
      "args": ["run", "--directory", "D:/Dev/repos/isaac-mcp", "python", "-m", "isaac_mcp"]
    }
  }
}
```

## Footnotes

[^1]: **Isaac Sim** — NVIDIA's robotics simulation platform built on Omniverse. GPU-accelerated physics, ray-tracing rendering, and USD scene graph. [developer.nvidia.com/isaac-sim](https://developer.nvidia.com/isaac-sim)
[^2]: **USD** — Universal Scene Description. Pixar's open 3D scene interchange format, used by Isaac Sim as the native scene format.
