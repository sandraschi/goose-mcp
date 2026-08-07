# Installation

## 🚀 Quick Start (recommended)

```powershell
# Install just if you don't have it
winget install Casey.Just    # Windows
# scoop install just          # Windows (alternative)
# brew install just           # macOS
# sudo apt install just       # Debian/Ubuntu
# cargo install just          # Linux (Rust)

git clone https://github.com/sandraschi/goose-mcp
cd goose-mcp
just
```

The interactive recipe dashboard opens in your browser. From there:

```powershell
just bootstrap   # install all dependencies
just serve       # start the server
just web         # start the frontend (if applicable)
```

> **Why not `pip install`?** MCP servers bundle webapps, configs, project scaffolding, and tooling that a flat Python package can't deliver. PyPI offers no safety advantage — it doesn't audit packages either. `just` gives you the complete, ready-to-run stack.

---

## 🐌 Traditional Setup

If you prefer not to use `just`:

1. Install [Python 3.13+](https://python.org) and [uv](https://docs.astral.sh/uv/)
2. Clone and enter the repo:
   ```powershell
   git clone https://github.com/sandraschi/goose-mcp
   cd goose-mcp
   ```
3. Install dependencies:
   ```powershell
   uv sync --all-extras
   ```
4. Start the server:
   ```powershell
   # stdio mode (for MCP clients like Claude Desktop)
   uv run python -m goose_mcp.server

   # HTTP mode (for web dashboard)
   uv run uvicorn goose_mcp.server:app --port 10948
   ```

4. (optional) Start the frontend:
   ```powershell
   cd webapp
   npm install
   npm run dev
   ```

5. Open `http://localhost:10948` or the frontend URL.

---

## ❓ Troubleshooting

| Issue | Fix |
|---|---|
| `just` not found | Install via `winget install Casey.Just`, `scoop install just`, or `brew install just` |
| Port conflict | Run `just kill-all` to clear fleet ports (10700–11000) |
| Dependencies out of sync | `uv sync --all-extras` |
| Something else | [Open a GitHub issue](https://github.com/sandraschi/goose-mcp/issues) |

---

*See the main [README](README.md) for feature overview and documentation.

---

## Legacy Documentation

_This INSTALL.md was updated with the standard fleet Quick Start template. The original instructions are preserved below._

# goose-mcp ÔÇö Install Guide

## Quick start (two commands)

```bat
git clone https://github.com/sandraschi/goose-mcp.git D:\Dev\repos\goose-mcp
D:\Dev\repos\goose-mcp\start.bat
```

`start.bat` auto-installs `uv`, `Node.js`, and `just` via winget if missing.

## Manual steps (if start.bat fails)

1. Install [uv](https://docs.astral.sh/uv/): `winget install Astral.uv`
2. Install [Node.js LTS](https://nodejs.org/): `winget install OpenJS.NodeJS.LTS`
3. Install Python deps: `uv sync` (from repo root)
4. Install frontend deps: `cd webapp && npm install`
5. Start backend: `uv run python -m goose_mcp.api`
6. Start frontend: `cd webapp && npm run dev`

## Requirements

| Tool | Required globally? | How installed |
|------|--------------------|---------------|
| uv | Yes | winget / start.bat |
| Node.js | Yes | winget / start.bat |
| vite | No ÔÇö local devDep | npm install |
| goose | Yes | https://goose-docs.ai |

## goose not found?

If the backend starts but reports `goose binary not found`:

1. Install goose: download from https://goose-docs.ai/docs/getting-started/installation
2. Or set `GOOSE_BIN` in `.env`: `GOOSE_BIN=C:\Users\sandr\.local\bin\goose.exe`

## Ports in use?

The start script clears 10948/10949 automatically. If you hit conflicts:

```powershell
Get-NetTCPConnection -LocalPort 10948 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
Get-NetTCPConnection -LocalPort 10949 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```
