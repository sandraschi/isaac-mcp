# isaac-mcp — Agent Context

## What this is
General-purpose NVIDIA Isaac Sim/Lab simulation via MCP. Start, control, and
query Isaac Sim simulations through MCP tools. 18 tools total (10 sim + 5 AI + 3 Prefab).

## Key paths
- `src/isaac_mcp/server.py` — 14 MCP tools
- `web_sota/backend/server.py` — FastAPI backend (port 11049)
- `web_sota/src/` — React frontend (port 11048)
- `scenes/` — loaded USD/URDF scene depot
- `jobs/` — sim job state/control dirs

## Commands
- `uv run pytest tests/ -q` — unit tests
- `ruff check src/ web_sota/backend/` — lint
- `uv run python -m isaac_mcp` — start MCP stdio
- `.\web_sota\start.ps1` — full web dashboard

## Gotchas
- Isaac Sim uses its own Python (python.sh from install dir), not the system Python
- Sim runs as subprocess for isolation (crash-safe)
- State sync via JSON files (state.json, control.json, stop.signal)
- Requires NVIDIA GPU and Isaac Sim application installed
- AI tools fall back to Ollama when ctx.sample is unavailable
