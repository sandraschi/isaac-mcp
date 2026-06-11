# isaac-mcp — Agent Instructions

## Overview
Isaac-mcp wraps NVIDIA Isaac Sim / Isaac Lab behind an MCP interface.
The server checks for `omni.isaac.core` availability and launches Isaac Sim
as a subprocess via its bundled `python.sh`.

## Environment Variables
- `ISAAC_SIM_PATH` — Path to Isaac Sim install (e.g. `C:/Program Files/NVIDIA/Isaac Sim`)
  Auto-detected from common install locations if not set.
- `ISAAC_MCP_SCENES_DIR` — Custom scene depot directory (default: `./scenes/`)
- `ISAAC_MCP_JOBS_DIR` — Custom jobs directory (default: `./jobs/`)

## Available Tools (14)
### Sim Tools (9)
sim_status, load_scene, spawn_model, start_sim, stop_sim, get_state,
apply_control, list_scenes, list_jobs

### AI Tools (5)
agentic_sim_workflow, natural_language_control, analyze_sim_state,
analyze_sim_logs, discover_model

## Ports
- Frontend: 11048
- Backend: 11049
