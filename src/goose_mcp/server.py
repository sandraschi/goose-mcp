"""
FastMCP 3.2 MCP server — tools, prompts, resources, Prefab UI.
"""
from __future__ import annotations

import logging
from fastmcp import FastMCP, Context
from fastmcp.server.lifespan import lifespan
from prefab_ui.app import PrefabApp

from goose_mcp._version import __version__
from goose_mcp.config import get_settings

log = logging.getLogger(__name__)
cfg = get_settings()


@lifespan
async def _startup(_server):
    import os
    os.makedirs(cfg.data_dir, exist_ok=True)
    log.info("goose-mcp startup: data_dir=%s", cfg.data_dir)
    yield {}


mcp = FastMCP(
    name=cfg.server_name,
    version=__version__,
    instructions=(
        "MCP server wrapping the goose CLI. "
        "Start sessions, run recipes, inspect providers and extensions."
    ),
    lifespan=_startup,
)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _runner():
    from goose_mcp import goose_runner
    return goose_runner


def _bin() -> str:
    from goose_mcp.goose_runner import find_goose_bin
    b = find_goose_bin(cfg.goose_bin)
    if not b:
        raise RuntimeError(
            "goose binary not found. Install goose (https://goose-docs.ai) "
            "and ensure it is in PATH, or set GOOSE_BIN env var."
        )
    return b


# ── Tools ──────────────────────────────────────────────────────────────────────

@mcp.tool()
async def goose_version(ctx: Context) -> dict:
    """
    Return goose CLI version and availability status.

    Rationale: Quick sanity-check that goose is installed and on PATH.
    Returns: dict with raw version string and available bool.
    """
    runner = _runner()
    try:
        b = _bin()
    except RuntimeError as exc:
        return {"available": False, "error": str(exc)}
    result = await runner.goose_version(b)
    result["bin_path"] = b
    return result


@mcp.tool()
async def goose_session_start(
    ctx: Context,
    prompt: str,
    provider: str = "",
    model: str = "",
) -> dict:
    """
    Start a goose session with a text prompt.

    Rationale: Launch goose non-interactively with a task. The session runs
    in the background; poll goose_session_status with the returned id.

    Args:
        prompt: The task or question to give goose.
        provider: Optional provider override (e.g. 'ollama', 'openrouter').
        model: Optional model override (e.g. 'qwen3.5:27b').

    Returns: dict with session id, status, pid.
    """
    runner = _runner()
    b = _bin()
    await ctx.info(f"Starting goose session: {prompt[:80]}...")
    rec = await runner.start_session(
        goose_bin=b,
        data_dir=cfg.data_dir,
        prompt=prompt,
        provider=provider or None,
        model=model or None,
    )
    return {"id": rec.id, "status": rec.status, "pid": rec.pid, "started_at": rec.started_at}


@mcp.tool()
async def goose_session_status(ctx: Context, session_id: str) -> dict:
    """
    Get the current status and output of a goose session.

    Args:
        session_id: Session id returned by goose_session_start.

    Returns: dict with status, exit_code, output (last 4k), timestamps.
    """
    runner = _runner()
    rec = runner.get_session(session_id)
    if not rec:
        return {"error": f"Session '{session_id}' not found"}
    d = rec.to_dict()
    d["output"] = (d.get("output") or "")[-4000:]
    return d


@mcp.tool()
async def goose_session_list(ctx: Context, limit: int = 20) -> dict:
    """
    List recent goose sessions with status summary.

    Args:
        limit: Max sessions to return (default 20).

    Returns: dict with list of session summaries.
    """
    runner = _runner()
    sessions = runner.list_sessions(limit)
    return {
        "sessions": [
            {
                "id": s.id,
                "status": s.status,
                "prompt": s.prompt[:80],
                "started_at": s.started_at,
                "ended_at": s.ended_at,
                "exit_code": s.exit_code,
            }
            for s in sessions
        ],
        "count": len(sessions),
    }


@mcp.tool()
async def goose_recipe_run(
    ctx: Context,
    recipe_path: str,
) -> dict:
    """
    Run a goose recipe YAML file.

    Rationale: Recipes are portable YAML workflows — run one by local path.

    Args:
        recipe_path: Absolute path to the recipe .yaml file.

    Returns: dict with session id and status.
    """
    import os
    if not os.path.isfile(recipe_path):
        return {"error": f"Recipe not found: {recipe_path}"}
    runner = _runner()
    b = _bin()
    await ctx.info(f"Running recipe: {recipe_path}")
    rec = await runner.run_recipe(goose_bin=b, data_dir=cfg.data_dir, recipe_path=recipe_path)
    return {"id": rec.id, "status": rec.status, "recipe": recipe_path}


@mcp.tool()
async def goose_providers_list(ctx: Context) -> dict:
    """
    List configured goose providers from the config file.

    Returns: dict with list of provider entries.
    """
    runner = _runner()
    try:
        b = _bin()
    except RuntimeError:
        b = ""
    providers = await runner.list_providers(b)
    return {"providers": providers, "count": len(providers)}


@mcp.tool()
async def goose_extensions_list(ctx: Context) -> dict:
    """
    List active goose extensions from the config file.

    Returns: dict with list of extension entries.
    """
    runner = _runner()
    try:
        b = _bin()
    except RuntimeError:
        b = ""
    extensions = await runner.list_extensions(b)
    return {"extensions": extensions, "count": len(extensions)}


# ── Prefab UI ──────────────────────────────────────────────────────────────────

if cfg.goose_prefab_apps:

    @mcp.tool(app=True)
    async def show_sessions_card(ctx: Context) -> PrefabApp:
        """Show recent goose sessions as a rich Prefab card."""
        from prefab_ui.components import (
            Badge, Card, CardContent, Column, Grid, Heading, Muted, Separator, Text
        )
        runner = _runner()
        sessions = runner.list_sessions(10)

        status_variant = {"running": "warning", "completed": "secondary", "failed": "destructive"}

        with Column(gap=4, css_class="p-4") as view:
            Heading("goose — Recent Sessions")
            Separator()
            if not sessions:
                Muted("No sessions yet. Use goose_session_start to run a task.")
            else:
                for s in sessions:
                    with Card():
                        with CardContent(css_class="pt-3"):
                            with Grid(columns=2, gap=2):
                                Text(s.prompt[:60] + ("…" if len(s.prompt) > 60 else ""))
                                Badge(s.status, variant=status_variant.get(s.status, "secondary"))
                            Muted(f"id:{s.id}  started:{s.started_at[:19]}")

        return PrefabApp(view=view, title="goose Sessions")

    @mcp.tool(app=True)
    async def show_goose_status_card(ctx: Context) -> PrefabApp:
        """Show goose installation status as a Prefab card."""
        from prefab_ui.components import (
            Badge, Card, CardContent, Column, Grid, Heading, Muted, Separator
        )
        runner = _runner()
        try:
            b = _bin()
            info = await runner.goose_version(b)
        except RuntimeError as exc:
            info = {"available": False, "raw": str(exc), "bin_path": "not found"}

        sessions = runner.list_sessions(100)
        running = sum(1 for s in sessions if s.status == "running")
        completed = sum(1 for s in sessions if s.status == "completed")
        failed = sum(1 for s in sessions if s.status == "failed")

        with Column(gap=4, css_class="p-4") as view:
            Heading("goose — Status")
            Separator()
            with Grid(columns=2, gap=3):
                with Card():
                    with CardContent(css_class="pt-4"):
                        Muted("goose Binary")
                        Badge("available" if info.get("available") else "not found",
                              variant="secondary" if info.get("available") else "destructive")
                with Card():
                    with CardContent(css_class="pt-4"):
                        Muted("Version")
                        Muted(info.get("raw", "—")[:40])
            with Grid(columns=3, gap=3):
                for label, val, variant in [
                    ("Running", str(running), "warning"),
                    ("Completed", str(completed), "secondary"),
                    ("Failed", str(failed), "destructive"),
                ]:
                    with Card():
                        with CardContent(css_class="pt-4"):
                            Muted(label)
                            Heading(val)

        return PrefabApp(view=view, title="goose Status")


# ── Prompts ────────────────────────────────────────────────────────────────────

@mcp.prompt()
async def goose_fleet_task_template() -> str:
    """Template prompt for delegating fleet maintenance tasks to goose."""
    return (
        "You are running as a goose agent on Sandra's Goliath Windows machine.\n"
        "Fleet root: D:\\Dev\\repos\n"
        "Use fileops/winops patterns. PowerShell semicolons not &&.\n"
        "Report back with: what you did, what changed, any errors.\n"
        "Task: {task}"
    )


# ── Resources ─────────────────────────────────────────────────────────────────

@mcp.resource("goose://sessions/list")
async def resource_sessions() -> str:
    import json
    runner = _runner()
    sessions = [s.to_dict() for s in runner.list_sessions(50)]
    return json.dumps(sessions, indent=2, default=str)


# ── Entry point ────────────────────────────────────────────────────────────────

def main() -> None:
    import logging as _logging
    _logging.basicConfig(level=getattr(_logging, cfg.log_level.upper(), _logging.INFO))
    mcp.run()


if __name__ == "__main__":
    main()
