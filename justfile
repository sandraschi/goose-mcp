# goose-mcp justfile
set windows-shell := ["powershell.exe", "-NoProfile", "-Command"]

UV   := "C:\\Users\\sandr\\.local\\bin\\uv.exe"
REPO := "D:\\Dev\\repos\\goose-mcp"

# Install all deps
install:
    & "{{UV}}" sync
    Set-Location "{{REPO}}\\webapp"; npm install

# Start Starlette backend only
backend:
    Set-Location "{{REPO}}"; & "{{UV}}" run python -m goose_mcp.api

# Start MCP stdio server only (for Claude Desktop testing)
mcp:
    Set-Location "{{REPO}}"; & "{{UV}}" run python -m goose_mcp.server

# Start Vite frontend only
frontend:
    Set-Location "{{REPO}}\\webapp"; npm run dev

# Start everything
start:
    Set-Location "{{REPO}}"; .\\start.bat

# Import smoke-test
check:
    & "{{UV}}" run python -c "import goose_mcp.api; print('Import OK')"

# Lint
lint:
    & "{{UV}}" run ruff check src/

# Format
fmt:
    & "{{UV}}" run ruff format src/

# Type check (non-blocking)
typecheck:
    & "{{UV}}" run ty check src/ --ignore-errors

# Build .mcpb bundle
pack:
    New-Item -ItemType Directory -Force -Path "{{REPO}}\\dist" | Out-Null
    mcpb pack "{{REPO}}" "{{REPO}}\\dist\\goose-mcp-v0.1.0.mcpb"
    Write-Host "Bundle: {{REPO}}\\dist\\goose-mcp-v0.1.0.mcpb"
