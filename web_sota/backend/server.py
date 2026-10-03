"""FastAPI backend for the isaac-mcp web dashboard."""

import sys
from contextlib import asynccontextmanager
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from isaac_mcp.server import list_jobs, list_scenes, sim_status
from web_sota.backend.log_buffer import activity_log
from web_sota.backend.routes.ai import router as ai_router
from web_sota.backend.routes.logging import router as logging_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.activity_log = activity_log
    log_dir = Path(__file__).resolve().parent.parent.parent / "logs"
    log_dir.mkdir(exist_ok=True)
    activity_log.start_file_watch(log_dir / "server.log")
    activity_log.info("server", "Server started")
    yield
    activity_log.info("server", "Server stopped")


app = FastAPI(title="isaac-mcp", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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


@app.get("/api/simulations")
async def simulations():
    return list_jobs()


@app.get("/api/llm/providers")
async def llm_providers():
    import httpx
    try:
        r = httpx.get("http://127.0.0.1:11434/api/tags", timeout=3)
        return {"ollama": r.json().get("models", [{"name": "llama3.2:3b"}])}
    except Exception:
        return {"ollama": [{"name": "llama3.2:3b"}]}


@app.post("/api/llm/chat")
async def llm_chat(body: dict):
    import httpx
    try:
        resp = httpx.post(
            "http://127.0.0.1:11434/api/generate",
            json={"model": body.get("model", "llama3.2:3b"), "prompt": body.get("prompt", ""), "stream": False},
            timeout=60,
        )
        return resp.json()
    except Exception as e:
        return {"error": str(e)}


# Mount MCP HTTP
mcp_mod = __import__("isaac_mcp.server", fromlist=["mcp"])
app.mount("/mcp", mcp_mod.mcp.http_app(path="/"))

# Serve frontend static files (if dist exists)
dist = Path(__file__).resolve().parent.parent / "dist"
if dist.is_dir():
    app.mount("/", StaticFiles(directory=str(dist), html=True), name="frontend")


def run_dev() -> None:
    import uvicorn
    uvicorn.run("web_sota.backend.server:app", host="127.0.0.1", port=11049, log_level="info", reload=True)


if __name__ == "__main__":
    run_dev()
