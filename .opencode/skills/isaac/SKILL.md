---
name: isaac
description: Drive NVIDIA Isaac Sim via isaac-mcp tools (scenes, sims, control, AI analysis)
---

# isaac-mcp skill (OpenCode channel)

Canonical playbook: `skills/isaac/SKILL.md` (same repo; served live via `GET /api/skills`).

## Session Context (isaac-mcp)

Before starting work: call sim_status() for Isaac/GPU state; scenes live in scenes/ (.depot/registry.json), jobs in jobs/{id}/ (state.json, control.json, stop.signal).
Drive sims with MCP tools (load_scene, start_sim, get_state, apply_control, list_jobs) — never hand-edit job files.
At end of work: uv run ruff check src/ + uv run pytest tests/ -q green; commit in <=5-file batches; never commit .env.
