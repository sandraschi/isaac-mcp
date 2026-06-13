# isaac-mcp

**NVIDIA Isaac Sim[^1]/Lab simulation via MCP. GPU-accelerated physics, USD[^2] scenes.**

[![CI](https://github.com/sandraschi/isaac-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/sandraschi/isaac-mcp/actions/workflows/ci.yml)
[![Ruff](https://img.shields.io/badge/code%20style-ruff-000000.svg)](https://github.com/astral-sh/ruff)
[![FastMCP](https://img.shields.io/badge/FastMCP-3.2+-blue)](https://github.com/jlowin/fastmcp)
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
| 14 | `discover_scene` | Search and download USD assets from NVIDIA Omniverse |

[Full tool reference →](docs/TOOLS.md)

## Architecture

isaac-mcp connects to either a running Isaac Sim GUI instance (via Python bindings) or launches Isaac Lab headless (`isaaclab` Python package). Job isolation is managed per-GPU process with Omniverse Kit subprocesses. USD scenes are cached in `scenes/` and can reference assets from the Omniverse Nucleus server or local depot.

```
MCP Client  ──►  isaac-mcp (FastMCP 3.2)
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
| `docs/TOOLS.md` | Full reference for all 14 tools with inputs, outputs, examples |
| `docs/SETUP.md` | Installation, NVIDIA driver requirements, Isaac Sim setup, troubleshooting |
| `docs/ISAAC_VS_OTHERS.md` | Comparison with MuJoCo, Gazebo, and other physics backends |

## Ports

| Port | Service |
|------|---------|
| 11048 | FastAPI backend + MCP HTTP |
| 11049 | Vite React frontend |

## Footnotes

[^1]: **Isaac Sim** — NVIDIA's robotics simulation platform built on Omniverse. GPU-accelerated physics, ray-tracing rendering, and USD scene graph. [developer.nvidia.com/isaac-sim](https://developer.nvidia.com/isaac-sim)
[^2]: **USD** — Universal Scene Description. Pixar's open 3D scene interchange format, used by Isaac Sim as the native scene format.
