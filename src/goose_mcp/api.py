"""
Starlette 1.0 REST backend for goose-mcp webapp.
No FastAPI, no Pydantic — plain dicts, dataclasses, lifespan pattern.
"""
from __future__ import annotations

import json
import logging
import os
from contextlib import asynccontextmanager

import uvicorn
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.routing import Mount, Route
from starlette.staticfiles import StaticFiles

from goose_mcp.config import get_settings
from goose_mcp import goose_runner

log = logging.getLogger(__name__)
cfg = get_settings()


# ── Lifespan ───────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app):
    os.makedirs(cfg.data_dir, exist_ok=True)
    log.info("goose-mcp API starting on :%s", cfg.backend_port)
    yield
    log.info("goose-mcp API shutting down")


# ── Route handlers ─────────────────────────────────────────────────────────────

async def health(request: Request) -> JSONResponse:
    return JSONResponse({"status": "ok", "service": "goose-mcp"})


async def capabilities(request: Request) -> JSONResponse:
    """Runtime feature flags consumed by the webapp."""
    goose_bin = goose_runner.find_goose_bin(cfg.goose_bin)
    return JSONResponse({
        "goose_available": goose_bin is not None,
        "goose_bin": goose_bin or "",
        "data_dir": cfg.data_dir,
        "prefab_apps": cfg.goose_prefab_apps,
        "backend_port": cfg.backend_port,
        "frontend_port": cfg.frontend_port,
    })


async def version(request: Request) -> JSONResponse:
    goose_bin = goose_runner.find_goose_bin(cfg.goose_bin)
    if not goose_bin:
        return JSONResponse({"available": False, "error": "goose not found"})
    info = await goose_runner.goose_version(goose_bin)
    info["bin_path"] = goose_bin
    return JSONResponse(info)


async def sessions_list(request: Request) -> JSONResponse:
    limit = int(request.query_params.get("limit", 20))
    sessions = goose_runner.list_sessions(limit)
    return JSONResponse({
        "sessions": [s.to_dict() for s in sessions],
        "count": len(sessions),
    })


async def session_get(request: Request) -> JSONResponse:
    sid = request.path_params["session_id"]
    rec = goose_runner.get_session(sid)
    if not rec:
        return JSONResponse({"error": f"Session '{sid}' not found"}, status_code=404)
    return JSONResponse(rec.to_dict())


async def session_start(request: Request) -> JSONResponse:
    try:
        data = await request.json()
    except Exception:
        return JSONResponse({"error": "invalid JSON body"}, status_code=400)

    prompt = data.get("prompt", "").strip()
    if not prompt:
        return JSONResponse({"error": "prompt is required"}, status_code=400)

    goose_bin = goose_runner.find_goose_bin(cfg.goose_bin)
    if not goose_bin:
        return JSONResponse({"error": "goose binary not found — install goose first"}, status_code=503)

    rec = await goose_runner.start_session(
        goose_bin=goose_bin,
        data_dir=cfg.data_dir,
        prompt=prompt,
        provider=data.get("provider") or None,
        model=data.get("model") or None,
    )
    return JSONResponse({"id": rec.id, "status": rec.status, "pid": rec.pid, "started_at": rec.started_at})


async def recipe_run(request: Request) -> JSONResponse:
    try:
        data = await request.json()
    except Exception:
        return JSONResponse({"error": "invalid JSON body"}, status_code=400)

    recipe_path = data.get("recipe_path", "").strip()
    if not recipe_path:
        return JSONResponse({"error": "recipe_path is required"}, status_code=400)
    if not os.path.isfile(recipe_path):
        return JSONResponse({"error": f"Recipe not found: {recipe_path}"}, status_code=404)

    goose_bin = goose_runner.find_goose_bin(cfg.goose_bin)
    if not goose_bin:
        return JSONResponse({"error": "goose binary not found"}, status_code=503)

    rec = await goose_runner.run_recipe(goose_bin=goose_bin, data_dir=cfg.data_dir, recipe_path=recipe_path)
    return JSONResponse({"id": rec.id, "status": rec.status, "recipe": recipe_path})


async def providers_list(request: Request) -> JSONResponse:
    goose_bin = goose_runner.find_goose_bin(cfg.goose_bin) or ""
    providers = await goose_runner.list_providers(goose_bin)
    return JSONResponse({"providers": providers, "count": len(providers)})


async def extensions_list(request: Request) -> JSONResponse:
    goose_bin = goose_runner.find_goose_bin(cfg.goose_bin) or ""
    extensions = await goose_runner.list_extensions(goose_bin)
    return JSONResponse({"extensions": extensions, "count": len(extensions)})


# ── App ────────────────────────────────────────────────────────────────────────

routes = [
    Route("/api/health",        health),
    Route("/api/capabilities",  capabilities),
    Route("/api/version",       version),
    Route("/api/sessions",      sessions_list,  methods=["GET"]),
    Route("/api/sessions/start",session_start,  methods=["POST"]),
    Route("/api/sessions/{session_id}", session_get, methods=["GET"]),
    Route("/api/recipes/run",   recipe_run,     methods=["POST"]),
    Route("/api/providers",     providers_list, methods=["GET"]),
    Route("/api/extensions",    extensions_list,methods=["GET"]),
]

# Mount MCP ASGI server at /mcp
from goose_mcp.server import mcp as _mcp_server
_mcp_asgi = _mcp_server.http_app(path="/")

app = Starlette(routes=routes, lifespan=lifespan)
app.mount("/mcp", app=_mcp_asgi)

# Serve built frontend if dist/ exists
_dist = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__)))), "dist")
if os.path.isdir(_dist):
    app.mount("/", StaticFiles(directory=_dist, html=True), name="spa")


def main() -> None:
    logging.basicConfig(level=getattr(logging, cfg.log_level.upper(), logging.INFO))
    uvicorn.run(
        "goose_mcp.api:app",
        host="0.0.0.0",
        port=cfg.backend_port,
        log_level=cfg.log_level.lower(),
        reload=False,
    )


if __name__ == "__main__":
    main()
