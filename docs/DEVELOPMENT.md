# isaac-mcp — Development

## Setup

```powershell
uv sync                  # Python deps (+ dev extras for gates)
just bootstrap           # uv sync + pre-commit install + web npm ci
.\web_sota\start.ps1     # full dashboard (backend :11049, frontend :11048)
```

Isaac Sim itself is separate (see `docs/ONBOARDING.md`): set `ISAAC_SIM_PATH`
or `ISAAC_PYTHON`. Without it the server runs fine — `sim_status()` reports
`isaac_available: false` and sim launches fail closed with a clear message.

## Commands

| Command | Purpose |
|---------|---------|
| `uv run python -m isaac_mcp` | MCP stdio server |
| `uv run pytest tests/ -q` | Tests (coverage gate `--cov-fail-under=40`) |
| `uv run ruff check src/ web_sota/backend/` | Lint (T20 print-ban enforced) |
| `uv run ruff format src/ web_sota/backend/` | Format |
| `uv run pyright src/` | Types, 0 allowed |
| `just lint` / `just fmt` / `just test` / `just serve` | Shortcuts |
| `just build-native` | Tauri NSIS build (`native/build.ps1`) |
| `just mcpb-pack` | MCP bundle (wipe+recopy `src/` → `mcpb/src/`, then pack) |

Webapp (`web_sota/`): `npm run dev|build|check|biome:ci`. CI runs
ruff + format-check + pyright + pytest + `check` + `biome:ci` + `build`.

## Architecture

```
MCP client (stdio) ──► src/isaac_mcp/server.py (18 tools: 15 + 3 Prefab cards)
Web dashboard ──► web_sota/backend/server.py (FastAPI, /mcp mounted w/ lifespan)
Sims ──► _sim_runner.py under the Isaac interpreter (file protocol per job dir)
```

- `src/isaac_mcp/prefab_cards.py` — `@mcp.tool(app=True)` cards, deferred
  imports of `server.py` (no import cycle). Disable via failed import (logs).
- Dialogic returns: every tool returns `{success, message, ...}` via `_ok`/`_fail`.
- `_fail()` logs at WARNING; `logger.exception` on every sampling→Ollama fallback.
- REST wrappers in `web_sota/backend/routes/` must match what the pages call
  (`/api/jobs/start`, `/api/scenes/load`, …) — dead buttons are a HIGH defect.

## Conventions

- Verb-led `snake_case` tool names; `## Return Format` + `## Examples` on all tools.
- Tool annotations (`readOnlyHint`/`destructiveHint`/…) on every `@mcp.tool`.
- No `print()` in server code (T20); `_sim_runner.py` stderr writes are its log
  channel (per-file-ignore, documented in `pyproject.toml`).
- Commits ≤5 files; 3+ file edits get timestamped `.bak` copies first.
- Never commit `.env`, `reports/`, `*.mcpb`, or `.bak*` (all gitignored).
