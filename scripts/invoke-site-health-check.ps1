[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$RepoRoot,
  [string]$Name = '',
  [int]$SettleSeconds = 6
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$checkScript = Join-Path $PSScriptRoot 'check-sites.ps1'
if (-not (Test-Path -LiteralPath $checkScript -PathType Leaf)) {
  throw "Site health check script was not found: $checkScript"
}

if ($SettleSeconds -gt 0) {
  Write-Host "Wait ${SettleSeconds}s for IIS AppOffline to clear..."
  Start-Sleep -Seconds $SettleSeconds
}

Write-Host '=== Site health check (title + _app.config.js API) ==='
$arguments = @(
  '-NoProfile'
  '-ExecutionPolicy'
  'Bypass'
  '-File'
  $checkScript
)
if (-not [string]::IsNullOrWhiteSpace($Name)) {
  $arguments += @('-Name', $Name)
}

& powershell.exe @arguments
if ($LASTEXITCODE -ne 0) {
  throw "Site health check failed (exit $LASTEXITCODE). The published site title or API does not match sites.json."
}
