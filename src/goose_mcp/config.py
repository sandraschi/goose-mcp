"""
goose-mcp configuration — reads from .env or environment.
"""
from __future__ import annotations
import os
from dataclasses import dataclass, field
from functools import lru_cache
from dotenv import load_dotenv

load_dotenv()


@dataclass
class Settings:
    server_name: str = "goose-mcp"
    log_level: str = "INFO"
    backend_port: int = 10948
    frontend_port: int = 10949

    # Path to goose binary — auto-detected if not set
    goose_bin: str = ""

    # Data dir for session logs
    data_dir: str = ""

    # Prefab UI toggle
    goose_prefab_apps: bool = True

    def __post_init__(self) -> None:
        self.log_level = os.getenv("GOOSE_MCP_LOG_LEVEL", self.log_level)
        self.backend_port = int(os.getenv("GOOSE_MCP_BACKEND_PORT", self.backend_port))
        self.frontend_port = int(os.getenv("GOOSE_MCP_FRONTEND_PORT", self.frontend_port))
        self.goose_bin = os.getenv("GOOSE_BIN", self.goose_bin)
        self.data_dir = os.getenv("GOOSE_MCP_DATA_DIR", self.data_dir) or _default_data_dir()
        prefab_env = os.getenv("GOOSE_PREFAB_APPS", "1")
        self.goose_prefab_apps = prefab_env not in ("0", "false", "False", "no")


def _default_data_dir() -> str:
    here = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    return os.path.join(here, "data")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
