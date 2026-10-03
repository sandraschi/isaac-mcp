# Per-repo fleet start config for isaac-mcp
# Edit ports/backend target here - start.ps1 is fleet-standard.
@{
    Name         = 'isaac-mcp'
    BackendPort  = 11049
    FrontendPort = 11048
    HealthPath   = '/health'
    WebRoot      = 'web_sota'
    Backend = @{
        Kind          = 'uvicorn-web-app'
        UvicornTarget = 'web_sota.backend.server:app'
        WorkDir       = '.'
        SyncExtras    = @('dev')
        SyncOnStart  = $true
        Env           = @{ WEB_PORT = '11049' }
    }
    Frontend = @{
        Kind           = 'vite-npm'
        PackageManager = 'npm'
        PortEnvVar     = 'VITE_PORT'
        ApiTargetEnv   = 'VITE_API_TARGET'
    }
}
