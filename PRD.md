# isaac-mcp — Product Requirements Document

**Version**: 0.2.0-alpha  
**Status**: Active  
**Last Updated**: 2026-06-11  

## 1. Purpose

General-purpose NVIDIA Isaac Sim/Lab simulation via MCP. Start, control, and query Isaac Sim simulations from any MCP client (Claude Desktop, Cursor) — designed for GPU-accelerated robotics simulation, photorealistic rendering, and Omniverse integration.

## 2. Scope

### In scope (v0.2-alpha)

| Feature | Priority | Description |
|---------|----------|-------------|
| Sim lifecycle | P0 | start/stop/state for Isaac Sim subprocesses |
| Scene depot | P0 | load/list USD/URDF scene files |
| Model spawning | P1 | spawn models into loaded scenes |
| State sync | P1 | read joint positions, velocities, sensor data |
| Control apply | P1 | send actuator commands |
| AI agentic workflows | P1 | multi-step orchestration via host LLM |
| Natural language control | P1 | NL → actuator values |
| Conversational analysis | P1 | LLM reads state + logs, diagnoses issues |
| Smart model discovery | P2 | LLM generates USD/URDF URLs from GitHub |
| Web dashboard | P2 | React + Vite at 11048 |
| CI | P1 | ruff lint + pytest on push/PR |

### Out of scope (future)

- Training new RL policies (defer to Isaac Lab directly)
- Multi-GPU distributed sim
- Real hardware control

## 3. Architecture

```
MCP client -> FastMCP (11049) -> subprocess (isaac_sim runner)
                                   -> Isaac Sim Python API (omni.isaac.core)
                                   -> control loop at sim frequency
                                   -> state sync via JSON over pipe
```

## 4. Tools (14 total)

### Sim Tools (9)
- `sim_status` — health check (Isaac Python, GPU, depot)
- `load_scene` — load USD/URDF scene into depot
- `start_sim` — launch Isaac Sim as subprocess
- `stop_sim` — terminate a running simulation
- `get_state` — read joint positions, velocities, sensor data
- `spawn_model` — spawn model into loaded scene
- `apply_control` — send control signals to actuators
- `list_scenes` — list all scenes in the depot
- `list_jobs` — list active/completed simulation jobs

### AI Tools (5)
- `agentic_sim_workflow` — multi-step orchestration via host LLM
- `natural_language_control` — NL → actuator values
- `analyze_sim_state` — describe robot posture/behaviour
- `analyze_sim_logs` — diagnose sim errors
- `discover_model` — find + download USD/URDF from GitHub

## 5. Ports

| Service | Port |
|---------|------|
| FastMCP backend + HTTP | 11049 |
| Vite React frontend | 11048 |

## 6. Requirements

- NVIDIA GPU with 8 GB+ VRAM (RTX 3060+)
- Isaac Sim 2023.1+ installed
- Windows or Linux

## 7. External Dependencies

| Dependency | Purpose |
|-----------|---------|
| NVIDIA Isaac Sim | Simulator (NVIDIA EULA) |
| FastMCP | MCP server framework |
| httpx | HTTP downloads |
| Ollama (optional) | AI fallback when ctx.sample unavailable |

## 8. Risks

| Risk | Mitigation |
|------|------------|
| Isaac Sim 30-120s startup | async launch + progress polling |
| 10 GB+ install size | clear requirements in README |
| GPU VRAM exhaustion | health check reports GPU memory |
