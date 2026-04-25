"""
goose CLI wrapper — subprocess management, binary detection, session tracking.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import platform
import shutil
import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Optional

log = logging.getLogger(__name__)


@dataclass
class SessionRecord:
    id: str
    status: str          # running | completed | failed
    prompt: str
    recipe: Optional[str]
    provider: Optional[str]
    model: Optional[str]
    started_at: str
    ended_at: Optional[str] = None
    output: str = ""
    exit_code: Optional[int] = None
    pid: Optional[int] = None

    def to_dict(self) -> dict:
        return asdict(self)


# In-memory session store (keyed by session id)
_sessions: dict[str, SessionRecord] = {}
# Running subprocess handles
_procs: dict[str, asyncio.subprocess.Process] = {}


def find_goose_bin(override: str = "") -> Optional[str]:
    """Locate the goose binary. Returns None if not found."""
    if override:
        if os.path.isfile(override):
            return override
        log.warning("GOOSE_BIN override '%s' not found", override)

    # Common install locations
    candidates = [
        # Windows: goose installs to %USERPROFILE%\.local\bin
        os.path.expandvars(r"%USERPROFILE%\.local\bin\goose.exe"),
        os.path.expandvars(r"%USERPROFILE%\.local\bin\goose"),
        # Fallback: PATH lookup
    ]

    for c in candidates:
        if os.path.isfile(c):
            return c

    # Try PATH
    found = shutil.which("goose") or shutil.which("goose.exe")
    return found


async def goose_version(goose_bin: str) -> dict:
    """Run `goose --version` and return parsed info."""
    try:
        proc = await asyncio.create_subprocess_exec(
            goose_bin, "--version",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=10)
        raw = (stdout or stderr).decode("utf-8", errors="replace").strip()
        return {"raw": raw, "available": proc.returncode == 0}
    except Exception as exc:
        return {"raw": str(exc), "available": False}


async def list_providers(goose_bin: str) -> list[dict]:
    """Run `goose configure --list-providers` or parse config file."""
    # goose doesn't have a --list-providers flag yet; read config file instead
    config_path = _goose_config_path()
    providers = []
    if config_path and os.path.isfile(config_path):
        try:
            import re
            with open(config_path, "r", encoding="utf-8") as f:
                raw = f.read()
            # YAML-ish parse: look for provider: lines
            for m in re.finditer(r"provider:\s*(\S+)", raw):
                providers.append({"name": m.group(1)})
            if not providers:
                providers.append({"name": "unknown", "config_path": config_path, "note": "config found but no provider lines parsed"})
        except Exception as exc:
            providers.append({"error": str(exc)})
    else:
        providers.append({"note": "no config file found", "searched": config_path or "unknown"})
    return providers


async def list_extensions(goose_bin: str) -> list[dict]:
    """Return known extensions from goose config."""
    config_path = _goose_config_path()
    extensions = []
    if config_path and os.path.isfile(config_path):
        try:
            import re
            with open(config_path, "r", encoding="utf-8") as f:
                raw = f.read()
            for m in re.finditer(r"name:\s*(\S+)", raw):
                extensions.append({"name": m.group(1)})
        except Exception as exc:
            extensions.append({"error": str(exc)})
    return extensions


async def start_session(
    goose_bin: str,
    data_dir: str,
    prompt: str,
    provider: Optional[str] = None,
    model: Optional[str] = None,
    recipe_path: Optional[str] = None,
) -> SessionRecord:
    """Spawn `goose run` with the given prompt or recipe."""
    session_id = str(uuid.uuid4())[:8]
    now = datetime.now(timezone.utc).isoformat()

    args = [goose_bin, "run"]
    if provider:
        args += ["--provider", provider]
    if model:
        args += ["--model", model]
    if recipe_path:
        args += ["--recipe", recipe_path]
    else:
        args += ["--text", prompt]

    log_path = os.path.join(data_dir, f"session-{session_id}.log")
    os.makedirs(data_dir, exist_ok=True)

    rec = SessionRecord(
        id=session_id,
        status="running",
        prompt=prompt,
        recipe=recipe_path,
        provider=provider,
        model=model,
        started_at=now,
    )
    _sessions[session_id] = rec

    try:
        log_file = open(log_path, "w", encoding="utf-8")
        proc = await asyncio.create_subprocess_exec(
            *args,
            stdout=log_file,
            stderr=asyncio.subprocess.STDOUT,
        )
        rec.pid = proc.pid
        _procs[session_id] = proc
        log.info("Session %s started, PID %s", session_id, proc.pid)

        # Background task to wait for completion
        asyncio.create_task(_watch_session(session_id, proc, log_path, log_file))
    except Exception as exc:
        rec.status = "failed"
        rec.output = str(exc)
        rec.ended_at = datetime.now(timezone.utc).isoformat()
        log.error("Session %s failed to start: %s", session_id, exc)

    return rec


async def _watch_session(
    session_id: str,
    proc: asyncio.subprocess.Process,
    log_path: str,
    log_file,
) -> None:
    try:
        await proc.wait()
        log_file.close()
        rec = _sessions.get(session_id)
        if rec:
            rec.exit_code = proc.returncode
            rec.status = "completed" if proc.returncode == 0 else "failed"
            rec.ended_at = datetime.now(timezone.utc).isoformat()
            if os.path.isfile(log_path):
                with open(log_path, "r", encoding="utf-8", errors="replace") as f:
                    rec.output = f.read()[-8000:]  # keep last 8k chars
        _procs.pop(session_id, None)
        log.info("Session %s finished (exit %s)", session_id, proc.returncode)
    except Exception as exc:
        log.error("Session watcher error for %s: %s", session_id, exc)


def get_session(session_id: str) -> Optional[SessionRecord]:
    return _sessions.get(session_id)


def list_sessions(limit: int = 20) -> list[SessionRecord]:
    all_s = sorted(_sessions.values(), key=lambda s: s.started_at, reverse=True)
    return all_s[:limit]


async def run_recipe(goose_bin: str, data_dir: str, recipe_path: str, params: dict | None = None) -> SessionRecord:
    """Run a goose recipe YAML by path."""
    return await start_session(
        goose_bin=goose_bin,
        data_dir=data_dir,
        prompt=f"recipe:{recipe_path}",
        recipe_path=recipe_path,
    )


def _goose_config_path() -> Optional[str]:
    """Return path to goose config file."""
    # goose stores config in ~/.config/goose/config.yaml
    home = os.path.expanduser("~")
    candidates = [
        os.path.join(home, ".config", "goose", "config.yaml"),
        os.path.join(home, "AppData", "Roaming", "goose", "config.yaml"),
    ]
    for c in candidates:
        if os.path.isfile(c):
            return c
    return candidates[0]  # return primary candidate even if not yet created
