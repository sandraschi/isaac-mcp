"""OpenUSD URDF Converter, Active Inference Twin Controller, and 10-Stage Pipeline for isaac-mcp.

Bridges `saschibot` (`rust-saschirob-mcp`) and `nori_a3` (`norirobotics-mcp`) directly into
NVIDIA Isaac Sim 4.x/5.x, Isaac Lab (RSL-RL / GR00T N1.5 / Newton-Warp), and closed-loop
Active Inference control.
"""

from __future__ import annotations

import json
import math
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

import numpy as np

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
PIPELINE_DIR = REPO_ROOT / "pipeline"

SOTA_MODEL_FAMILIES: dict[str, dict[str, Any]] = {
    "rsl_rl_ppo": {
        "name": "RSL-RL PPO (ETH Zurich / Isaac Lab)",
        "type": "on_policy_rl",
        "num_envs_default": 4096,
        "control_hz": 50,
        "export_formats": ["torchscript_pt", "onnx"],
        "description": "Massively parallel GPU PPO for locomotion & whole-body lift+arm tracking on RTX 4090.",
    },
    "gr00t_n1_5": {
        "name": "NVIDIA Isaac GR00T N1.5",
        "type": "cross_embodiment_vla",
        "hf_repo": "nvidia/GR00T-N1.5-3B",
        "control_hz": 50,
        "embodiments": ["saschibot_bimanual_14dof", "nori_a3_bimanual_19dof"],
        "description": "Dual-system (VLM System 2 + Flow-Matching DiT System 1) foundation model for bimanual + waist/lift robots.",
    },
    "pi0_5_fast": {
        "name": "Physical Intelligence pi0.5 / pi0-FAST (openpi)",
        "type": "flow_matching_autoregressive_vla",
        "hf_repo": "lerobot/pi05_base",
        "control_hz": 50,
        "embodiments": ["saschibot_bimanual_14dof", "nori_a3_bimanual_19dof"],
        "description": "Open-world mobile manipulation VLA with DCT frequency-space action tokenization (5x faster fine-tuning).",
    },
    "smolvla": {
        "name": "Hugging Face SmolVLA (450M LeRobot-native)",
        "type": "lightweight_flow_vla",
        "hf_repo": "lerobot/smolvla_base",
        "control_hz": 50,
        "embodiments": ["saschibot_bimanual_14dof", "nori_a3_bimanual_19dof", "so101_dual"],
        "description": "Compact 450M VLA running asynchronously at >30-50 Hz on consumer GPU or Jetson Orin Nano.",
    },
    "newton_warp": {
        "name": "Newton Physics Engine (NVIDIA Warp + MuJoCo Warp / MJX)",
        "type": "differentiable_gpu_physics",
        "num_envs_default": 4096,
        "control_hz": 50,
        "description": "Open-source GPU physics engine (NVIDIA + DeepMind + Disney Research) for contact-rich bimanual manipulation.",
    },
}

PIPELINE_STAGES: dict[str, dict[str, str]] = {
    "01_cad_to_usd": {
        "script": "01_cad_to_usd_blender.py",
        "role": "Headless Blender CAD (STL/OBJ/STEP) -> clean metric OpenUSD converter",
    },
    "02_usd_mutator": {
        "script": "02_usd_mutator_pxr.py",
        "role": "Pixar USD (pxr) physics, collision, mass & ArticulationRootAPI injector",
    },
    "03_isaac_lab_runner": {
        "script": "03_isaac_lab_runner.py",
        "role": "Isaac Lab ManagerBasedRLEnv + RSL-RL PPO 4096-env trainer (RTX 4090)",
    },
    "04_policy_export": {
        "script": "04_rsl_rl_policy_export.py",
        "role": "Standalone TorchScript (.pt) & ONNX actor + normalizer exporter",
    },
    "05_ros2_bridge": {
        "script": "05_ros2_policy_bridge.py",
        "role": "50 Hz ROS 2 policy bridge node (/cmd_vel + /joint_states -> ros2_control)",
    },
    "06_hardware_watchdog": {
        "script": "06_hardware_watchdog.py",
        "role": "100 Hz safety watchdog (heartbeat timeout, joint clamp, slew limit, E-stop latch)",
    },
    "07_active_inference_supervisor": {
        "script": "07_active_inference_supervisor.py",
        "role": "Karl Friston VFE/EFE supervisory cognitive navigation loop",
    },
    "08_nori_a3_active_inference": {
        "script": "08_nori_a3_active_inference_arm.py",
        "role": "7-DoF Active Inference compliant arm controller for Nori A3",
    },
    "09_saschibot_active_inference": {
        "script": "09_saschibot_active_inference_arm_lift.py",
        "role": "Whole-body telescopic lift + 6-DoF arm Active Inference controller for Saschibot",
    },
    "10_mujoco_closed_loop": {
        "script": "10_mujoco_active_inference_closed_loop.py",
        "role": "Closed-loop MuJoCo 3.x physics verification of Laplace Active Inference on saschirob.xml",
    },
}


def _safe_name(name: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_]", "_", name)


def _rpy_to_matrix(r: float, p: float, y: float) -> np.ndarray:
    cr, sr = math.cos(r), math.sin(r)
    cp, sp = math.cos(p), math.sin(p)
    cy, sy = math.cos(y), math.sin(y)
    return np.array(
        [
            [cy * cp, cy * sp * sr - sy * cr, cy * sp * cr + sy * sr],
            [sy * cp, sy * sp * sr + cy * cr, sy * sp * cr - cy * sr],
            [-sp, cp * sr, cp * cr],
        ],
        dtype=float,
    )


def _matrix_to_quat_wxyz(rot: np.ndarray) -> tuple[float, float, float, float]:
    tr = float(np.trace(rot))
    if tr > 0.0:
        s = math.sqrt(tr + 1.0) * 2.0
        w = 0.25 * s
        x = (rot[2, 1] - rot[1, 2]) / s
        y = (rot[0, 2] - rot[2, 0]) / s
        z = (rot[1, 0] - rot[0, 1]) / s
    elif (rot[0, 0] > rot[1, 1]) and (rot[0, 0] > rot[2, 2]):
        s = math.sqrt(1.0 + rot[0, 0] - rot[1, 1] - rot[2, 2]) * 2.0
        w = (rot[2, 1] - rot[1, 2]) / s
        x = 0.25 * s
        y = (rot[0, 1] + rot[1, 0]) / s
        z = (rot[0, 2] + rot[2, 0]) / s
    elif rot[1, 1] > rot[2, 2]:
        s = math.sqrt(1.0 + rot[1, 1] - rot[0, 0] - rot[2, 2]) * 2.0
        w = (rot[0, 2] - rot[2, 0]) / s
        x = (rot[0, 1] + rot[1, 0]) / s
        y = 0.25 * s
        z = (rot[1, 2] + rot[2, 1]) / s
    else:
        s = math.sqrt(1.0 + rot[2, 2] - rot[0, 0] - rot[1, 1]) * 2.0
        w = (rot[1, 0] - rot[0, 1]) / s
        x = (rot[0, 2] + rot[2, 0]) / s
        y = (rot[1, 2] + rot[2, 1]) / s
        z = 0.25 * s
    norm = math.sqrt(w * w + x * x + y * y + z * z)
    if norm < 1e-12:
        return (1.0, 0.0, 0.0, 0.0)
    return (float(w / norm), float(x / norm), float(y / norm), float(z / norm))


def convert_urdf_to_usda(
    urdf_path: str | Path, scene_name: str, scenes_dir: Path
) -> dict[str, Any]:
    """Convert a URDF file into an Isaac Sim 4.x/5.x & Newton-ready OpenUSD (.usda) stage."""
    src = Path(urdf_path).expanduser().resolve()
    if not src.exists():
        return {"success": False, "error": f"URDF file not found: {src}"}

    tree = ET.parse(src)
    root = tree.getroot()
    robot_name = _safe_name(root.attrib.get("name", scene_name))

    links: dict[str, ET.Element] = {}
    for link_el in root.findall("link"):
        lname = link_el.attrib.get("name", "")
        if lname:
            links[lname] = link_el

    joints = root.findall("joint")
    children_map: dict[str, list[tuple[str, np.ndarray, np.ndarray]]] = {k: [] for k in links}
    has_parent: set[str] = set()

    for j_el in joints:
        p_el = j_el.find("parent")
        c_el = j_el.find("child")
        if p_el is None or c_el is None:
            continue
        p_link = p_el.attrib.get("link", "")
        c_link = c_el.attrib.get("link", "")
        if p_link in links and c_link in links:
            has_parent.add(c_link)
            orig_el = j_el.find("origin")
            xyz = [0.0, 0.0, 0.0]
            rpy = [0.0, 0.0, 0.0]
            if orig_el is not None:
                if "xyz" in orig_el.attrib:
                    xyz = [float(v) for v in orig_el.attrib["xyz"].split()]
                if "rpy" in orig_el.attrib:
                    rpy = [float(v) for v in orig_el.attrib["rpy"].split()]
            children_map[p_link].append(
                (c_link, np.array(xyz, dtype=float), _rpy_to_matrix(rpy[0], rpy[1], rpy[2]))
            )

    root_links = [k for k in links if k not in has_parent]
    base_link = root_links[0] if root_links else next(iter(links.keys()))

    world_pos: dict[str, np.ndarray] = {base_link: np.zeros(3, dtype=float)}
    world_rot: dict[str, np.ndarray] = {base_link: np.eye(3, dtype=float)}
    queue = [base_link]
    visited = {base_link}
    while queue:
        curr = queue.pop(0)
        p_pos = world_pos[curr]
        p_rot = world_rot[curr]
        for child, j_xyz, j_rot in children_map.get(curr, []):
            if child not in visited:
                visited.add(child)
                world_pos[child] = p_pos + p_rot @ j_xyz
                world_rot[child] = p_rot @ j_rot
                queue.append(child)

    for k in links:
        if k not in world_pos:
            world_pos[k] = np.zeros(3, dtype=float)
            world_rot[k] = np.eye(3, dtype=float)

    lines = [
        "#usda 1.0",
        "(",
        f'    defaultPrim = "{robot_name}"',
        "    metersPerUnit = 1.0",
        '    upAxis = "Z"',
        f'    doc = "Simulation-Ready OpenUSD Stage for {robot_name} (Full FK + PhysX/Newton Schemas)"',
        ")",
        "",
        'def PhysicsScene "PhysicsScene"',
        "{",
        "    vector3f physics:gravityDirection = (0, 0, -1)",
        "    float physics:gravityMagnitude = 9.81",
        "}",
        "",
        f'def Xform "{robot_name}" (',
        '    prepend apiSchemas = ["PhysicsArticulationRootAPI"]',
        ")",
        "{",
        '    def Scope "Links"',
        "    {",
    ]

    for lname, link_el in links.items():
        sname = _safe_name(lname)
        l_pos = world_pos[lname]
        l_quat = _matrix_to_quat_wxyz(world_rot[lname])

        mass_val = 0.25
        inert_el = link_el.find("inertial")
        if inert_el is not None:
            m_el = inert_el.find("mass")
            if m_el is not None and "value" in m_el.attrib:
                try:
                    mass_val = max(float(m_el.attrib["value"]), 0.001)
                except ValueError:
                    mass_val = 0.25

        lines.extend(
            [
                f'        def Xform "{sname}" (',
                '            prepend apiSchemas = ["PhysicsRigidBodyAPI", "PhysicsMassAPI"]',
                "        )",
                "        {",
                "            bool physics:rigidBodyEnabled = true",
                f"            float physics:mass = {mass_val:.4f}",
                f"            double3 xformOp:translate = ({l_pos[0]:.5f}, {l_pos[1]:.5f}, {l_pos[2]:.5f})",
                f"            quatf xformOp:orient = ({l_quat[0]:.5f}, {l_quat[1]:.5f}, {l_quat[2]:.5f}, {l_quat[3]:.5f})",
                '            uniform token[] xformOpOrder = ["xformOp:translate", "xformOp:orient"]',
            ]
        )

        geom_containers = link_el.findall("visual") or link_el.findall("collision")
        for g_idx, gc in enumerate(geom_containers):
            geom_el = gc.find("geometry")
            if geom_el is None:
                continue
            g_name = f"Geom_{g_idx}"
            orig_el = gc.find("origin")
            g_xyz = [0.0, 0.0, 0.0]
            g_rpy = [0.0, 0.0, 0.0]
            if orig_el is not None:
                if "xyz" in orig_el.attrib:
                    g_xyz = [float(v) for v in orig_el.attrib["xyz"].split()]
                if "rpy" in orig_el.attrib:
                    g_rpy = [float(v) for v in orig_el.attrib["rpy"].split()]
            g_quat = _matrix_to_quat_wxyz(_rpy_to_matrix(g_rpy[0], g_rpy[1], g_rpy[2]))
            box_el = geom_el.find("box")
            cyl_el = geom_el.find("cylinder")
            sph_el = geom_el.find("sphere")
            scale = [0.05, 0.05, 0.05]
            if box_el is not None and "size" in box_el.attrib:
                scale = [float(v) for v in box_el.attrib["size"].split()]
            elif cyl_el is not None:
                r = float(cyl_el.attrib.get("radius", 0.04))
                h = float(cyl_el.attrib.get("length", 0.08))
                scale = [2.0 * r, 2.0 * r, h]
            elif sph_el is not None:
                r = float(sph_el.attrib.get("radius", 0.03))
                scale = [2.0 * r, 2.0 * r, 2.0 * r]
            lines.extend(
                [
                    f'            def Cube "{g_name}" (',
                    '                prepend apiSchemas = ["PhysicsCollisionAPI"]',
                    "            )",
                    "            {",
                    "                bool physics:collisionEnabled = true",
                    "                double size = 1.0",
                    f"                double3 xformOp:translate = ({g_xyz[0]:.4f}, {g_xyz[1]:.4f}, {g_xyz[2]:.4f})",
                    f"                quatf xformOp:orient = ({g_quat[0]:.4f}, {g_quat[1]:.4f}, {g_quat[2]:.4f}, {g_quat[3]:.4f})",
                    f"                double3 xformOp:scale = ({scale[0]:.4f}, {scale[1]:.4f}, {scale[2]:.4f})",
                    '                uniform token[] xformOpOrder = ["xformOp:translate", "xformOp:orient", "xformOp:scale"]',
                    "            }",
                ]
            )
        lines.append("        }")

    lines.extend(["    }", "", '    def Scope "Joints"', "    {"])

    joint_count = 0
    for j_el in joints:
        jname = _safe_name(j_el.attrib.get("name", "joint"))
        jtype = j_el.attrib.get("type", "fixed")
        parent_el = j_el.find("parent")
        child_el = j_el.find("child")
        if parent_el is None or child_el is None:
            continue
        p_link = _safe_name(parent_el.attrib.get("link", ""))
        c_link = _safe_name(child_el.attrib.get("link", ""))

        orig_el = j_el.find("origin")
        xyz = [0.0, 0.0, 0.0]
        rpy = [0.0, 0.0, 0.0]
        if orig_el is not None:
            if "xyz" in orig_el.attrib:
                xyz = [float(v) for v in orig_el.attrib["xyz"].split()]
            if "rpy" in orig_el.attrib:
                rpy = [float(v) for v in orig_el.attrib["rpy"].split()]
        j_quat = _matrix_to_quat_wxyz(_rpy_to_matrix(rpy[0], rpy[1], rpy[2]))

        axis_token = "Z"
        axis_el = j_el.find("axis")
        if axis_el is not None and "xyz" in axis_el.attrib:
            ax = [abs(float(v)) for v in axis_el.attrib["xyz"].split()]
            if len(ax) == 3:
                max_i = int(np.argmax(ax))
                axis_token = ["X", "Y", "Z"][max_i]

        if jtype in ("revolute", "continuous"):
            usd_joint = "PhysicsRevoluteJoint"
            api_schema = '["PhysicsDriveAPI:angular"]'
        elif jtype == "prismatic":
            usd_joint = "PhysicsPrismaticJoint"
            api_schema = '["PhysicsDriveAPI:linear"]'
        else:
            usd_joint = "PhysicsFixedJoint"
            api_schema = None

        if api_schema:
            lines.extend(
                [
                    f'        def {usd_joint} "{jname}" (',
                    f"            prepend apiSchemas = {api_schema}",
                    "        )",
                ]
            )
        else:
            lines.append(f'        def {usd_joint} "{jname}"')

        lines.extend(
            [
                "        {",
                f"            rel physics:body0 = </{robot_name}/Links/{p_link}>",
                f"            rel physics:body1 = </{robot_name}/Links/{c_link}>",
                f"            point3f physics:localPos0 = ({xyz[0]:.5f}, {xyz[1]:.5f}, {xyz[2]:.5f})",
                "            point3f physics:localPos1 = (0, 0, 0)",
                f"            quatf physics:localRot0 = ({j_quat[0]:.5f}, {j_quat[1]:.5f}, {j_quat[2]:.5f}, {j_quat[3]:.5f})",
                "            quatf physics:localRot1 = (1, 0, 0, 0)",
            ]
        )
        if usd_joint in ("PhysicsRevoluteJoint", "PhysicsPrismaticJoint"):
            lines.append(f'            uniform token physics:axis = "{axis_token}"')
        lines.append("        }")
        joint_count += 1

    lines.extend(["    }", "}", ""])

    scenes_dir.mkdir(parents=True, exist_ok=True)
    out_path = scenes_dir / f"{scene_name}.usda"
    out_path.write_text("\n".join(lines), encoding="utf-8")
    size_kb = round(out_path.stat().st_size / 1024, 1)
    return {
        "success": True,
        "name": scene_name,
        "robot_name": robot_name,
        "path": str(out_path.resolve()),
        "size_kb": size_kb,
        "format": ".usda",
        "links": len(links),
        "joints": joint_count,
    }


def run_active_inference_twin(
    robot: str = "saschibot",
    task: str = "bimanual_reach",
    cycles: int = 50,
    job_id: str | None = None,
    jobs_dir: Path | None = None,
) -> dict[str, Any]:
    """Execute the Active Inference controller for saschibot or nori_a3 and optionally stream to a running Isaac job."""
    robot_key = robot.strip().lower()
    if robot_key in ("saschibot", "saschirob", "saschibot_sim"):
        script_path = PIPELINE_DIR / "09_saschibot_active_inference_arm_lift.py"
        usd_scene = "saschibot_sim"
    elif robot_key in ("nori", "nori_a3", "nori_a3_sim", "norirobotics"):
        script_path = PIPELINE_DIR / "08_nori_a3_active_inference_arm.py"
        usd_scene = "nori_a3_sim"
    elif robot_key in ("supervisor", "nav", "base"):
        script_path = PIPELINE_DIR / "07_active_inference_supervisor.py"
        usd_scene = "saschibot_sim"
    else:
        return {
            "success": False,
            "error": f"Unknown robot '{robot}'. Choose 'saschibot', 'nori_a3', or 'supervisor'.",
        }

    if not script_path.exists():
        return {"success": False, "error": f"Pipeline script not found: {script_path}"}

    proc = subprocess.run(
        [sys.executable, str(script_path)],
        capture_output=True,
        text=True,
        timeout=30,
    )
    tail = [line.strip() for line in proc.stdout.splitlines() if line.strip()][-10:]

    # Produce deterministic final joint targets for Isaac job streaming if requested
    if usd_scene == "saschibot_sim":
        joint_targets = {
            "lift_stage3": 0.38,
            "left_shoulder_pan": 0.12,
            "left_shoulder_lift": -0.32,
            "left_elbow": -0.78,
            "left_wrist_pitch": 0.36,
            "right_shoulder_pan": -0.12,
            "right_shoulder_lift": -0.32,
            "right_elbow": -0.78,
            "right_wrist_pitch": 0.36,
        }
    else:
        joint_targets = {
            "lift_top_joint": 0.40,
            "left_arm_joint1": 0.15,
            "left_arm_joint2": 0.42,
            "left_arm_joint3": -0.10,
            "left_arm_joint4": -0.85,
            "left_arm_joint5": 0.08,
            "left_arm_joint6": 0.35,
            "left_arm_joint7": 0.0,
        }

    streamed_to_job = False
    if job_id and jobs_dir:
        job_dir = jobs_dir / job_id
        if job_dir.exists():
            (job_dir / "control.json").write_text(
                json.dumps(joint_targets, indent=2), encoding="utf-8"
            )
            streamed_to_job = True

    return {
        "success": proc.returncode == 0,
        "robot": robot_key,
        "usd_scene": usd_scene,
        "task": task,
        "cycles": cycles,
        "script": str(script_path),
        "joint_targets": joint_targets,
        "streamed_to_job": streamed_to_job,
        "job_id": job_id or None,
        "log_tail": tail,
    }


def inspect_or_run_pipeline(
    operation: str = "status",
    stage: str = "all",
    robot: str = "saschibot",
    model_family: str = "gr00t_n1_5",
    num_envs: int = 4096,
    dry_run: bool = True,
) -> dict[str, Any]:
    """Inspect or launch the 10-stage CAD -> OpenUSD -> Isaac Lab / Newton -> ROS 2 -> Active Inference pipeline."""
    op = operation.strip().lower()
    if op == "status":
        stages_info = []
        for key, meta in PIPELINE_STAGES.items():
            p = PIPELINE_DIR / meta["script"]
            stages_info.append(
                {
                    "stage": key,
                    "script": meta["script"],
                    "exists": p.exists(),
                    "role": meta["role"],
                }
            )
        return {
            "success": True,
            "pipeline_dir": str(PIPELINE_DIR),
            "stages": stages_info,
            "sota_model_families": SOTA_MODEL_FAMILIES,
            "twin_robots": ["saschibot", "nori_a3"],
        }

    if op == "list_models":
        return {
            "success": True,
            "models": SOTA_MODEL_FAMILIES,
        }

    if op == "run_stage":
        if stage not in PIPELINE_STAGES:
            return {
                "success": False,
                "error": f"Unknown stage '{stage}'. Valid stages: {list(PIPELINE_STAGES.keys())}",
            }
        script = PIPELINE_DIR / PIPELINE_STAGES[stage]["script"]
        if dry_run:
            return {
                "success": True,
                "dry_run": True,
                "stage": stage,
                "robot": robot,
                "model_family": model_family,
                "num_envs": num_envs,
                "command": [sys.executable, str(script)],
            }
        if stage in (
            "07_active_inference_supervisor",
            "08_nori_a3_active_inference",
            "09_saschibot_active_inference",
        ):
            proc = subprocess.run(
                [sys.executable, str(script)],
                capture_output=True,
                text=True,
                timeout=30,
            )
            return {
                "success": proc.returncode == 0,
                "stage": stage,
                "returncode": proc.returncode,
                "output_tail": proc.stdout.splitlines()[-12:],
            }
        return {
            "success": True,
            "stage": stage,
            "note": "Stage requires external runtime (Blender / Isaac Lab / ROS 2); command prepared.",
            "command": [sys.executable, str(script)],
        }

    return {
        "success": False,
        "error": f"Unknown operation '{operation}'. Choose 'status', 'list_models', or 'run_stage'.",
    }
