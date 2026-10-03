# Isaac Sim simulation workflows (isaac-mcp)

Drive NVIDIA Isaac Sim / Isaac Lab through the isaac-mcp tool surface:
USD scene depot, subprocess sim jobs, file-protocol state sync, and
LLM-assisted control and diagnosis. Served via `GET /api/skills`.

## Who should use this

- **Agents** driving simulations end-to-end: prefer the MCP tools below over
  hand-editing anything under `scenes/` or `jobs/` — the depot registry and
  the `_sim_runner.py` subprocess own those files.
- **Humans** operating the dashboard: Models page (depot), Simulations page
  (lifecycle), LLM page (assisted control). Same backends as the tools.

## Tool catalog (15 real operations)

### Health and inventory (read-only)

- `sim_status()` — Isaac availability, version, interpreter path, GPUs,
  depot scene count, active job count. Always call first: a missing
  `isaac_python` explains every downstream failure.
- `list_scenes()` — depot registry `{name: {uri, path, size_kb, format}}`.
- `list_jobs()` — `{active: [...], completed: [...]}` across live processes
  and `jobs/` on disk.

### Scene depot (mutating, idempotent-ish)

- `load_scene(uri, name)` — `uri` is a local path or http(s)/ftp URL;
  unknown extensions default to `.usd`. Records provenance in the registry.
- `spawn_model(uri, name, scene="")` — copies a model into
  `scenes/<scene>/models/`. Empty `scene` targets the first depot entry;
  fails closed when the depot is empty.

### Lifecycle and control (mutating)

- `start_sim(scene_name, headless=True)` — launches the Isaac interpreter
  (`ISAAC_PYTHON` -> `.venv-isaac311` -> bundle `python.bat`) running
  `_sim_runner.py`. Returns `job_id`. First launch pulls Omniverse
  extensions (10+ min); `scene_loaded=false` with a poll note is normal.
- `stop_sim(job_id)` — touches `stop.signal`, terminates the runner,
  reports `completed`.
- `get_state(job_id)` — `time, step, qpos, qvel, actuator_values`.
- `apply_control(job_id, ctrl)` — `{actuator_name_or_index: float}` is
  consumed once per loop iteration (file deleted after read).
- `isaac_shutdown(confirmed=True)` — stops tracked sims, SIGTERMs the
  server. Refuses without `confirmed=true`. REST twin: `POST /api/shutdown`.

### AI assistance (sampling-first, Ollama fallback)

- `agentic_sim_workflow(goal, ctx)` — narrated multi-step plan using
  `ctx.sample()`; falls back to Ollama `llama3.2:3b` on :11434.
- `natural_language_control(prompt, job_id, ctx)` — reads `metadata.json`
  actuator names + `state.json`, asks the LLM for a JSON actuator map,
  writes `control.json`. Unparseable output fails closed with the raw text.
- `analyze_sim_state(job_id, ctx)` — posture/stability/anomaly NL report.
- `analyze_sim_logs(job_id, ctx)` — `error.txt` + `runner.log` tail diagnosis.
- `discover_model(description, ctx)` — LLM-suggested GitHub raw URLs
  (max 4 tried), valid downloads registered in the depot.

## Copy-shape workflows

### 1. Cold start to first motion

```
sim_status()                                    # isaac_python present?
load_scene("C:/scenes/room.usd", "room")        # or a URL
start_sim("room", headless=True)                # -> job_id
get_state(job_id)                               # actuator_values gives joint names
apply_control(job_id, {"shoulder_joint": 0.5})  # position targets
get_state(job_id)                               # verify motion
stop_sim(job_id)
```

### 2. Hands-free NL drive

```
start_sim("room") -> job_id
natural_language_control("open the gripper halfway", job_id)
analyze_sim_state(job_id)                       # is the grasp stable?
```

### 3. Crash triage

```
list_jobs()                                     # find the dead job_id
analyze_sim_logs(job_id)                        # error.txt + runner.log tail
# fix the scene/URDF path or GPU memory pressure, then start_sim again
```

## Configuration

Copy `.env.example` to `.env`: `ISAAC_SIM_PATH`, optional `ISAAC_PYTHON`
(Python 3.11 for Isaac Sim 5.x: `pip install "isaacsim[all,extscache]==5.1.0"
--extra-index-url https://pypi.nvidia.com`), `ISAAC_MCP_SCENES_DIR`,
`ISAAC_MCP_JOBS_DIR`. Backend `:11049`, frontend `:11048` (fleet registry).

## Troubleshooting

- `Isaac Sim Python not found` — set `ISAAC_PYTHON` or install the bundle;
  `sim_status().isaac_python` shows the resolved interpreter.
- `Runner exited immediately` — read `log_tail` (extension pull in progress
  vs real crash); `jobs/<id>/runner.log` has the full story.
- `control.json rejected` (runner stderr) — key is not a known actuator and
  not a numeric index; call `get_state` first for exact joint names.
- Non-USD scene in `start_sim` — the runner loads USD stages only; convert
  URDF via Isaac's URDF importer first.
- LLM tools return `LLM unavailable` — neither `ctx.sample()` nor Ollama
  on :11434 answered; pull `llama3.2:3b` or run inside a sampling host.
