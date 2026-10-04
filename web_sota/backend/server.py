"""FastAPI backend for the isaac-mcp web dashboard."""

import sys
from contextlib import asynccontextmanager
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from isaac_mcp.server import list_jobs, list_scenes, load_scene, sim_status, start_sim, stop_sim
from web_sota.backend.log_buffer import activity_log
from web_sota.backend.routes.ai import router as ai_router
from web_sota.backend.routes.logging import router as logging_router

REPO_ROOT = Path(__file__).resolve().parent.parent.parent


mcp_mod = __import__("isaac_mcp.server", fromlist=["mcp"])
mcp_app = mcp_mod.mcp.http_app(path="/")  # path="/" per BUG-008


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.activity_log = activity_log
    log_dir = Path(__file__).resolve().parent.parent.parent / "logs"
    log_dir.mkdir(exist_ok=True)
    activity_log.start_file_watch(log_dir / "server.log")
    activity_log.info("server", "Server started")
    async with mcp_app.router.lifespan_context(app):  # BUG-038: drive sub-app lifespan
        yield
    activity_log.info("server", "Server stopped")


app = FastAPI(title="isaac-mcp", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:11048",
        "http://localhost:11048",
        "http://127.0.0.1:11049",
        "http://localhost:11049",
        "tauri://localhost",
        "http://tauri.localhost",
        "https://tauri.localhost",
    ],
    allow_origin_regex=r"https?://(127\.0\.0\.1|localhost|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|100\.\d+\.\d+\.\d+)(:\d+)?",
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai_router)
app.include_router(logging_router)


@app.get("/health")
@app.get("/api/health")
async def health():
    return sim_status()


@app.get("/api/status")
async def status():
    return sim_status()


@app.get("/api/capabilities")
async def capabilities():
    """Standard fleet shape for webapp discovery."""
    return {
        "service": "isaac-mcp",
        "version": "0.2.0",
        "status": "ok",
        "tool_count": 15,
        "tools": [
            "sim_status",
            "load_scene",
            "spawn_model",
            "start_sim",
            "stop_sim",
            "get_state",
            "apply_control",
            "list_scenes",
            "list_jobs",
            "agentic_sim_workflow",
            "natural_language_control",
            "analyze_sim_state",
            "analyze_sim_logs",
            "discover_model",
            "isaac_shutdown",
        ],
        "endpoints": [
            "/health",
            "/api/health",
            "/api/capabilities",
            "/api/status",
            "/api/scenes",
            "/api/simulations",
            "/api/llm/chat",
            "/mcp",
        ],
        "transports": ["http", "stdio"],
    }


@app.get("/api/scenes")
async def scenes():
    return list_scenes()


@app.post("/api/scenes/load")
async def scenes_load(body: dict):
    uri = body.get("uri", "")
    name = body.get("name", "")
    if not uri or not name:
        return {"success": False, "error": "Both 'uri' and 'name' are required."}
    return load_scene(uri=uri, name=name)


@app.get("/api/simulations")
async def simulations():
    return list_jobs()


@app.post("/api/jobs/start")
async def jobs_start(body: dict):
    scene_name = body.get("scene_name", "")
    if not scene_name:
        return {"success": False, "error": "'scene_name' is required."}
    return start_sim(scene_name=scene_name, headless=body.get("headless", True))


@app.post("/api/jobs/{job_id}/stop")
async def jobs_stop(job_id: str):
    return stop_sim(job_id=job_id)


@app.post("/api/shutdown")
async def shutdown():
    """Orderly exit for the fleet launcher: respond 200, then terminate so
    in-flight sim jobs see the stop path instead of a hard kill."""
    import os
    import threading

    threading.Timer(0.5, lambda: os._exit(0)).start()
    return {"success": True, "message": "isaac-mcp backend shutting down."}


@app.get("/api/v1/diagnostics")
async def diagnostics():
    """CUA-NSIS smoke surface: tool list, system info, errors."""
    try:
        tools = await mcp_mod.mcp.get_tools()
        names = sorted(tools.keys())
    except Exception:
        names = [
            "sim_status",
            "load_scene",
            "spawn_model",
            "start_sim",
            "stop_sim",
            "get_state",
            "apply_control",
            "list_scenes",
            "list_jobs",
            "agentic_sim_workflow",
            "natural_language_control",
            "analyze_sim_state",
            "analyze_sim_logs",
            "discover_model",
            "isaac_shutdown",
        ]
    status = sim_status()
    return {
        "service": "isaac-mcp",
        "version": "0.2.0",
        "tools": names,
        "tool_count": len(names),
        "isaac_available": status.get("isaac_available"),
        "isaac_version": status.get("isaac_version"),
        "gpus": status.get("gpus"),
    }


@app.get("/api/skills")
async def skills():
    """Skill listing for skill-first chat: reads skills/*/SKILL.md when present."""
    out = []
    skills_dir = REPO_ROOT / "skills"
    if skills_dir.is_dir():
        for skill_md in sorted(skills_dir.glob("*/SKILL.md")):
            try:
                first = skill_md.read_text(encoding="utf-8").splitlines()
                title = next(
                    (ln.lstrip("# ").strip() for ln in first if ln.startswith("#")),
                    skill_md.parent.name,
                )
                out.append({"name": skill_md.parent.name, "title": title})
            except OSError:
                continue
    if not out:
        out = [{"name": "isaac", "title": "Isaac Sim simulation workflows"}]
    return out


@app.get("/api/llm/discover")
async def llm_discover():
    """Provider auto-discovery: Ollama :11434, LM Studio :1234 (never key bytes)."""
    import httpx

    providers = []
    for pid, base in (("ollama", "http://127.0.0.1:11434"), ("lm-studio", "http://127.0.0.1:1234")):
        reachable, models = False, []
        try:
            if pid == "ollama":
                r = httpx.get(f"{base}/api/tags", timeout=3)
                models = [m.get("name", "") for m in r.json().get("models", [])]
            else:
                r = httpx.get(f"{base}/v1/models", timeout=3)
                models = [m.get("id", "") for m in r.json().get("data", [])]
            reachable = True
        except Exception:
            models = ["llama3.2:3b"] if pid == "ollama" else []
        providers.append({"id": pid, "reachable": reachable, "models": models})
    return {"providers": providers}


@app.get("/api/llm/providers")
async def llm_providers():
    """Legacy shape (Settings/LLM/FloatingChat depend on it): {"ollama": [{name}]}."""
    import httpx

    try:
        r = httpx.get("http://127.0.0.1:11434/api/tags", timeout=3)
        return {"ollama": r.json().get("models", [{"name": "llama3.2:3b"}])}
    except Exception:
        return {"ollama": [{"name": "llama3.2:3b"}]}


@app.get("/api/llm/models")
async def llm_models(provider: str = "ollama"):
    """Model list per provider: live when reachable, curated fallback."""
    import httpx

    if provider == "lm-studio":
        try:
            r = httpx.get("http://127.0.0.1:1234/v1/models", timeout=3)
            return {
                "provider": provider,
                "models": [m.get("id", "") for m in r.json().get("data", [])],
            }
        except Exception:
            return {"provider": provider, "models": []}
    try:
        r = httpx.get("http://127.0.0.1:11434/api/tags", timeout=3)
        return {
            "provider": provider,
            "models": [m.get("name", "") for m in r.json().get("models", [])],
        }
    except Exception:
        return {"provider": provider, "models": ["llama3.2:3b"]}


@app.get("/api/llm/onboarding")
async def llm_onboarding():
    """Fresh-install starter facts + recommended path for the under-hero cue."""
    return {
        "message": "Point isaac-mcp at Isaac Sim, then chat with your robot.",
        "recommended_provider": "ollama",
        "recommended_model": "llama3.2:3b",
        "requires": [
            "Ollama on 127.0.0.1:11434",
            "ISAAC_SIM_PATH pointing at an Isaac Sim install",
        ],
        "next_steps": [
            "Install Ollama and pull llama3.2:3b",
            "Set ISAAC_SIM_PATH (see .env.example)",
            "Load a USD scene from the Models page",
            "Start a simulation and ask the chat to drive it",
        ],
    }


@app.get("/api/fleet/apps")
async def fleet_apps():
    """Fleet app discovery: parse WEBAPP_PORTS.md registry, flag this service live."""
    import re

    apps: dict = {}
    source = "local"
    registry = REPO_ROOT.parent / "mcp-central-docs" / "operations" / "WEBAPP_PORTS.md"
    if registry.is_file():
        try:
            for line in registry.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if not line.startswith("|"):
                    continue
                cells = [c.strip() for c in line.strip("|").split("|")]
                if len(cells) < 3 or not re.fullmatch(r"\d+", cells[0]):
                    continue
                port, name, blurb = int(cells[0]), cells[1], cells[2]
                if not name or name.startswith("-"):
                    continue
                entry = apps.setdefault(name, {"name": name, "ports": [], "blurb": blurb})
                if port not in entry["ports"]:
                    entry["ports"].append(port)
            source = "WEBAPP_PORTS.md"
        except OSError:
            apps = {}
    if not apps:
        apps = {
            "isaac-mcp": {"name": "isaac-mcp", "ports": [11048, 11049], "blurb": "this service"}
        }
    result = []
    for name in sorted(apps):
        entry = apps[name]
        result.append(
            {
                "name": name,
                "ports": sorted(entry["ports"]),
                "blurb": entry["blurb"],
                "live": name == "isaac-mcp",
            }
        )
    return {"apps": result, "count": len(result), "source": source}


@app.post("/api/llm/chat")
async def llm_chat(body: dict):
    import httpx

    try:
        resp = httpx.post(
            "http://127.0.0.1:11434/api/generate",
            json={
                "model": body.get("model", "llama3.2:3b"),
                "prompt": body.get("prompt", ""),
                "stream": False,
            },
            timeout=60,
        )
        return resp.json()
    except Exception as e:
        return {"error": str(e)}


# Mount MCP HTTP (lifespan wired above per BUG-038)
app.mount("/mcp", mcp_app)

# Serve frontend static files (if dist exists)
dist = Path(__file__).resolve().parent.parent / "dist"
if dist.is_dir():
    app.mount("/", StaticFiles(directory=str(dist), html=True), name="frontend")


def run_dev() -> None:
    import uvicorn

    uvicorn.run(
        "web_sota.backend.server:app", host="127.0.0.1", port=11049, log_level="info", reload=True
    )


if __name__ == "__main__":
    run_dev()
