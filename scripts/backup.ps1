param([string]$Output = "backups\supercomputers-$(Get-Date -Format yyyyMMdd-HHmmss).sql")
$ErrorActionPreference = "Stop"
$dir = Split-Path -Parent $Output
if ($dir) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
cmd /c "docker compose exec -T db pg_dump -U supercomputers -d supercomputers --format=custom > `"$Output`""
if ($LASTEXITCODE -ne 0) { throw "pg_dump failed with exit code $LASTEXITCODE" }
Write-Output "Created $Output"
