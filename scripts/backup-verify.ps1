param([Parameter(Mandatory=$true)][string]$InputFile)
$ErrorActionPreference = "Stop"
if (!(Test-Path -LiteralPath $InputFile)) { throw "Backup not found: $InputFile" }
cmd /c "docker compose exec -T db pg_restore --list < `"$InputFile`"" | Out-Host
if ($LASTEXITCODE -ne 0) { throw "Backup archive could not be read" }
Write-Output "Backup archive is readable: $InputFile"
