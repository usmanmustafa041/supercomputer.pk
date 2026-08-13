param([Parameter(Mandatory=$true)][string]$BackupFile)
$ErrorActionPreference = "Stop"
$resolved = (Resolve-Path -LiteralPath $BackupFile).Path
$container = "sc-restore-test-$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())"
try {
  docker run -d --name $container -e POSTGRES_PASSWORD=restoretest -e POSTGRES_DB=restoretest postgres:17-alpine | Out-Null
  for ($i=0; $i -lt 30; $i++) { docker exec $container pg_isready -U postgres -d restoretest 2>$null | Out-Null; if ($LASTEXITCODE -eq 0) { break }; Start-Sleep -Seconds 1 }
  docker cp $resolved "${container}:/tmp/backup.dump"
  docker exec $container pg_restore -U postgres -d restoretest --clean --if-exists /tmp/backup.dump
  docker exec $container psql -U postgres -d restoretest -tAc "SELECT count(*) FROM schema_migrations; SELECT count(*) FROM products;"
  Write-Host "Restore test passed: $resolved"
} finally { docker rm -f $container 2>$null | Out-Null }
