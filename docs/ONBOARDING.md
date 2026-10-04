# isaac-mcp — Onboarding

Get from zero to a running GPU simulation in ~20 minutes (plus Isaac download).

## What you need

- **Isaac Sim** (the wrappee): either a binary install (2023.1+) or pip
  (`isaacsim[all,extscache]==5.1.0` on **Python 3.11**). This is a separate
  NVIDIA download — isaac-mcp does not bundle it.
- **NVIDIA GPU**: 8 GB+ VRAM (RTX 3060+), driver 580.65.06+.
- **Ollama** (optional, for AI tools): `ollama pull llama3.2:3b`.
- **Money / accounts**: none. Everything is local and free (Isaac Sim needs a
  free NVIDIA account + EULA acceptance on first launch).

## Steps

1. Clone + `uv sync`, copy `.env.example` to `.env`.
2. Set `ISAAC_SIM_PATH` (or `ISAAC_PYTHON` for a pip venv).
3. Binary installs: run `scripts/first_launch.ps1` once (EULA + extension pull).
4. `.\web_sota\start.ps1`, open :11048. Dashboard hero walks you from here.
5. Sanity check: `sim_status()` shows `isaac_available: true` and your GPUs;
   load any `.usd` on Models, `start_sim`, `get_state`, `stop_sim`.

## Pitfalls

- First sim launch pulls ~2 GB of Omniverse extensions (10+ min, one time).
  `scene_loaded: false` with a poll note is expected — wait, don't retry-loop.
- Isaac Sim uses **its own Python** (`python.sh`/`python.bat` or `.venv-isaac311`),
  never the server venv. `ModuleNotFoundError: isaacsim` always means the wrong
  interpreter.
- No GPU on this machine? The server, dashboard, depot, and all REST still work;
  only `start_sim` fails closed with a clear message.

## Sanity checklist

- [ ] `GET /health` returns 200 with `isaac_available: true`
- [ ] `GET /api/capabilities` lists 18 tools
- [ ] One scene in the depot, one completed job in Simulations
- [ ] Chat answers via Ollama (or your MCP host's sampling)
