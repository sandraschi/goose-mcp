# goose-mcp

<p align="center">
  <a href="https://github.com/casey/just"><img src="https://img.shields.io/badge/just-ready_to_go-7c5cfc?style=flat-square&logo=just&logoColor=white" alt="Just"></a>
  <a href="https://github.com/astral-sh/ruff"><img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/astral-sh/ruff/main/assets/badge/v2.json" alt="Ruff"></a>
  <a href="https://python.org"><img src="https://img.shields.io/badge/Python-3.13+-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python"></a>
  <a href="https://biomejs.dev"><img src="https://img.shields.io/badge/Linted_with-Biome-60a5fa?style=flat-square&logo=biome&logoColor=white" alt="Biome"></a>
  <a href="https://github.com/PrefectHQ/fastmcp"><img src="https://img.shields.io/badge/FastMCP-3.2-7c5cfc?style=flat-square" alt="FastMCP"></a>
</p>


> 📖 **[Installation Guide](INSTALL.md)** — quick start, manual setup, and troubleshooting

MCP server wrapping the [goose](https://goose-docs.ai) CLI — start sessions, run recipes, inspect providers and extensions. Includes a Vite/React webapp dashboard.

## Quick Start

```powershell
git clone https://github.com/sandraschi/goose-mcp
cd goose-mcp
just
```

This opens an interactive dashboard showing all available commands. Run `just bootstrap` to install dependencies, then `just serve` or `just dev` to start.

### Manual Setup

If you don't have `just` installed:

## Tools

| Tool | Description |
|------|-------------|
| `goose_version` | Check goose binary version |
| `goose_session_start` | Start a session with a prompt |
| `goose_session_status` | Poll session output |
| `goose_session_list` | List recent sessions |
| `goose_recipe_run` | Run a YAML recipe file |
| `goose_providers_list` | List configured providers |
| `goose_extensions_list` | List active extensions |
| `show_sessions_card` | Prefab UI: session list card |
| `show_goose_status_card` | Prefab UI: status summary card |

## Claude Desktop config

```json
{
  "mcpServers": {
    "goose-mcp": {
      "command": "C:\\Users\\sandr\\.local\\bin\\uv.exe",
      "args": ["run", "--project", "D:\\Dev\\repos\\goose-mcp", "python", "-m", "goose_mcp.server"]
    }
  }
}
```

## Environment

Copy `.env.example` to `.env` and set `GOOSE_BIN` if goose is not on PATH.

## Stack

- FastMCP 3.2 — dual transport (stdio + ASGI `/mcp`)
- Starlette 1.0, no Pydantic
- Vite + React + TailwindCSS + Framer Motion + Zustand
- prefab-ui for Prefab UI cards
