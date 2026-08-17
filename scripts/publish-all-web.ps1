[CmdletBinding()]
param(
  [string]$ConfigPath = '',
  [switch]$InstallDeps,
  [switch]$SkipConnectivityCheck
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if ([string]::IsNullOrWhiteSpace($ConfigPath)) {
  $ConfigPath = Join-Path $PSScriptRoot 'publish-config.local.json'
}

$publishScriptPath = Join-Path $PSScriptRoot 'publish-web.ps1'
$environments = @('jht', 'jiayue', 'sjtd', 'longshan', 'demo')

if (-not (Test-Path -LiteralPath $publishScriptPath -PathType Leaf)) {
  throw "Publish script was not found: $publishScriptPath"
}

Write-Host ''
Write-Host '=== Publish all company environments (Force mode) ==='
Write-Host "Order: $($environments -join ' -> ')"
Write-Host 'WhatIf and confirmation prompts are skipped.'

for ($index = 0; $index -lt $environments.Count; $index++) {
  $environment = $environments[$index]
  Write-Host ''
  Write-Host "============================================================"
  Write-Host "[$($index + 1)/$($environments.Count)] Publishing: $environment"
  Write-Host "============================================================"

  $arguments = @(
    '-NoLogo'
    '-NoProfile'
    '-ExecutionPolicy'
    'Bypass'
    '-File'
    $publishScriptPath
    '-Environment'
    $environment
    '-ConfigPath'
    $ConfigPath
    '-Force'
  )

  if ($InstallDeps -and $index -eq 0) {
    $arguments += '-InstallDeps'
  }
  if ($SkipConnectivityCheck) {
    $arguments += '-SkipConnectivityCheck'
  }

  & powershell.exe @arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Publishing '$environment' failed with exit code $LASTEXITCODE. Remaining environments were not published."
  }
}

Write-Host ''
Write-Host '=== All environments published successfully ==='
Write-Host ($environments -join ', ')
