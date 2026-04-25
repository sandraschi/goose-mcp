# goose-mcp — Install Guide

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
| vite | No — local devDep | npm install |
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
