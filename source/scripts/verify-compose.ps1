$ErrorActionPreference = 'Stop'
Push-Location (Split-Path $PSScriptRoot -Parent)
try {
    docker compose config --quiet
    if ($LASTEXITCODE -ne 0) { throw 'Compose configuration failed' }
    docker compose up -d
    if ($LASTEXITCODE -ne 0) { throw 'Compose startup failed' }
    npm.cmd run smoke
    if ($LASTEXITCODE -ne 0) { throw 'Smoke test failed' }
    docker compose exec -T identity-service node scripts/event-integration.js
    if ($LASTEXITCODE -ne 0) { throw 'Event integration test failed' }
    docker compose ps -a
} finally { Pop-Location }
