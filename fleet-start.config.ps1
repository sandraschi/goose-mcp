# Per-repo fleet start config for goose-mcp
# Edit ports/backend target here - start.ps1 is fleet-standard.
@{
    Name         = 'goose-mcp'
    BackendPort  = 10948
    FrontendPort = 10949
    HealthPath   = '/api/health'
    WebRoot      = 'webapp'
    Backend = @{
        Kind          = 'uvicorn'
        UvicornTarget = 'goose_mcp.api:app'
        SyncExtras    = @('dev')
        SyncOnStart  = $true
        Env           = @{ WEB_PORT = '10948' }
    }
    Frontend = @{
        Kind           = 'vite-npm'
        PackageManager = 'npm'
        PortEnvVar     = 'VITE_PORT'
        ApiTargetEnv   = 'VITE_API_TARGET'
    }
}
