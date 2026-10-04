# isaac-mcp — Troubleshooting

## Sim won't start

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Isaac Sim Python not found` | No Isaac install / venv | Set `ISAAC_PYTHON` to the 3.11 interpreter, or `ISAAC_SIM_PATH`; check `sim_status().isaac_python` |
| `Runner exited immediately` | Crash or first-launch extension pull | Read `log_tail`; full log at `jobs/<id>/runner.log`. First launch pulls ~2 GB of extensions (10+ min) — `scene_loaded: false` + poll note is normal |
| `ImportError: no module named isaacsim` | Wrong interpreter | Python 3.11 venv + `pip install "isaacsim[all,extscache]==5.1.0" --extra-index-url https://pypi.nvidia.com` |
| `No NVIDIA GPU detected` | Driver/GPU | Driver 580.65.06+, 8 GB+ VRAM (RTX 3060+) |
| Out of GPU memory | Scene too large | Simplify USD; Isaac idles at ~4 GB VRAM |
| `control.json rejected` (runner stderr) | Unknown joint name | `get_state()` first for exact joint names/indices |
| Non-USD scene fails to load | Runner loads USD stages only | Convert URDF via Isaac's URDF importer first |
| EULA blocks startup | Interactive prompt | Run `scripts/first_launch.ps1` (handles acceptance) |

## Dashboard / backend

| Symptom | Cause | Fix |
|---------|-------|-----|
| Page shows nothing / connection refused | Backend down | `Get-NetTCPConnection -LocalPort 11048,11049` to find zombies; restart via `web_sota/start.ps1` |
| Start/Stop buttons no-op | Backend route missing | Check `/api/capabilities` endpoints list; routes live in `web_sota/backend/server.py` |
| `McpError: Session terminated` on `/mcp` | Lifespan not wired (BUG-038) | Parent lifespan must enter `mcp_app.router.lifespan_context(app)`; verify with a live uvicorn + `fastmcp.Client(url).list_tools()` (TestClient does NOT catch this) |
| CORS errors in Tauri shell | Origin not allowlisted | `tauri.conf.json` CSP + backend `allow_origins` must cover the WebView origin |
| Chat says `LLM unavailable` | No sampler, no Ollama | Pull `llama3.2:3b` in Ollama on :11434, or run inside a sampling-capable host |

## Dev / CI

| Symptom | Cause | Fix |
|---------|-------|-----|
| `ruff format --check` fails in CI | Unformatted merge | `uv run ruff format src/ web_sota/backend/` |
| Coverage gate fails (<40) | New uncovered module | Add tests (see `tests/test_prefab.py` pattern), don't lower the gate |
| `test_nl_control_unknown_job` flakes | Live Ollama answers nondeterministically | Test is hermetic (monkeypatched `httpx.post`) — if it flakes, the hermetic guard regressed |
| Biome CI fails on whole tree | Hook checks `src/`, not just staged files | Run `npm run biome:ci` in `web_sota/` and fix everything before splitting commits |
| LF→CRLF warnings on add | Missing gitattributes (fixed) | `.gitattributes` forces `eol=lf` (`.bat` stays CRLF) |
