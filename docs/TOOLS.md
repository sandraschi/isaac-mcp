# isaac-mcp Tool Reference

14 tools: 9 simulation lifecycle + 5 AI workflow assistants.

**Note:** All tools require NVIDIA Isaac Sim to be installed (see SETUP.md). The server auto-detects Isaac Sim's Python interpreter.

---

## Sim Tools (1-9)

### sim_status

**Description:** Health check — probes Isaac Sim availability (`omni.isaac.core` import), GPU info via `nvidia-smi`, depot state, and active jobs.

**Inputs:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| — | — | — | No parameters |

**Output:**
```json
{
  "isaac_available": true,
  "isaac_version": "5.1.0",
  "isaac_python": "C:/Program Files/NVIDIA/Isaac Sim/python.bat",
  "gpus": ["NVIDIA RTX 4090, 24564 MiB, 545.84"],
  "scenes_dir_exists": true,
  "scenes_in_depot": 2,
  "active_jobs": 1,
  "jobs_dir_exists": true
}
```

**Examples:**
```python
await sim_status()
```

**State machine effect:** None — read-only. No formal state machine; jobs tracked via process poll.

---

### load_scene

**Description:** Download a USD/URDF scene file from a URL or copy from a local path into the scene depot. Supports `.usd`, `.usda`, `.usdc`, `.urdf`, `.sdf`, `.stl`, `.step`.

**Inputs:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| uri | str | Yes | Local path or http(s) URL to scene file |
| name | str | Yes | Friendly name for the depot |

**Output:**
```json
{"success": true, "name": "warehouse", "path": "D:/.../scenes/warehouse.usd", "size_kb": 4500.5, "format": ".usd"}
```

**Examples:**
```python
await load_scene(uri="https://raw.githubusercontent.com/NVIDIA-Omniverse/IsaacSim-assets/main/usd/warehouse.usd", name="warehouse")
await load_scene(uri="C:/scenes/my_robot.urdf", name="my_robot")
```

---

### spawn_model

**Description:** Spawn a USD/URDF model into an existing scene's models subdirectory.

**Inputs:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| uri | str | Yes | Path or URL to model file |
| name | str | Yes | Friendly name for the model |
| scene | str | No | Target scene name (default: first scene in depot) |

**Output:**
```json
{"success": true, "name": "panda", "scene": "warehouse", "path": "D:/.../scenes/warehouse/models/panda.usd", "format": ".usd"}
```

**Examples:**
```python
await spawn_model(uri="https://raw.githubusercontent.com/.../franka_panda.usd", name="panda", scene="warehouse")
```

---

### start_sim

**Description:** Launch Isaac Sim as a background subprocess using the detected Isaac Sim Python interpreter. First launch pulls extensions and can take 10+ minutes.

**Inputs:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| scene_name | str | Yes | Name from load_scene / list_scenes |
| headless | bool | No | Run without GUI viewer (default: True) |

**Output:**
```json
{"success": true, "job_id": "a1b2c3d4", "scene_name": "warehouse", "headless": true, "scene_loaded": false, "note": "Isaac still starting (first launch pulls extensions, 10+ min)..."}
```

**Examples:**
```python
await start_sim(scene_name="warehouse", headless=True)
await start_sim(scene_name="warehouse", headless=False)
```

---

### stop_sim

**Description:** Stop a running Isaac Sim simulation by job ID. Writes stop.signal and terminates the process.

**Inputs:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| job_id | str | Yes | Job ID from start_sim |

**Output:**
```json
{"success": true, "job_id": "a1b2c3d4", "stopped": true, "completed": false}
```

**Examples:**
```python
await stop_sim(job_id="a1b2c3d4")
```

---

### get_state

**Description:** Read current simulation state — joint positions, velocities, sensor data, and simulation time from state.json.

**Inputs:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| job_id | str | Yes | Job ID from start_sim |

**Output:**
```json
{"success": true, "job_id": "a1b2c3d4", "qpos": [0.0, ...], "qvel": [0.0, ...], "time": 1.234, "sensors": {...}}
```

**Examples:**
```python
await get_state(job_id="a1b2c3d4")
```

---

### apply_control

**Description:** Apply control signals (joint torques, positions, velocities) by writing to the job's control.json.

**Inputs:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| job_id | str | Yes | Target simulation job ID |
| ctrl | dict | Yes | Dict of actuator name/index to float values |

**Output:**
```json
{"success": true, "job_id": "a1b2c3d4", "applied": ["shoulder_joint", "elbow_joint"]}
```

**Examples:**
```python
await apply_control(job_id="a1b2c3d4", ctrl={"shoulder_joint": 0.5, "elbow_joint": -0.3})
```

---

### list_scenes

**Description:** List all loaded scenes in the depot with metadata.

**Inputs:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| — | — | — | No parameters |

**Output:**
```json
{"success": true, "scenes": {"warehouse": {"uri": "...", "path": "...", "size_kb": 4500.5, "format": ".usd"}}, "count": 2}
```

**Examples:**
```python
await list_scenes()
```

---

### list_jobs

**Description:** List active and completed simulation jobs.

**Inputs:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| — | — | — | No parameters |

**Output:**
```json
{"success": true, "active": [{"job_id": "a1b2c3d4", "scene_name": "warehouse", "running": true}], "completed": [...], "total": 3}
```

**Examples:**
```python
await list_jobs()
```

---

## AI Workflow Tools (10-14)

### agentic_sim_workflow

**Description:** Uses the host LLM to plan and execute a multi-step Isaac Sim workflow. Falls back to Ollama.

**Inputs:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| goal | str | Yes | Natural language goal |
| ctx | Context | Yes | FastMCP context (injected automatically) |

**Output:**
```json
{"success": true, "message": "Workflow completed.", "plan_and_result": "...", "sampling_used": true}
```

**Examples:**
```python
await agentic_sim_workflow(goal="Load the Franka Panda URDF and start a sim")
await agentic_sim_workflow(goal="Start a sim, apply torques, then check the state")
```

---

### natural_language_control

**Description:** Convert a natural language command to actuator values for a running Isaac Sim.

**Inputs:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| prompt | str | Yes | Natural language command |
| job_id | str | Yes | Active sim job ID |
| ctx | Context | Yes | FastMCP context (injected automatically) |

**Output:**
```json
{"success": true, "message": "Generated 3 actuator commands.", "controls": {"shoulder_joint": 0.5}, "source": "sampling"}
```

**Examples:**
```python
await natural_language_control(prompt="bend the right arm 30 degrees", job_id="a1b2c3d4")
await natural_language_control(prompt="stand up straight", job_id="a1b2c3d4")
```

---

### analyze_sim_state

**Description:** Reads sim state and produces a natural-language analysis of robot behaviour.

**Inputs:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| job_id | str | Yes | Sim job ID |
| ctx | Context | Yes | FastMCP context (injected automatically) |

**Output:**
```json
{"success": true, "message": "State analyzed.", "analysis": "The robot is standing upright...", "sampling_used": true}
```

**Examples:**
```python
await analyze_sim_state(job_id="a1b2c3d4")
```

---

### analyze_sim_logs

**Description:** Reads the sim runner log and error.txt, then asks the LLM for root-cause analysis.

**Inputs:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| job_id | str | Yes | Sim job ID |
| ctx | Context | Yes | FastMCP context (injected automatically) |

**Output:**
```json
{"success": true, "message": "Logs analyzed.", "analysis": "...", "sampling_used": true}
```

**Examples:**
```python
await analyze_sim_logs(job_id="a1b2c3d4")
```

---

### discover_model

**Description:** Generate candidate GitHub raw URLs for USD/URDF/SDF robot models, download and load valid ones into the depot.

**Inputs:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| description | str | Yes | Model description |
| ctx | Context | Yes | FastMCP context (injected automatically) |

**Output:**
```json
{"success": true, "message": "Loaded 2/4 models.", "models_loaded": [{"url": "...", "name": "franka", ...}], "urls_tried": [...]}
```

**Examples:**
```python
await discover_model(description="Franka Panda robot URDF")
await discover_model(description="Boston Dynamics Spot USD model")
```
