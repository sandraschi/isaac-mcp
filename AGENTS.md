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

## Available Tools (21)
### Sim Tools (10)
sim_status, load_scene, spawn_model, start_sim, stop_sim, get_state,
apply_control, list_scenes, list_jobs, isaac_shutdown

### Robotics Pipeline & Active Inference Tools (3)
convert_urdf_to_usd, run_active_inference, isaac_pipeline

### AI Tools (5)
agentic_sim_workflow, natural_language_control, analyze_sim_state,
analyze_sim_logs, discover_model

### Prefab Cards (3, app=True)
show_sim_status_card, show_scenes_card, show_jobs_card

## Twin OpenUSD Stages (`scenes/`)
- `scenes/saschibot_sim.usda` — 30-link, 29-joint Wheeled Telescoping Bimanual (`rust-saschirob-mcp`) with full rest-pose FK, 4-caster support polygon, and `PhysicsDriveAPI`.
- `scenes/nori_a3_sim.usda` — 46-link, 45-joint Nori Robotics A3 (`norirobotics-mcp`) with full rest-pose FK, oriented STL proxy collision boxes, and `PhysicsDriveAPI`.

## 10-Stage Robotics Pipeline (`pipeline/`)
See `pipeline/README.md` for `01_cad_to_usd_blender.py` through `10_mujoco_active_inference_closed_loop.py`.

## Ports
- Frontend: 11048
- Backend: 11049
