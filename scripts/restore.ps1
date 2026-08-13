param([Parameter(Mandatory=$true)][string]$InputFile)
$ErrorActionPreference = "Stop"
if (!(Test-Path -LiteralPath $InputFile)) { throw "Backup not found: $InputFile" }
Write-Warning "This replaces database contents. Confirm only after verifying the backup file."
cmd /c "docker compose exec -T db pg_restore -U supercomputers -d supercomputers --clean --if-exists --no-owner < `"$InputFile`""
if ($LASTEXITCODE -ne 0) { throw "pg_restore failed with exit code $LASTEXITCODE" }
Write-Output "Restore completed from $InputFile"
