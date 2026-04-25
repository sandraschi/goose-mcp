# goose-mcp

MCP server wrapping the [goose](https://goose-docs.ai) CLI — start sessions, run recipes, inspect providers and extensions. Includes a Vite/React webapp dashboard.

## Ports

| Service | Port |
|---------|------|
| Backend (Starlette + MCP ASGI) | 10948 |
| Frontend (Vite/React) | 10949 |
| MCP HTTP endpoint | `http://localhost:10948/mcp` |

## Quick start

```bat
start.bat
```

See [INSTALL.md](INSTALL.md) for manual steps and troubleshooting.

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
