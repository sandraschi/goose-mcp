param([switch]$NoBrowser)

$BackendPort  = 10948
$FrontendPort = 10949
$RepoRoot     = $PSScriptRoot
$WebRoot      = Join-Path $RepoRoot "webapp"

Write-Host ""
Write-Host "goose-mcp - Setup and Start" -ForegroundColor Cyan
Write-Host "Backend  :$BackendPort   Frontend  :$FrontendPort" -ForegroundColor DarkGray
Write-Host ""

# ===========================================================================
# FUNCTION: require a command, install via winget if missing
# ===========================================================================
function Require-Command {
    param([string]$Cmd, [string]$WingetId, [string]$Label)
    if (Get-Command $Cmd -ErrorAction SilentlyContinue) {
        Write-Host "  [ok] $Label" -ForegroundColor DarkGreen
        return
    }
    Write-Host "  [--] $Label not found - installing via winget ..." -ForegroundColor Yellow

    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if (-not $winget) {
        $candidates = @(
            "$env:LOCALAPPDATA\Microsoft\WindowsApps\winget.exe",
            "$env:PROGRAMFILES\WindowsApps\Microsoft.DesktopAppInstaller_*\winget.exe"
        )
        foreach ($c in $candidates) {
            $found = Get-Item $c -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($found) { $winget = $found.FullName; break }
        }
    } else {
        $winget = $winget.Source
    }

    if (-not $winget) {
        Write-Host "ERROR: winget not found. Install $Label manually (id: $WingetId)" -ForegroundColor Red
        exit 1
    }

    & $winget install --id $WingetId --silent --accept-source-agreements --accept-package-agreements
    $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" +
                [System.Environment]::GetEnvironmentVariable("PATH","User")
    if (-not (Get-Command $Cmd -ErrorAction SilentlyContinue)) {
        Write-Host "ERROR: $Label installed but '$Cmd' still not in PATH." -ForegroundColor Red
        Write-Host "Close this window, reopen PowerShell, and run start.bat again." -ForegroundColor Yellow
        exit 1
    }
    Write-Host "  [ok] $Label installed" -ForegroundColor Green
}

function Get-NpmCmdPath {
    $nodeApp = Get-Command node -CommandType Application -ErrorAction SilentlyContinue |
        Select-Object -First 1
    $nodeSrc = if ($nodeApp -and $nodeApp.Source -and ($nodeApp.Source -ne '')) { $nodeApp.Source } else { $null }
    if (-not $nodeSrc) {
        $nodeSrc = [string](where.exe node 2>$null | Select-Object -First 1)
    }
    if ($nodeSrc -and ($nodeSrc -ne '')) {
        $nodeDir = Split-Path -Path ([string]$nodeSrc) -Parent
        $cmd = Join-Path $nodeDir "npm.cmd"
        if (Test-Path -LiteralPath $cmd) { return $cmd }
    }
    $npmApp = Get-Command npm -CommandType Application -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if ($npmApp -and $npmApp.Source -and ($npmApp.Source -ne '')) { return $npmApp.Source }
    $npmWhere = [string](where.exe npm 2>$null | Select-Object -First 1)
    if ($npmWhere) { return $npmWhere }
    return $null
}

# ===========================================================================
# STEP 1 - Prerequisites
# ===========================================================================
Write-Host "[1/5] Checking prerequisites ..." -ForegroundColor Cyan

Require-Command "uv"   "Astral.uv"         "uv (Python package manager)"
Require-Command "node" "OpenJS.NodeJS.LTS"  "Node.js LTS"
Require-Command "npm"  "OpenJS.NodeJS.LTS"  "npm"
Require-Command "just" "Casey.Just"         "just (command runner)"

# ===========================================================================
# STEP 2 - Python deps
# ===========================================================================
Write-Host "[2/5] Syncing Python deps (uv sync) ..." -ForegroundColor Cyan
Write-Host "      (first run: uv may download Python 3.11 -- ~30s)" -ForegroundColor DarkGray

$uvExe = (Get-Command uv).Source
& $uvExe sync --project $RepoRoot
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: uv sync failed." -ForegroundColor Red
    exit 1
}
Write-Host "  [ok] Python deps ready" -ForegroundColor DarkGreen

# Import smoke-test
Write-Host "  Smoke-testing import ..." -ForegroundColor DarkGray
& $uvExe run --project $RepoRoot python -c "import goose_mcp.api; print('  [ok] Import OK')"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: import check failed -- see output above." -ForegroundColor Red
    exit 1
}

# ===========================================================================
# STEP 3 - Frontend deps
# ===========================================================================
Write-Host "[3/5] Syncing frontend deps (npm install) ..." -ForegroundColor Cyan

$npmCmd = Get-NpmCmdPath
if (-not $npmCmd) {
    Write-Host "ERROR: Could not resolve npm." -ForegroundColor Red
    exit 1
}
if (-not (Test-Path (Join-Path $WebRoot "node_modules"))) {
    Push-Location $WebRoot
    & $npmCmd install --prefer-offline
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: npm install failed." -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Pop-Location
    Write-Host "  [ok] node_modules installed" -ForegroundColor DarkGreen
} else {
    Write-Host "  [ok] node_modules present (skipping)" -ForegroundColor DarkGreen
}

$viteLocal = Join-Path $WebRoot "node_modules\.bin\vite"
if (-not (Test-Path $viteLocal)) {
    Write-Host "ERROR: vite missing after npm install." -ForegroundColor Red
    Write-Host "Delete '$WebRoot\node_modules' and re-run." -ForegroundColor Yellow
    exit 1
}
Write-Host "  [ok] vite present" -ForegroundColor DarkGreen

# ===========================================================================
# STEP 4 - Clear ports
# ===========================================================================
Write-Host "[4/5] Clearing ports $BackendPort / $FrontendPort ..." -ForegroundColor Cyan
foreach ($port in @($BackendPort, $FrontendPort)) {
    $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    foreach ($conn in $conns) {
        try {
            Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
            Write-Host "  Killed PID $($conn.OwningProcess) on :$port" -ForegroundColor Yellow
        } catch {}
    }
}
Start-Sleep -Milliseconds 500

# ===========================================================================
# STEP 5 - Start services
# ===========================================================================
Write-Host "[5/5] Starting services ..." -ForegroundColor Cyan

$backendLog = Join-Path $RepoRoot "backend.log"

$backendCmd = "& '$uvExe' run --project '$RepoRoot' python -m goose_mcp.api *> '$backendLog'"
$backendProc = Start-Process -FilePath "powershell.exe" `
    -ArgumentList "-NoProfile", "-Command", $backendCmd `
    -WorkingDirectory $RepoRoot `
    -PassThru
Write-Host "  Backend PID $($backendProc.Id) on :$BackendPort  (log: $backendLog)"

$maxWait = 90
$waited  = 0
$ready   = $false
Write-Host "  Waiting for backend health (max ${maxWait}s) ..." -ForegroundColor DarkCyan
while ($waited -lt $maxWait) {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:$BackendPort/api/health" `
            -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        if ($r.StatusCode -eq 200) { $ready = $true; break }
    } catch {}
    Start-Sleep -Seconds 1
    $waited++
    if (($waited % 15) -eq 0) { Write-Host "    ... $waited s" -ForegroundColor DarkGray }
}

if (-not $ready) {
    Write-Host "ERROR: backend did not start after ${maxWait}s." -ForegroundColor Red
    Write-Host "Last lines from backend.log:" -ForegroundColor Yellow
    if (Test-Path $backendLog) { Get-Content $backendLog -Tail 30 }
    Write-Host "Run directly:" -ForegroundColor Yellow
    Write-Host "  cd $RepoRoot; $uvExe run python -m goose_mcp.api" -ForegroundColor Yellow
    exit 1
}
Write-Host "  [ok] Backend healthy after ${waited}s" -ForegroundColor Green

if (-not $NoBrowser) {
    $url = "http://localhost:$FrontendPort"
    $poll = "for (`$i=0;`$i -lt 60;`$i++) { try { `$null=Invoke-WebRequest -Uri '$url' -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop; Start-Process '$url'; exit } catch { Start-Sleep 1 } }"
    Start-Process "powershell.exe" -ArgumentList "-NoProfile","-WindowStyle","Hidden","-Command",$poll
    Write-Host "  Browser will open when Vite is ready" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "Running:" -ForegroundColor Cyan
Write-Host "  Backend   http://localhost:$BackendPort"
Write-Host "  Frontend  http://localhost:$FrontendPort"
Write-Host "  MCP HTTP  http://localhost:$BackendPort/mcp"
Write-Host ""
Write-Host "Press Ctrl+C to stop (blocks on Vite)." -ForegroundColor DarkGray

Set-Location $WebRoot
npm run dev -- --host 127.0.0.1 --port $FrontendPort --strictPort
