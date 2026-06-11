# Changelog

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
