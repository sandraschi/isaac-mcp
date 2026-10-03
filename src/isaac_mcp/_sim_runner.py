# pyright: reportMissingImports=false
"""Isaac Sim subprocess runner for isaac-mcp.

Implements the fleet file-protocol contract (same as mujoco-mcp/_sim_runner.py):
  jobs/{job_id}/metadata.json   - written once after scene load
  jobs/{job_id}/state.json      - joint positions/velocities, refreshed continuously
  jobs/{job_id}/control.json    - consumed and deleted each loop iteration
  jobs/{job_id}/stop.signal     - touch to request shutdown
  jobs/{job_id}/completed.txt   - written on clean exit
  jobs/{job_id}/error.txt       - written on crash

MUST run under the Isaac Sim Python environment (Python 3.11 for Isaac Sim 5.x;
pip: `pip install "isaacsim[all,extscache]==5.1.0" --extra-index-url https://pypi.nvidia.com`
or the binary install's python.bat). The MCP server itself runs on a normal
Python and only launches this script - see server._find_isaac_python().

API namespaces: Isaac Sim 5.x uses `isaacsim.core.api`; 4.x used
`omni.isaac.core`. Both are tried. SimulationApp must be created BEFORE any
other isaacsim/omni import - that is why imports below are deferred.
"""

import argparse
import json
import sys
import time
import traceback
from pathlib import Path


def _write_json(path: Path, payload: dict) -> None:
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(payload))
    tmp.replace(path)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--scene-path", required=True)
    parser.add_argument("--job-id", required=True)
    parser.add_argument("--jobs-dir", required=True)
    parser.add_argument("--headless", action="store_true", default=False)
    parser.add_argument("--physics-dt", type=float, default=1.0 / 60.0)
    args = parser.parse_args()

    job_dir = Path(args.jobs_dir) / args.job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    state_path = job_dir / "state.json"
    control_path = job_dir / "control.json"
    stop_path = job_dir / "stop.signal"

    step = 0
    sim_app = None
    try:
        # --- SimulationApp must exist before any other Isaac import ---
        try:
            from isaacsim import SimulationApp  # Isaac Sim 4.x/5.x pip + binary
        except ImportError:
            from omni.isaac.kit import SimulationApp  # legacy 2023.x binary

        sim_app = SimulationApp({"headless": args.headless})

        # --- Core API: 5.x namespace first, 4.x fallback ---
        try:
            from isaacsim.core.api import World
            from isaacsim.core.prims import Articulation as ArticulationView
            from isaacsim.core.utils.stage import open_stage
        except ImportError:
            from omni.isaac.core import World
            from omni.isaac.core.articulations import ArticulationView
            from omni.isaac.core.utils.stage import open_stage

        from pxr import UsdPhysics  # available once the app is up

        scene_path = str(Path(args.scene_path).resolve())
        if not scene_path.lower().endswith((".usd", ".usda", ".usdc")):
            raise RuntimeError(
                f"Runner loads USD stages; got '{scene_path}'. "
                "Convert URDF via Isaac's URDF importer first (future tool)."
            )
        open_stage(scene_path)

        world = World(physics_dt=args.physics_dt, stage_units_in_meters=1.0)
        world.reset()

        # --- Discover the first articulation root on the stage ---
        import omni.usd

        stage = omni.usd.get_context().get_stage()
        art_root = None
        for prim in stage.Traverse():
            if prim.HasAPI(UsdPhysics.ArticulationRootAPI):
                art_root = str(prim.GetPath())
                break

        articulation = None
        joint_names: list[str] = []
        if art_root:
            articulation = ArticulationView(art_root)
            # 5.x Articulation initializes lazily; 4.x ArticulationView needs world registration
            try:
                world.scene.add(articulation)
            except Exception:
                pass
            world.reset()
            try:
                joint_names = list(articulation.dof_names or [])
            except Exception:
                joint_names = []

        _write_json(
            job_dir / "metadata.json",
            {
                "scene_path": scene_path,
                "headless": args.headless,
                "physics_dt": args.physics_dt,
                "articulation_root": art_root,
                "actuator_names": joint_names,
                "num_dof": len(joint_names),
            },
        )

        def write_state() -> None:
            qpos: list = []
            qvel: list = []
            if articulation is not None:
                try:
                    p = articulation.get_joint_positions()
                    v = articulation.get_joint_velocities()
                    # 5.x returns (count, dof) arrays for view prims; flatten first env
                    qpos = (
                        (p[0] if getattr(p, "ndim", 1) > 1 else p).tolist() if p is not None else []
                    )
                    qvel = (
                        (v[0] if getattr(v, "ndim", 1) > 1 else v).tolist() if v is not None else []
                    )
                except Exception:
                    pass
            _write_json(
                state_path,
                {
                    "time": float(world.current_time),
                    "step": step,
                    "qpos": qpos,
                    "qvel": qvel,
                    "actuator_values": dict(zip(joint_names, qpos, strict=False)),
                    "sensor_readings": {},
                },
            )

        write_state()

        # --- Main loop: file-protocol control + stepping ---
        import numpy as np

        while not stop_path.exists():
            if not sim_app.is_running():
                break

            if control_path.exists() and articulation is not None and joint_names:
                try:
                    cmds = json.loads(control_path.read_text())
                    targets = None
                    try:
                        cur = articulation.get_joint_positions()
                        targets = np.array(
                            cur[0] if getattr(cur, "ndim", 1) > 1 else cur, dtype=float
                        )
                    except Exception:
                        targets = np.zeros(len(joint_names))
                    for key, val in cmds.items():
                        idx = (
                            joint_names.index(key)
                            if key in joint_names
                            else (
                                int(key) if key.isdigit() and int(key) < len(joint_names) else None
                            )
                        )
                        if idx is not None:
                            targets[idx] = float(val)
                    try:
                        articulation.set_joint_position_targets(targets.reshape(1, -1))
                    except Exception:
                        articulation.set_joint_position_targets(targets)
                except Exception as e:  # malformed control is non-fatal
                    print(f"control.json rejected: {e}", file=sys.stderr)
                finally:
                    control_path.unlink(missing_ok=True)

            world.step(render=not args.headless)
            step += 1
            if step % 5 == 0:
                write_state()

        write_state()
    except Exception:
        (job_dir / "error.txt").write_text(traceback.format_exc())
        raise
    finally:
        (job_dir / "completed.txt").write_text(
            f"completed at step {step} ({time.strftime('%Y-%m-%d %H:%M:%S')})"
        )
        if sim_app is not None:
            try:
                sim_app.close()
            except Exception:
                pass


if __name__ == "__main__":
    main()
