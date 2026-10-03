"""Prefab in-chat cards - @mcp.tool(app=True) with PrefabApp.

Follows the fleet pattern (arxiv-mcp tools/prefab/paper_card.py):
Card/CardHeader/CardTitle/CardDescription/CardContent + Text, Badge,
Separator, Markdown from prefab_ui. Registered via register_prefab_cards(mcp)
with a graceful try/except at the call site so a missing prefab-ui never
breaks server import.
"""

from __future__ import annotations

import logging

from prefab_ui.app import PrefabApp
from prefab_ui.components import (
    Badge,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    Markdown,
    Separator,
    Text,
)

log = logging.getLogger("isaac_mcp.prefab_cards")


def register_prefab_cards(mcp) -> None:
    """Register show_sim_status_card / show_scenes_card / show_jobs_card."""

    @mcp.tool(app=True)
    def show_sim_status_card() -> PrefabApp:
        """SHOW_SIM_STATUS_CARD - Isaac Sim availability, GPUs, depot, jobs as a card.

        ## Return Format
        PrefabApp card rendered inline in the conversation.

        ## Examples
        show_sim_status_card()
        """
        from isaac_mcp.server import sim_status

        s = sim_status()
        available = bool(s.get("isaac_available"))
        version = s.get("isaac_version") or "unknown"
        gpus: list = s.get("gpus") or []

        with Card(css_class="max-w-2xl") as view:
            with CardHeader():
                CardTitle("Isaac Sim status")
                CardDescription(
                    f"Isaac {'available' if available else 'not detected'}"
                    f" ({version}); {s.get('scenes_in_depot', 0)} scene(s),"
                    f" {s.get('active_jobs', 0)} active job(s)"
                )
            with CardContent():
                Badge("Isaac available" if available else "Isaac missing", variant="default")
                Badge(f"{len(gpus)} GPU(s)", variant="secondary")
                Separator(spacing=3)
                if gpus:
                    Text("GPUs", css_class="font-semibold text-sm mb-1")
                    for gpu in gpus[:4]:
                        Text(str(gpu), css_class="text-sm text-muted-foreground")
                    Separator(spacing=3)
                Markdown(
                    f"Scenes in depot: **{s.get('scenes_in_depot', 0)}**"
                    f"  ·  Active jobs: **{s.get('active_jobs', 0)}**"
                )

        return PrefabApp(view=view, title="Isaac Sim status")

    @mcp.tool(app=True)
    def show_scenes_card() -> PrefabApp:
        """SHOW_SCENES_CARD - Scene depot contents as a card.

        ## Return Format
        PrefabApp card rendered inline in the conversation.

        ## Examples
        show_scenes_card()
        """
        from isaac_mcp.server import _load_depot

        depot: dict = _load_depot()

        with Card(css_class="max-w-2xl") as view:
            with CardHeader():
                CardTitle("Scene depot")
                CardDescription(f"{len(depot)} scene(s) loaded")
            with CardContent():
                if not depot:
                    Text(
                        "Depot is empty — load_scene(uri, name) to add one.",
                        css_class="text-sm text-muted-foreground",
                    )
                for name, meta in sorted(depot.items()):
                    Badge(str(meta.get("format", "?")), variant="secondary")
                    Text(f"{name} — {meta.get('size_kb', '?')} KB", css_class="text-sm mb-1")
                    Text(str(meta.get("uri", "")), css_class="text-xs text-muted-foreground mb-2")
                    Separator(spacing=2)

        return PrefabApp(view=view, title="Scene depot")

    @mcp.tool(app=True)
    def show_jobs_card() -> PrefabApp:
        """SHOW_JOBS_CARD - Active and completed simulation jobs as a card.

        ## Return Format
        PrefabApp card rendered inline in the conversation.

        ## Examples
        show_jobs_card()
        """
        from isaac_mcp.server import list_jobs

        jobs = list_jobs()
        active: list = jobs.get("active", [])
        completed: list = jobs.get("completed", [])

        with Card(css_class="max-w-2xl") as view:
            with CardHeader():
                CardTitle("Simulation jobs")
                CardDescription(f"{len(active)} active, {len(completed)} completed")
            with CardContent():
                if active:
                    Text("Active", css_class="font-semibold text-sm mb-1")
                    for job in active:
                        Badge("running", variant="default")
                        Text(
                            f"{job.get('scene_name', '?')} (#{job.get('job_id', '?')})",
                            css_class="text-sm mb-1",
                        )
                    Separator(spacing=3)
                if completed:
                    Text("Completed", css_class="font-semibold text-sm mb-1")
                    for job in completed[:10]:
                        Badge("done", variant="secondary")
                        Text(
                            f"{job.get('scene_name', '?')} (#{job.get('job_id', '?')})",
                            css_class="text-sm mb-1",
                        )
                if not active and not completed:
                    Text(
                        "No jobs yet — start_sim(scene_name) to launch one.",
                        css_class="text-sm text-muted-foreground",
                    )

        return PrefabApp(view=view, title="Simulation jobs")
