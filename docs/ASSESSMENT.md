# isaac-mcp — Assessment

**Date:** 2026-06-11 | **Version:** 0.2.0 | **Status:** Code-complete; one user step (EULA) from runnable

## Verdict

Was a facade — `start_sim` referenced a nonexistent `_sim_runner.py`, no
`__main__.py`, Isaac Sim not installed, ~9 of 14 tools dead. Now: runner
written, server rewired, Isaac Sim 5.1 installed (9.68 GB pip venv). The only
remaining gate is interactive: first launch requires accepting the NVIDIA
Omniverse EULA, which is the user's call — `scripts\first_launch.ps1` does the
bring-up (sets `OMNI_KIT_ACCEPT_EULA=YES`, registers `scenes/test_cube.usda`,
runs the runner headless; expect 10+ min extension pull).

## Added/fixed this session

| Item | Detail |
|---|---|
| `_sim_runner.py` written | Fleet file-protocol (state/control/stop/completed/error), ported from mujoco-mcp; SimulationApp-first import order; dual namespace (`isaacsim.core.api` 5.x → `omni.isaac.core` 4.x); articulation-root discovery via `UsdPhysics.ArticulationRootAPI`; position-target control mapped from control.json |
| `__main__.py` added | README quickstart `python -m isaac_mcp` no longer fails |
| Split interpreter | Isaac Sim 5.1 pins **Python 3.11 exactly**; server runs 3.12, sims under `.venv-isaac311` (`ISAAC_PYTHON` override); `_find_isaac_python` probes pip venv → binary installs |
| Isaac Sim 5.1.0 installed | `isaacsim[all,extscache]==5.1.0` from pypi.nvidia.com into `.venv-isaac311`; `import isaacsim` reaches the EULA prompt (= package intact) |
| Popen→logfile | `jobs/{id}/runner.log`; was undrained PIPE (deadlock risk, fatal with Isaac's chatty extension pull) |
| Non-blocking start | Old code blocked 50 s; now 20 s fast-fail window with log tail, then returns with a "still starting" note (first launch takes 10+ min) |
| Version/README | 0.2.0; setup, EULA step, and runner protocol documented |

25 tests pass; ruff clean.

## Verified / not verified

- ✅ Runner compiles; server imports; venv intact (EULA prompt confirms the
  isaacsim package loads its bootstrap)
- ❌ **Runner not yet executed** — blocked on EULA acceptance (user step).
  After `first_launch.ps1`: confirm metadata.json/state.json appear, then test
  an articulated scene (test_cube has no articulation; the runner's
  articulation=None path is what first_launch exercises)
- ❌ Articulation control path untested against a real robot USD — the 5.x
  `Articulation` view API reshaping (`(count, dof)`) is handled defensively but
  needs one real session
- URDF scenes are rejected by design (USD only); URDF import is a future tool

## Risks

- Isaac Sim 5.x API churn: runner targets 5.1 names with 4.x fallback; 6.0
  preview may break both — pin 5.1 until there's a reason not to.
- GPU driver requirement 580.65.06+ for 5.1 — verify `nvidia-smi` before
  blaming the runner for shader-compile hangs.

## Next

1. Run `scripts\first_launch.ps1` (accepts EULA — user decision)
2. Smoke an articulated USD (e.g. a Franka USD via `discover_model` or the
   limx HU_D04 USD from humanoid-description)
3. Commit; mcpb pack; FLEET_INDEX entry

---

## Update 2026-06-12 (post OpenCode pass)

Pushed to GitHub (main). OpenCode added 7 Playwright fleet-audit e2e tests.
scenes/test_cube.usda + scripts/first_launch.ps1 committed; gitignore now
guards the 9.7 GB .venv-isaac311, jobs/, and the install log. hatchling
packaging added. FLEET_INDEX entry added (11049/11048). **Status unchanged:
EULA-gated** � `scripts/first_launch.ps1` remains the user step before the
runner's first real execution.
