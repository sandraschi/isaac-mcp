"""Tests for isaac-mcp server tools."""

from pathlib import Path
from typing import Any

import pytest

from isaac_mcp.server import (
    list_jobs,
    list_scenes,
    sim_status,
)


@pytest.fixture
def empty_depot(tmp_path: Path) -> Any:
    """Patch SCENES_DIR and JOBS_DIR to temp dirs."""
    import isaac_mcp.server as srv

    original_scenes = srv.SCENES_DIR
    original_jobs = srv.JOBS_DIR
    original_depot = srv.DEPOT_FILE

    srv.SCENES_DIR = tmp_path / "scenes"
    srv.JOBS_DIR = tmp_path / "jobs"
    srv.DEPOT_FILE = srv.SCENES_DIR / ".depot" / "registry.json"
    srv.SCENES_DIR.mkdir(parents=True, exist_ok=True)
    srv.JOBS_DIR.mkdir(parents=True, exist_ok=True)
    srv.DEPOT_FILE.parent.mkdir(parents=True, exist_ok=True)

    srv._save_depot({})

    yield

    srv.SCENES_DIR = original_scenes
    srv.JOBS_DIR = original_jobs
    srv.DEPOT_FILE = original_depot


class TestSimStatus:
    def test_sim_status_returns_dict(self):
        result = sim_status()
        assert isinstance(result, dict)
        assert "isaac_available" in result

    def test_sim_status_keys(self):
        result = sim_status()
        expected_keys = {
            "isaac_available",
            "isaac_version",
            "isaac_python",
            "gpus",
            "scenes_dir_exists",
            "scenes_in_depot",
            "active_jobs",
            "jobs_dir_exists",
        }
        assert expected_keys.issubset(result.keys())


class TestListScenes:
    def test_list_scenes_empty(self, empty_depot):
        result = list_scenes()
        assert result["success"] is True
        assert result["count"] == 0
        assert isinstance(result["scenes"], dict)

    def test_list_scenes_success(self, empty_depot):
        result = list_scenes()
        assert result["success"] is True


class TestListJobs:
    def test_list_jobs_empty(self, empty_depot):
        result = list_jobs()
        assert result["success"] is True
        assert result["total"] == 0
        assert isinstance(result["active"], list)
        assert isinstance(result["completed"], list)


class TestLoadScene:
    def test_load_scene_file_not_found(self, empty_depot):
        from isaac_mcp.server import load_scene

        result = load_scene(uri="/nonexistent/file.usd", name="test_scene")
        assert result["success"] is False
        assert "error" in result

    def test_load_scene_success(self, empty_depot, tmp_path):
        from isaac_mcp.server import list_scenes, load_scene

        scene_file = tmp_path / "test.usd"
        scene_file.write_text("#usda 1.0\n()")
        result = load_scene(uri=str(scene_file), name="test_scene")
        assert result["success"] is True
        assert result["name"] == "test_scene"

        scenes = list_scenes()
        assert scenes["count"] == 1
        assert "test_scene" in scenes["scenes"]


class TestSpawnModel:
    def test_spawn_model_no_scene(self, empty_depot):
        from isaac_mcp.server import spawn_model

        result = spawn_model(uri="http://example.com/model.usd", name="bot")
        assert result["success"] is False


class TestStartStopSim:
    def test_start_sim_no_such_scene(self, empty_depot):
        from isaac_mcp.server import start_sim

        result = start_sim(scene_name="nonexistent", headless=True)
        assert result["success"] is False
        assert "error" in result

    def test_stop_sim_unknown_job(self, empty_depot):
        from isaac_mcp.server import stop_sim

        result = stop_sim(job_id="bad_job_id")
        assert result["success"] is False


class TestApplyControl:
    def test_apply_control_unknown_job(self, empty_depot):
        from isaac_mcp.server import apply_control

        result = apply_control(job_id="bad_job_id", ctrl={"joint1": 0.5})
        assert result["success"] is False


class TestGetState:
    def test_get_state_unknown_job(self, empty_depot):
        from isaac_mcp.server import get_state

        result = get_state(job_id="bad_job_id")
        assert result["success"] is False


class TestAiTools:
    @pytest.mark.asyncio
    async def test_agentic_workflow_ollama_fallback(self, empty_depot, monkeypatch):
        from isaac_mcp.server import agentic_sim_workflow

        # Hermetic: force the Ollama fallback to fail regardless of whether a
        # real Ollama is running on this machine (it is on Goliath).
        import httpx

        def _refuse(*args, **kwargs):
            raise httpx.ConnectError("test hermetic: no llm available")

        monkeypatch.setattr(httpx, "post", _refuse)
        result = await agentic_sim_workflow(goal="test", ctx=None)
        assert result["success"] is False
        assert "message" in result

    @pytest.mark.asyncio
    async def test_discover_model_no_llm(self, empty_depot):
        from isaac_mcp.server import discover_model

        result = await discover_model(description="test", ctx=None)
        assert "success" in result

    @pytest.mark.asyncio
    async def test_nl_control_unknown_job(self, empty_depot):
        from isaac_mcp.server import natural_language_control

        result = await natural_language_control(prompt="test", job_id="bad_id", ctx=None)
        assert result["success"] is False

    @pytest.mark.asyncio
    async def test_analyze_state_unknown_job(self, empty_depot):
        from isaac_mcp.server import analyze_sim_state

        result = await analyze_sim_state(job_id="bad_id", ctx=None)
        assert result["success"] is False

    @pytest.mark.asyncio
    async def test_analyze_logs_unknown_job(self, empty_depot):
        from isaac_mcp.server import analyze_sim_logs

        result = await analyze_sim_logs(job_id="bad_id", ctx=None)
        assert result["success"] is True  # No errors = success
