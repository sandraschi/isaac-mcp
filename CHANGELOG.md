# Changelog

## [Unreleased] — 2026-10-04 (assfix)

### Added
- REST: POST /api/shutdown (orderly exit), POST /api/scenes/load,
  POST /api/jobs/start + /api/jobs/{id}/stop (Simulations/Models buttons work),
  GET /api/skills (reads skills/*/SKILL.md), GET /api/v1/diagnostics,
  GET /api/llm/discover|models|onboarding (providers shape unchanged)
- skills/isaac/SKILL.md, llms-full.txt (+ llms.txt link), glama.json (15 tools),
  .env.example, .cursorrules/.windsurfrules, copilot-instructions,
  .claude-plugin/plugin.json + hooks/hooks.json, .gitattributes (eol=lf)
- CI: push/PR triggers, ruff-format + pyright + pytest + biome/tsc web gates,
  node 22; justfile fmt + build-native + real bootstrap; web check + biome:ci
  scripts; @tauri-apps/api dep; pytest coverage gate (--cov-fail-under=40)
- Dashboard hero with quick-start; fixed README ports table (was swapped)

### Fixed
- CRITICAL: CORS allow_origins ["*"] -> explicit origins + LAN/Tailscale regex
- tauri.conf.json frontendDist (web_sota/dist) + CSP ports; backend.rs log strings
- cua-nsis-config.json ports/paths; mcpb pack now wipe+recopies src/; .mcpbignore
- ruff format; T20 print-ban + per-file-ignores; FastAPI Query regex= deprecations
- Hermetic nl_control test (was Ollama-flaky); biome clean (button types, dep
  arrays, svg titles, stable chat keys); Help TROUBLES key
- .gitignore: reports/, .env, *.mcpb, *.bak-*, native/target/, native/gen/

## [Unreleased] — 2026-09-02

### Added
- Registered the real Nori A3 URDF (`norirobotics-mcp/models/nori_description/urdf/
  nori.expanded.absolute.urdf` — vendored from Nori Robotics' own `nori_description` repo,
  expanded from xacro with absolute mesh paths) as `nori_a3` in the scene depot via
  `load_scene`. Not yet loaded/rendered in Isaac Sim itself — no GPU-equipped Isaac install
  was available to verify against this pass; the file is real and staged, verified loading
  correctly in MuJoCo (see `robotics-mcp`/`mujoco-mcp` CHANGELOGs), not yet Isaac-verified.

## 0.2.0-alpha (2026-06-11)

- Initial release: 14 MCP tools (9 sim + 5 AI)
- Sim tools: sim_status, load_scene, start_sim, stop_sim, get_state, spawn_model, apply_control, list_scenes, list_jobs
- AI tools: agentic_sim_workflow, natural_language_control, analyze_sim_state, analyze_sim_logs, discover_model
- Scene depot: USD management with .depot/registry.json
- Isaac Sim auto-detection (bundle python.sh discovery)
- Web dashboard: Vite + React at 11048 with  overview, scene browser, LLM chat
- docs/ISAAC_VS_OTHERS.md — comparison with MuJoCo, Gazebo, PyBullet
- PRD.md, CHANGELOG.md, AGENTS.md, CLAUDE.md
- Fleet-standard port registration (11048/11049)
- llms.txt for Claude Desktop discovery
- start.ps1, start.bat, justfile, pyproject.toml
- GitHub CI with ruff lint + pytest on push/PR
