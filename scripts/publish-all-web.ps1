[CmdletBinding()]
param(
  [string]$ConfigPath = '',
  [switch]$InstallDeps,
  [switch]$SkipPrebuild,
  [switch]$ForcePrebuild,
  [switch]$SkipConnectivityCheck,
  [ValidateRange(1, 8)]
  [int]$ThrottleLimit = 5
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

try {
  $utf8NoBom = New-Object System.Text.UTF8Encoding $false
  [Console]::OutputEncoding = $utf8NoBom
  $OutputEncoding = $utf8NoBom
} catch {
}

if ([string]::IsNullOrWhiteSpace($ConfigPath)) {
  $ConfigPath = Join-Path $PSScriptRoot 'publish-config.local.json'
}
if ($SkipPrebuild -and $ForcePrebuild) {
  throw 'SkipPrebuild and ForcePrebuild cannot be used together.'
}

function Invoke-ExternalCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath,
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed with exit code ${LASTEXITCODE}: $FilePath"
  }
}

function Start-BrandPublish {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Environment
  )

  $logDir = Join-Path $repoRoot "output\releases\$Environment"
  if (-not (Test-Path -LiteralPath $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
  }

  $stdoutPath = Join-Path $logDir 'publish.stdout.log'
  $stderrPath = Join-Path $logDir 'publish.stderr.log'
  $argumentList = @(
    '-NoLogo'
    '-NoProfile'
    '-ExecutionPolicy'
    'Bypass'
    '-File'
    $publishScriptPath
    '-Environment'
    $Environment
    '-ConfigPath'
    $ConfigPath
    '-Force'
    '-SkipPrebuild'
  )
  if ($SkipConnectivityCheck) {
    $argumentList += '-SkipConnectivityCheck'
  }

  Write-Host "Starting parallel publish: $Environment"
  Write-Host "  log: $stdoutPath"
  $process = Start-Process `
    -FilePath 'powershell.exe' `
    -WorkingDirectory $repoRoot `
    -ArgumentList $argumentList `
    -RedirectStandardOutput $stdoutPath `
    -RedirectStandardError $stderrPath `
    -PassThru `
    -WindowStyle Hidden

  return [pscustomobject]@{
    Environment = $Environment
    Process     = $process
    StdoutPath  = $stdoutPath
    StderrPath  = $stderrPath
    StartedAt   = Get-Date
    EndedAt     = $null
  }
}

function Get-BrandPublishStatus {
  param(
    [Parameter(Mandatory = $true)]
    $Job
  )

  $Job.Process.Refresh()
  $resultFile = Join-Path $repoRoot "output\releases\$($Job.Environment)\publish.result"
  $result = 'MISSING'
  if (Test-Path -LiteralPath $resultFile -PathType Leaf) {
    $result = (Get-Content -LiteralPath $resultFile -Raw).Trim()
  }
  $exitCode = $Job.Process.ExitCode
  if ($null -eq $exitCode) {
    $exitCode = -1
  }

  return [pscustomobject]@{
    Result   = $result
    ExitCode = [int]$exitCode
    Ok       = ($result -eq 'SUCCESS')
  }
}

function Format-Elapsed {
  param(
    [Parameter(Mandatory = $true)]
    [TimeSpan]$Elapsed
  )

  if ($Elapsed.TotalHours -ge 1) {
    return '{0}h {1}m {2}s' -f [int][math]::Floor($Elapsed.TotalHours), $Elapsed.Minutes, $Elapsed.Seconds
  }
  if ($Elapsed.TotalMinutes -ge 1) {
    return '{0}m {1}s' -f [int][math]::Floor($Elapsed.TotalMinutes), $Elapsed.Seconds
  }
  return '{0}s' -f [int][math]::Round($Elapsed.TotalSeconds, 0)
}

# 总耗时 as code points so Windows PowerShell 5.1 does not misread UTF-8 .ps1 files.
function Get-TotalElapsedLabel {
  return -join @([char]0x603B, [char]0x8017, [char]0x65F6)
}

function Write-TailLog {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [int]$Tail = 40
  )

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    return
  }
  $lines = Get-Content -LiteralPath $Path -Tail $Tail -ErrorAction SilentlyContinue
  if ($null -eq $lines) {
    return
  }
  $lines | ForEach-Object { Write-Host $_ }
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$publishScriptPath = Join-Path $PSScriptRoot 'publish-web.ps1'
# hhyy is published by GitHub Actions, not this local batch script.
$environments = @('jht', 'jiayue', 'sjtd', 'longshan', 'demo')

if (-not (Test-Path -LiteralPath $publishScriptPath -PathType Leaf)) {
  throw "Publish script was not found: $publishScriptPath"
}

Push-Location $repoRoot
$scriptStartedAt = Get-Date
try {
  Write-Host ''
  Write-Host '=== Publish all company environments (parallel, Force mode) ==='
  Write-Host "Brands     : $($environments -join ', ')"
  Write-Host "Throttle   : $ThrottleLimit"
  Write-Host 'hhyy is excluded (GitHub Actions auto-publish).'
  Write-Host 'Each brand builds to apps/web-antd/dist-<brand> independently.'

  if ($InstallDeps) {
    Write-Host '=== Install dependencies ==='
    Invoke-ExternalCommand 'pnpm' @('install', '--frozen-lockfile')
  }

  if ($SkipPrebuild) {
    Write-Warning 'Core package prebuild skipped by request.'
  } else {
    Write-Host '=== Shared prebuild core packages (once, Turbo cache enabled) ==='
    $prebuildArguments = @(
      'exec'
      'turbo'
      'run'
      'build'
      '--filter=@vben-core/*'
    )
    if ($ForcePrebuild) {
      $prebuildArguments += '--force'
    }
    Invoke-ExternalCommand 'pnpm' $prebuildArguments
  }

  $pending = New-Object System.Collections.Queue
  foreach ($environment in $environments) {
    $pending.Enqueue($environment)
  }

  $running = @()
  $completed = @()

  while ($pending.Count -gt 0 -or @($running).Count -gt 0) {
    while ($pending.Count -gt 0 -and @($running).Count -lt $ThrottleLimit) {
      $environment = [string]$pending.Dequeue()
      $running += @(Start-BrandPublish -Environment $environment)
    }

    Start-Sleep -Seconds 2
    $stillRunning = @()
    foreach ($job in @($running)) {
      if ($job.Process.HasExited) {
        $job.Process.Refresh()
        $job.EndedAt = Get-Date
        $completed += @($job)
        $status = Get-BrandPublishStatus -Job $job
        $brandElapsed = Format-Elapsed ($job.EndedAt - $job.StartedAt)
        if ($status.Ok) {
          Write-Host "Completed: $($job.Environment) ($brandElapsed)"
        } else {
          Write-Host "FAILED   : $($job.Environment) ($brandElapsed, result=$($status.Result), exit=$($status.ExitCode))"
        }
      } else {
        $stillRunning += @($job)
      }
    }
    $running = $stillRunning
  }

  $totalElapsed = Format-Elapsed ((Get-Date) - $scriptStartedAt)

  Write-Host ''
  Write-Host '=== Parallel publish summary ==='
  $failed = @()
  foreach ($job in $completed) {
    $status = Get-BrandPublishStatus -Job $job
    $label = if ($status.Ok) { 'OK' } else { 'FAILED' }
    $endedAt = $job.EndedAt
    if ($null -eq $endedAt) {
      $endedAt = Get-Date
    }
    $brandElapsed = Format-Elapsed ($endedAt - $job.StartedAt)
    Write-Host ("  {0,-10} {1,-6} {2,-8}  (result={3}, exit {4})" -f $job.Environment, $label, $brandElapsed, $status.Result, $status.ExitCode)
    if (-not $status.Ok) {
      $failed += @($job)
    }
  }
  Write-Host ("  {0,-10} {1}" -f (Get-TotalElapsedLabel), $totalElapsed)

  if (@($failed).Count -gt 0) {
    foreach ($job in $failed) {
      Write-Host ''
      Write-Host "----- $($job.Environment) stdout (tail) -----"
      Write-TailLog -Path $job.StdoutPath
      Write-Host "----- $($job.Environment) stderr (tail) -----"
      Write-TailLog -Path $job.StderrPath
    }
    $failedNames = ($failed | ForEach-Object { $_.Environment }) -join ', '
    throw ("Publishing failed for: {0} ({1} {2})" -f $failedNames, (Get-TotalElapsedLabel), $totalElapsed)
  }

  Write-Host ''
  Write-Host '=== All environments published successfully ==='
  Write-Host ($environments -join ', ')
  Write-Host "$(Get-TotalElapsedLabel): $totalElapsed"
} finally {
  Pop-Location
}
