# Isaac Sim vs MuJoCo vs Gazebo

## Overview

| Feature | Isaac Sim | MuJoCo | Gazebo |
|---------|-----------|--------|--------|
| **Developer** | NVIDIA | DeepMind | Open Robotics |
| **Physics Engine** | PhysX 5 (GPU) | MuJoCo (CPU/GPU) | ODE, DART, Bullet, Simbody |
| **GPU Acceleration** | Full (GPU physics + RTX) | Limited (mesh only) | Minimal |
| **Render Quality** | RTX / Path-traced | Basic (OpenGL) | Ogre / Ignition Rendering |
| **ROS Integration** | Via ROS2 Bridge | Limited | Native |
| **Python API** | `omni.isaac.core` / `omni.isaac.lab` | `mujoco` (direct) | `ignition` / `gazebo` |
| **Scene Format** | USD (native) | MJCF / XML | SDF / URDF |
| **Learning** | RL (Isaac Gym/Lab) | Built-in | Via plugins |
| **Terrain** | Heightfield + mesh | Heightfield | Mesh |
| **Deformable Bodies** | Yes (FEM) | Soft body | Limited |
| **Sensors** | Lidar, camera, IMU, contact | Camera, touch, force-torque | Lidar, camera, IMU, GPS |

## When to Use Which

### Isaac Sim (this repo)
- **Photo-realistic rendering** — RTX-accelerated, material-accurate
- **GPU-accelerated physics** — large-scale scenes, many objects
- **RL training** — Isaac Lab provides Gym-style API
- **Digital Twins** — USD-native pipeline for factory/simulations
- **Requires**: NVIDIA GPU with 8+ GB VRAM, Isaac Sim install (~30 GB)

### MuJoCo (mujoco-mcp)
- **Fast, lightweight physics** — millisecond-level simulation speeds
- **Research prototyping** — easy to set up, minimal dependencies
- **Cross-platform** — runs anywhere with a CPU
- **No GPU required** — also runs on most hardware

### Gazebo (gazebo-mcp)
- **ROS-native** — best integration with ROS 2 ecosystems
- **Sensor simulation** — rich out-of-the-box sensor models
- **Plugin architecture** — extensible for custom behaviors
- **Open-source community** — largest ecosystem

## GPU Requirements

Isaac Sim absolutely requires an NVIDIA GPU:

| GPU | VRAM | Recommended For |
|-----|------|-----------------|
| RTX 3060+ | 12 GB | Small scenes, basic RL |
| RTX 4070+ | 12 GB | Medium scenes, RTX lighting |
| RTX 4090 | 24 GB | Large scenes, complex RL |
| A5000+ | 24 GB+ | Production / digital twins |
| H100 | 80 GB | Training at scale |

Without an NVIDIA GPU, use **mujoco-mcp** or **gazebo-mcp** instead.
