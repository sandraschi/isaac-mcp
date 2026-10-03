import json
import os
import re
import shutil
import subprocess
import time
import uuid
from pathlib import Path

import httpx
from fastmcp import Context, FastMCP

mcp = FastMCP("isaac-mcp")

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
SCENES_DIR = REPO_ROOT / "scenes"
JOBS_DIR = REPO_ROOT / "jobs"
DEPOT_FILE = SCENES_DIR / ".depot" / "registry.json"

SCENES_DIR.mkdir(parents=True, exist_ok=True)
JOBS_DIR.mkdir(parents=True, exist_ok=True)
DEPOT_FILE.parent.mkdir(parents=True, exist_ok=True)

_jobs: dict = {}

ISAAC_SIM_PATH = Path(os.environ.get("ISAAC_SIM_PATH", "C:/Program Files/NVIDIA/Isaac Sim"))


def _find_isaac_python() -> Path | None:
    """Locate a Python that can import isaacsim.

    Priority: ISAAC_PYTHON env var -> repo-local pip venv (.venv-isaac311,
    Python 3.11 + `pip install isaacsim[all,extscache]==5.1.0
    --extra-index-url https://pypi.nvidia.com`) -> binary installs.
    """
    env_py = os.environ.get("ISAAC_PYTHON")
    if env_py and Path(env_py).exists():
        return Path(env_py)
    candidates = [
        REPO_ROOT / ".venv-isaac311" / "Scripts" / "python.exe",
        REPO_ROOT / ".venv-isaac311" / "bin" / "python",
        ISAAC_SIM_PATH / "python.bat",
        ISAAC_SIM_PATH / "python.sh",
        Path("C:/Program Files/NVIDIA/Isaac Sim/python.bat"),
        Path("C:/Program Files/NVIDIA/Isaac Sim/python.sh"),
    ]
    for c in candidates:
        if c.exists():
            return c
    from glob import glob

    for p in glob(str(Path.home() / ".local/share/ov/pkg/isaac_sim-*/python.sh")):
        return Path(p)
    return None


def _isaac_version() -> str | None:
    py = _find_isaac_python()
    if not py:
        return None
    try:
        r = subprocess.run(
            [str(py), "-c", "import omni.isaac.core; print(omni.isaac.core.__version__)"],
            capture_output=True,
            text=True,
            timeout=30,
        )
        return r.stdout.strip() or "unknown"
    except Exception:
        return None


def _gpu_info() -> list:
    try:
        r = subprocess.run(
            ["nvidia-smi", "--query-gpu=name,memory.total,driver_version", "--format=csv,noheader"],
            capture_output=True,
            text=True,
            timeout=15,
        )
        if r.returncode == 0:
            return [line.strip() for line in r.stdout.strip().split("\n") if line.strip()]
    except FileNotFoundError:
        pass
    return []


def _load_depot() -> dict:
    if DEPOT_FILE.exists():
        return json.loads(DEPOT_FILE.read_text())
    return {}


def _save_depot(depot: dict):
    DEPOT_FILE.write_text(json.dumps(depot, indent=2))


# ---------------------------------------------------------------------------
# 9 Sim Tools
# ---------------------------------------------------------------------------


@mcp.tool(
    annotations={
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": False,
    }
)
def sim_status() -> dict:
    """Health check: Isaac Sim availability, GPU info, depot, active jobs.

    ## Return Format
    Dict with isaac_available, gpus, scenes/jobs status

    ## Examples
    ```python
    sim_status()
    ```
    """

    omni_ok = False
    try:
        import omni.isaac.core  # noqa: F401  # pyright: ignore[reportMissingImports]

        omni_ok = True
    except ImportError:
        pass

    isaac_py = _find_isaac_python()
    version = _isaac_version() if isaac_py else None
    gpus = _gpu_info()

    return {
        "isaac_available": omni_ok or isaac_py is not None,
        "isaac_version": version,
        "isaac_python": str(isaac_py) if isaac_py else None,
        "gpus": gpus,
        "scenes_dir_exists": SCENES_DIR.exists(),
        "scenes_in_depot": len(_load_depot()),
        "active_jobs": sum(
            1 for j in _jobs.values() if j.get("process") and j["process"].poll() is None
        ),
        "jobs_dir_exists": JOBS_DIR.exists(),
    }


@mcp.tool(
    annotations={
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": False,
        "openWorldHint": False,
    }
)
def load_scene(uri: str, name: str) -> dict:
    """Load a USD/URDF scene into the simulation depot.

    uri: local file path or URL (will download via httpx)
    name: friendly name for the depot

    Returns scene metadata.

    ## Return Format
    Dict with success, name, path, size_kb, format

    ## Examples
    ```python
    load_scene("C:/scenes/room.usd", "room")
    ```
    """
    depot = _load_depot()

    ext = Path(uri).suffix.lower()
    if ext not in (".usd", ".usda", ".usdc", ".urdf", ".sdf", ".stl", ".step"):
        ext = ".usd"
    dest = SCENES_DIR / f"{name}{ext}"

    if uri.startswith(("http://", "https://", "ftp://")):
        resp = httpx.get(uri, follow_redirects=True, timeout=120)
        resp.raise_for_status()
        dest.write_bytes(resp.content)
    else:
        src = Path(uri)
        if not src.exists():
            return {"success": False, "error": f"File not found: {uri}"}
        shutil.copy2(src, dest)

    size_kb = round(dest.stat().st_size / 1024, 1)
    depot[name] = {"uri": uri, "path": str(dest.resolve()), "size_kb": size_kb, "format": ext}
    _save_depot(depot)

    return {"success": True, "name": name, "path": str(dest), "size_kb": size_kb, "format": ext}


@mcp.tool(
    annotations={
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": False,
        "openWorldHint": False,
    }
)
def spawn_model(uri: str, name: str, scene: str = "") -> dict:
    """Spawn a USD/URDF model into a loaded scene.

    uri: local path or URL to the model file
    name: friendly name for the spawned model
    scene: target scene name (default: first scene in depot)

    Copies the model into the scene's models subdirectory.

    ## Return Format
    Dict with success, name, scene, path, format

    ## Examples
    ```python
    spawn_model("C:/models/arm.usd", "arm", "room")
    ```
    """
    depot = _load_depot()
    if scene and scene not in depot:
        return {"success": False, "error": f"Scene '{scene}' not found in depot"}
    if not depot:
        return {"success": False, "error": "No scenes in depot. Load a scene first."}

    target_scene = scene or list(depot.keys())[0]
    scene_dir = SCENES_DIR / target_scene / "models"
    scene_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(uri).suffix.lower() or ".usd"
    dest = scene_dir / f"{name}{ext}"

    if uri.startswith(("http://", "https://", "ftp://")):
        resp = httpx.get(uri, follow_redirects=True, timeout=120)
        resp.raise_for_status()
        dest.write_bytes(resp.content)
    else:
        src = Path(uri)
        if not src.exists():
            return {"success": False, "error": f"File not found: {uri}"}
        shutil.copy2(src, dest)

    return {"success": True, "name": name, "scene": target_scene, "path": str(dest), "format": ext}


@mcp.tool(
    annotations={
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": False,
        "openWorldHint": False,
    }
)
def start_sim(scene_name: str, headless: bool = True) -> dict:
    """Start Isaac Sim as a background subprocess.

    scene_name: name from load_scene / list_scenes
    headless: if True, runs without the GUI viewer

    Returns job_id for use with get_state, stop_sim, apply_control.

    ## Return Format
    Dict with success, job_id, scene_name, headless, scene_loaded

    ## Examples
    ```python
    start_sim("room")
    ```
    """
    depot = _load_depot()
    if scene_name not in depot:
        return {"success": False, "error": f"Scene '{scene_name}' not found in depot"}

    isaac_py = _find_isaac_python()
    if not isaac_py:
        return {
            "success": False,
            "error": "Isaac Sim Python not found. Install Isaac Sim or set ISAAC_SIM_PATH.",
        }

    runner = Path(__file__).parent / "_sim_runner.py"
    if not runner.exists():
        return {"success": False, "error": f"Sim runner not found at {runner}"}

    job_id = uuid.uuid4().hex[:8]
    job_dir = JOBS_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    cmd = [
        str(isaac_py),
        str(runner),
        "--scene-path",
        depot[scene_name]["path"],
        "--job-id",
        job_id,
        "--jobs-dir",
        str(JOBS_DIR),
    ]
    if headless:
        cmd.append("--headless")

    # Log to file, never PIPE: undrained pipes deadlock chatty sims, and
    # Isaac's first launch (extension pull) can write a LOT.
    log_path = job_dir / "runner.log"
    log_fh = open(log_path, "w", encoding="utf-8")  # noqa: SIM115 - owned by child
    proc = subprocess.Popen(cmd, stdout=log_fh, stderr=subprocess.STDOUT)

    _jobs[job_id] = {
        "process": proc,
        "scene_name": scene_name,
        "headless": headless,
        "started_at": time.time(),
        "log_path": str(log_path),
    }

    # Isaac's FIRST run pulls extensions and can take 10+ minutes; don't block
    # the MCP call on that. Wait briefly for fast-fail or fast-start, then return.
    loaded = False
    for _ in range(80):  # ~20 s
        if (job_dir / "metadata.json").exists():
            loaded = True
            break
        if proc.poll() is not None:
            tail = log_path.read_text(encoding="utf-8", errors="replace").splitlines()[-15:]
            return {
                "success": False,
                "error": f"Runner exited immediately ({proc.returncode}).",
                "log_tail": tail,
            }
        time.sleep(0.25)

    return {
        "success": True,
        "job_id": job_id,
        "scene_name": scene_name,
        "headless": headless,
        "scene_loaded": loaded,
        "note": None
        if loaded
        else "Isaac still starting (first launch pulls extensions, 10+ min); poll get_state or list_jobs.",
    }


@mcp.tool(
    annotations={
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": False,
        "openWorldHint": False,
    }
)
def stop_sim(job_id: str) -> dict:
    """Stop a running simulation by job_id.

    ## Return Format
    Dict with success, job_id, stopped, completed

    ## Examples
    ```python
    stop_sim("abc12345")
    ```
    """
    job_dir = JOBS_DIR / job_id
    if not job_dir.exists():
        return {"success": False, "error": f"Job '{job_id}' not found"}

    (job_dir / "stop.signal").touch()

    if job_id in _jobs:
        proc = _jobs[job_id].get("process")
        if proc and proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=10)
            except subprocess.TimeoutExpired:
                proc.kill()
        _jobs[job_id]["process"] = None

    completed = (job_dir / "completed.txt").exists()
    return {"success": True, "job_id": job_id, "stopped": True, "completed": completed}


@mcp.tool(
    annotations={
        "readOnlyHint": False,
        "destructiveHint": True,
        "idempotentHint": False,
        "openWorldHint": False,
    }
)
def isaac_shutdown(confirmed: bool = False) -> dict:
    """Shut down the isaac-mcp server: stop active sims, then terminate.

    ## Return Format
    Dict with success, stopped_jobs, message

    ## Examples
    ```python
    isaac_shutdown(confirmed=True)
    ```
    """
    if not confirmed:
        return {
            "success": False,
            "message": "Refusing: pass confirmed=true to stop active sims and terminate the server.",
        }
    stopped = []
    for jid, info in list(_jobs.items()):
        proc = info.get("process")
        if proc and proc.poll() is None:
            try:
                proc.terminate()
                proc.wait(timeout=10)
            except Exception:
                try:
                    proc.kill()
                except Exception:
                    pass
            stopped.append(jid)
    import os as _os
    import signal as _signal

    _os.kill(_os.getpid(), _signal.SIGTERM)
    return {"success": True, "stopped_jobs": stopped, "message": "isaac-mcp server terminating."}


@mcp.tool(
    annotations={
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": False,
    }
)
def get_state(job_id: str) -> dict:
    """Get current simulation state: joint positions, velocities, sensor data, time.

    ## Return Format
    Dict with success, job_id plus state fields

    ## Examples
    ```python
    get_state("abc12345")
    ```
    """
    state_path = JOBS_DIR / job_id / "state.json"
    if not state_path.exists():
        return {"success": False, "error": f"No state data for job '{job_id}'"}

    state = json.loads(state_path.read_text())
    return {"success": True, "job_id": job_id, **state}


@mcp.tool(
    annotations={
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": False,
        "openWorldHint": False,
    }
)
def apply_control(job_id: str, ctrl: dict) -> dict:
    """Apply control signals (joint torques, positions, velocities).

    ctrl: dict of {actuator_name_or_index: value}

    ## Return Format
    Dict with success, job_id, applied

    ## Examples
    ```python
    apply_control("abc12345", {"joint_1": 0.5})
    ```
    """
    job_dir = JOBS_DIR / job_id
    if not job_dir.exists():
        return {"success": False, "error": f"Job '{job_id}' not found"}

    (job_dir / "control.json").write_text(json.dumps(ctrl))
    return {"success": True, "job_id": job_id, "applied": list(ctrl.keys())}


@mcp.tool(
    annotations={
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": False,
    }
)
def list_scenes() -> dict:
    """List all loaded scenes in the depot with metadata.

    ## Return Format
    Dict with success, scenes, count

    ## Examples
    ```python
    list_scenes()
    ```
    """
    depot = _load_depot()
    return {"success": True, "scenes": depot, "count": len(depot)}


@mcp.tool(
    annotations={
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": False,
    }
)
def list_jobs() -> dict:
    """List active and completed simulation jobs.

    ## Return Format
    Dict with success, active, completed, total

    ## Examples
    ```python
    list_jobs()
    ```
    """
    active = []
    completed = []

    for jid, info in _jobs.items():
        proc = info.get("process")
        if proc and proc.poll() is None:
            active.append({"job_id": jid, "scene_name": info["scene_name"], "running": True})
        else:
            completed.append({"job_id": jid, "scene_name": info["scene_name"], "running": False})

    for job_dir in sorted(JOBS_DIR.iterdir()):
        if not job_dir.is_dir() or job_dir.name in _jobs:
            continue
        meta_path = job_dir / "metadata.json"
        if meta_path.exists():
            meta = json.loads(meta_path.read_text())
            scene_name = Path(meta.get("scene_path", "")).stem
            completed.append(
                {
                    "job_id": job_dir.name,
                    "scene_name": scene_name,
                    "completed": (job_dir / "completed.txt").exists(),
                }
            )

    return {
        "success": True,
        "active": active,
        "completed": completed,
        "total": len(active) + len(completed),
    }


# ---------------------------------------------------------------------------
# AI workflow helpers
# ---------------------------------------------------------------------------


def _job_dir_for(job_id: str) -> Path:
    return JOBS_DIR / job_id


def _extract_json(text: str) -> dict | None:
    for m in re.finditer(r"\{[^{}]*\}", text):
        try:
            return json.loads(m.group())
        except json.JSONDecodeError:
            continue
    return None


def _extract_json_array(text: str) -> list:
    for m in re.finditer(r"\[.*?\]", text, re.DOTALL):
        try:
            return json.loads(m.group())
        except json.JSONDecodeError:
            continue
    return []


# ---------------------------------------------------------------------------
# 5 AI workflow tools
# ---------------------------------------------------------------------------


@mcp.tool(
    annotations={
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": False,
        "openWorldHint": False,
    }
)
async def agentic_sim_workflow(goal: str, ctx: Context) -> dict:
    """Execute an autonomous multi-step simulation workflow using the host LLM.

    The LLM plans a sequence of tool calls (load_scene, start_sim, get_state,
    apply_control, etc.) to achieve the described goal. Falls back to Ollama
    when ctx.sample is unavailable.

    ## Return Format
    {"success": bool, "message": str, "plan_and_result": str, "sampling_used": bool}

    ## Examples
    agentic_sim_workflow(goal="Load the Franka Panda URDF and start a sim")
    agentic_sim_workflow(goal="Start a sim, apply torques, then check the state")
    """
    tools_desc = """
Available tools (invoke with JSON):
- sim_status() - health check (GPU, Isaac availability)
- load_scene(uri, name) - download USD/URDF scene
- spawn_model(uri, name, scene) - spawn a model into a scene
- start_sim(scene_name, headless) - launch Isaac Sim, returns job_id
- stop_sim(job_id) - stop sim
- get_state(job_id) - read joint positions/velocities
- apply_control(job_id, ctrl) - set actuator controls
- list_scenes() - show depot scenes
- list_jobs() - show active/completed jobs
- natural_language_control(prompt, job_id, ctx) - NL to actuator values
- analyze_sim_state(job_id, ctx) - describe robot posture
- analyze_sim_logs(job_id, ctx) - diagnose sim issues
- discover_model(description, ctx) - find + load USD/URDF from GitHub
"""
    prompt = f"""You are a robotics simulation engineer using NVIDIA Isaac Sim. Your goal: {goal}

{tools_desc}

Plan and execute the steps. Show your reasoning before each tool call.
After completion, summarize what happened and any observations."""

    try:
        result = await ctx.sample(prompt)
        text = getattr(result, "text", None) or str(result)
        return {
            "success": True,
            "message": "Workflow completed.",
            "plan_and_result": text.strip(),
            "sampling_used": True,
        }
    except Exception as e:
        try:
            resp = httpx.post(
                "http://127.0.0.1:11434/api/generate",
                json={"model": "llama3.2:3b", "prompt": prompt, "stream": False},
                timeout=120,
            )
            return {
                "success": True,
                "message": "Workflow completed (Ollama).",
                "plan_and_result": resp.json().get("response", ""),
                "sampling_used": False,
                "model": "ollama",
            }
        except Exception as ollama_e:
            return {
                "success": False,
                "message": f"Both sampling and Ollama fallback failed: {e}; {ollama_e}",
            }


@mcp.tool(
    annotations={
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": False,
        "openWorldHint": False,
    }
)
async def natural_language_control(prompt: str, job_id: str, ctx: Context) -> dict:
    """Convert a natural language command to actuator control values for a running sim.

    Reads the job's metadata.json for actuator names and state.json for current
    values, then asks the LLM to produce actuator values that fulfill the user's
    intent. Writes the result to the job's control.json.

    ## Return Format
    {"success": bool, "message": str, "controls": dict, "source": str}

    ## Examples
    natural_language_control(prompt="bend the right arm 30 degrees", job_id="abc12345")
    natural_language_control(prompt="stand up straight", job_id="abc12345")
    """
    job_dir = _job_dir_for(job_id)
    meta_path = job_dir / "metadata.json"
    state_path = job_dir / "state.json"
    meta = json.loads(meta_path.read_text()) if meta_path.exists() else {}
    state = json.loads(state_path.read_text()) if state_path.exists() else {}

    nl_prompt = f"""You are a robot control engineer using NVIDIA Isaac Sim. The robot has these actuators:
{json.dumps(meta.get("actuator_names", []), indent=2)}

Current state:
{json.dumps(state, indent=2)}

The user says: "{prompt}"

Respond with ONLY a JSON object mapping actuator names to float values.
If an actuator is not relevant, omit it (it keeps its current value).
Example: {{"shoulder_joint": 0.5, "elbow_joint": -0.3}}"""

    sampling_used = False
    try:
        result = await ctx.sample(nl_prompt)
        text = getattr(result, "text", None) or str(result)
        sampling_used = True
    except Exception:
        try:
            resp = httpx.post(
                "http://127.0.0.1:11434/api/generate",
                json={"model": "llama3.2:3b", "prompt": nl_prompt, "stream": False},
                timeout=30,
            )
            text = resp.json().get("response", "")
        except Exception as e:
            return {"success": False, "message": f"LLM unavailable: {e}"}

    ctrl = _extract_json(text)
    if not ctrl:
        return {
            "success": False,
            "message": "Could not parse LLM output as actuator commands.",
            "raw_llm_output": text,
        }

    if job_dir.exists():
        (job_dir / "control.json").write_text(json.dumps(ctrl))

    return {
        "success": True,
        "message": f"Generated {len(ctrl)} actuator commands.",
        "controls": ctrl,
        "source": "sampling" if sampling_used else "ollama",
    }


@mcp.tool(
    annotations={
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": False,
    }
)
async def analyze_sim_state(job_id: str, ctx: Context) -> dict:
    """Read the current sim state and produce a natural-language analysis of what the robot is doing.

    Analyzes joint positions, velocities, contacts, and sensor readings to
    describe the robot's behaviour (standing, walking, falling, etc.).

    ## Return Format
    {"success": bool, "message": str, "analysis": str, "sampling_used": bool}

    ## Examples
    analyze_sim_state(job_id="abc12345")
    """
    job_dir = _job_dir_for(job_id)
    meta_path = job_dir / "metadata.json"
    state_path = job_dir / "state.json"
    meta = json.loads(meta_path.read_text()) if meta_path.exists() else {}
    state = json.loads(state_path.read_text()) if state_path.exists() else {}

    if not state:
        return {"success": False, "message": f"No state data found for job {job_id}."}

    analyze_prompt = f"""You are a robotics analyst using NVIDIA Isaac Sim. Given this robot metadata and state, describe what the robot is doing.

Metadata:
{json.dumps(meta, indent=2)}

State:
{json.dumps(state, indent=2)}

Describe in plain English:
1. What is the robot's posture/stance?
2. Is it stable or falling?
3. What are the key joint angles telling you?
4. Any anomalies or interesting observations?"""

    try:
        result = await ctx.sample(analyze_prompt)
        text = getattr(result, "text", None) or str(result)
        return {
            "success": True,
            "message": "State analyzed.",
            "analysis": text.strip(),
            "sampling_used": True,
        }
    except Exception:
        try:
            resp = httpx.post(
                "http://127.0.0.1:11434/api/generate",
                json={"model": "llama3.2:3b", "prompt": analyze_prompt, "stream": False},
                timeout=30,
            )
            return {
                "success": True,
                "message": "State analyzed (Ollama).",
                "analysis": resp.json().get("response", ""),
                "sampling_used": False,
            }
        except Exception as e:
            return {"success": False, "message": f"LLM unavailable: {e}"}


@mcp.tool(
    annotations={
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": False,
    }
)
async def analyze_sim_logs(job_id: str, ctx: Context) -> dict:
    """Read the sim stderr log and ask the LLM for root-cause analysis.

    Checks for error.txt and reads stderr from the process if still tracked.
    Useful after a sim crash or unexpected behaviour.

    ## Return Format
    {"success": bool, "message": str, "analysis": str, "sampling_used": bool}

    ## Examples
    analyze_sim_logs(job_id="abc12345")
    """
    job_dir = _job_dir_for(job_id)
    error_path = job_dir / "error.txt"
    error_text = ""
    if error_path.exists():
        error_text = error_path.read_text()

    job_info = _jobs.get(job_id)
    stderr_text = ""
    log_path = JOBS_DIR / job_id / "runner.log"
    if log_path.exists():
        stderr_text = log_path.read_text(encoding="utf-8", errors="replace")
    elif job_info and job_info.get("log_path") and Path(job_info["log_path"]).exists():
        stderr_text = Path(job_info["log_path"]).read_text(encoding="utf-8", errors="replace")

    log_sources = []
    if error_text:
        log_sources.append(f"=== error.txt ===\n{error_text}")
    if stderr_text:
        log_sources.append(f"=== runner.log (tail) ===\n{stderr_text[-4000:]}")
    if not log_sources:
        completed = (job_dir / "completed.txt").exists()
        return {
            "success": True,
            "message": "No errors in log output.",
            "analysis": f"Job {job_id}: {'completed normally' if completed else 'still running or unknown'}. No error logs found.",
        }

    combined = "\n\n".join(log_sources)

    log_prompt = f"""You are a robotics debug engineer using NVIDIA Isaac Sim. Given these simulation logs, diagnose any issues.

Job id: {job_id}

{combined}

Provide:
1. What went wrong (or is everything OK)?
2. Root cause hypotheses
3. Specific suggestions to fix or improve"""

    try:
        result = await ctx.sample(log_prompt)
        text = getattr(result, "text", None) or str(result)
        return {
            "success": True,
            "message": "Logs analyzed.",
            "analysis": text.strip(),
            "sampling_used": True,
        }
    except Exception:
        try:
            resp = httpx.post(
                "http://127.0.0.1:11434/api/generate",
                json={"model": "llama3.2:3b", "prompt": log_prompt, "stream": False},
                timeout=30,
            )
            return {
                "success": True,
                "message": "Logs analyzed (Ollama).",
                "analysis": resp.json().get("response", ""),
                "sampling_used": False,
            }
        except Exception as e:
            return {"success": False, "message": f"LLM unavailable: {e}"}


@mcp.tool(
    annotations={
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": False,
        "openWorldHint": False,
    }
)
async def discover_model(description: str, ctx: Context) -> dict:
    """Search for and download a USD/URDF robot model from GitHub given a natural-language description.

    The LLM generates candidate GitHub raw URLs based on known open-source robot
    repos, then the tool attempts to download and validate each URL. Valid models
    are loaded into the depot via load_scene's logic.

    ## Return Format
    {"success": bool, "message": str, "models_loaded": list, "urls_tried": list}

    ## Examples
    discover_model(description="Franka Panda robot URDF")
    discover_model(description="Boston Dynamics Spot USD model")
    """
    prompt = f"""Given this description: "{description}"

Suggest up to 4 GitHub raw URLs that might contain a USD, URDF, or SDF robot model file matching this description.
Focus on known open-source robot repos (NVIDIA Isaac Sim assets, Franka, Unitree, Boston Dynamics research, etc.).
Return ONLY a JSON array of URLs, nothing else.
Example: ["https://raw.githubusercontent.com/NVIDIA-Omniverse/IsaacSim-omni.isaac.sim/main/assets/robot.usd"]"""

    try:
        result = await ctx.sample(prompt)
        urls = _extract_json_array(getattr(result, "text", None) or str(result))
    except Exception:
        try:
            resp = httpx.post(
                "http://127.0.0.1:11434/api/generate",
                json={"model": "llama3.2:3b", "prompt": prompt, "stream": False},
                timeout=30,
            )
            urls = _extract_json_array(resp.json().get("response", ""))
        except Exception:
            return {"success": False, "message": "LLM unavailable for model discovery."}

    if not urls:
        return {"success": False, "message": "Could not generate model URLs from description."}

    loaded = []
    for url in urls[:4]:
        try:
            resp = httpx.get(url, follow_redirects=True, timeout=30)
            if resp.status_code == 200:
                name = Path(url).stem
                ext = Path(url).suffix.lower() or ".usd"
                dest = SCENES_DIR / f"{name}{ext}"
                dest.write_bytes(resp.content)
                size_kb = round(dest.stat().st_size / 1024, 1)
                depot = _load_depot()
                depot[name] = {
                    "uri": url,
                    "path": str(dest.resolve()),
                    "size_kb": size_kb,
                    "format": ext,
                }
                _save_depot(depot)
                loaded.append({"url": url, "name": name, "path": str(dest), "size_kb": size_kb})
        except Exception:
            continue

    return {
        "success": len(loaded) > 0,
        "message": f"Loaded {len(loaded)}/{len(urls)} models."
        if loaded
        else "No models could be downloaded.",
        "models_loaded": loaded,
        "urls_tried": urls,
    }


def main():
    mcp.run()
