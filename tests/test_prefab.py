"""Tests for isaac-mcp Prefab cards, resource, and prompt."""

import json


class _FakeMCP:
    """Minimal stand-in capturing @mcp.tool(app=True) registrations."""

    def __init__(self):
        self.tools = {}

    def tool(self, *args, **kwargs):
        def deco(fn):
            self.tools[fn.__name__] = fn
            return fn

        return deco


class TestPrefabCards:
    def test_register_three_cards(self):
        from isaac_mcp.prefab_cards import register_prefab_cards

        fake = _FakeMCP()
        register_prefab_cards(fake)
        assert set(fake.tools) == {
            "show_sim_status_card",
            "show_scenes_card",
            "show_jobs_card",
        }

    def test_status_card_renders(self):
        from isaac_mcp.prefab_cards import register_prefab_cards

        fake = _FakeMCP()
        register_prefab_cards(fake)
        card = fake.tools["show_sim_status_card"]()
        assert card.title == "Isaac Sim status"
        assert card.view is not None

    def test_scenes_card_renders(self):
        from isaac_mcp.prefab_cards import register_prefab_cards

        fake = _FakeMCP()
        register_prefab_cards(fake)
        card = fake.tools["show_scenes_card"]()
        assert card.title == "Scene depot"
        assert card.view is not None

    def test_jobs_card_renders(self):
        from isaac_mcp.prefab_cards import register_prefab_cards

        fake = _FakeMCP()
        register_prefab_cards(fake)
        card = fake.tools["show_jobs_card"]()
        assert card.title == "Simulation jobs"
        assert card.view is not None


class TestResourcePrompt:
    def test_depot_resource_is_json(self):
        from isaac_mcp.server import depot_resource

        json.loads(depot_resource())

    def test_quickstart_mentions_goal(self):
        from isaac_mcp.server import sim_quickstart

        text = sim_quickstart("drive the arm")
        assert "drive the arm" in text
        assert "start_sim" in text
