# isaac-mcp — Copilot instructions

You are working in isaac-mcp: NVIDIA Isaac Sim/Lab behind 18 MCP tools
(src/isaac_mcp/server.py) plus a FastAPI dashboard backend (web_sota/backend/).

- Before starting work: check `sim_status()` semantics for Isaac/GPU state.
  Scenes live in `scenes/` (registry `.depot/registry.json`); sim jobs in
  `jobs/{id}/` (`state.json`, `control.json`, `stop.signal`, `completed.txt`).
- Drive sims with tools (`load_scene`, `start_sim`, `get_state`,
  `apply_control`, `list_jobs`, `natural_language_control`) — never hand-edit
  job files; the `_sim_runner.py` subprocess owns them.
- At end of work: `uv run ruff check src/`, `uv run pytest tests/ -q`;
  commit in <=5-file batches; never commit `.env` (template: `.env.example`).
