[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$RepoRoot
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Invoke-GitText {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  $previousErrorAction = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $output = & git -C $RepoRoot @Arguments 2>&1
  } finally {
    $ErrorActionPreference = $previousErrorAction
  }

  $text = if ($null -eq $output) {
    ''
  } else {
    (@($output) | ForEach-Object { "$_" }) -join [Environment]::NewLine
  }

  return [pscustomobject]@{
    ExitCode = [int]$LASTEXITCODE
    Text     = $text.Trim()
  }
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw 'Publish blocked: git was not found. Local/remote sync cannot be verified.'
}

$inside = Invoke-GitText @('rev-parse', '--is-inside-work-tree')
if ($inside.ExitCode -ne 0 -or $inside.Text -ne 'true') {
  throw "Publish blocked: '$RepoRoot' is not a git repository."
}

$branchResult = Invoke-GitText @('rev-parse', '--abbrev-ref', 'HEAD')
if ($branchResult.ExitCode -ne 0 -or [string]::IsNullOrWhiteSpace($branchResult.Text)) {
  throw 'Publish blocked: cannot read the current git branch.'
}
$branch = $branchResult.Text
if ($branch -eq 'HEAD') {
  throw 'Publish blocked: detached HEAD. Check out a tracked branch, push it, then publish.'
}

$upstreamResult = Invoke-GitText @(
  'rev-parse'
  '--abbrev-ref'
  '--symbolic-full-name'
  '@{upstream}'
)
if ($upstreamResult.ExitCode -ne 0 -or [string]::IsNullOrWhiteSpace($upstreamResult.Text)) {
  throw "Publish blocked: branch '$branch' has no upstream, so local commits are treated as unpushed. Run: git push -u origin $branch"
}
$upstream = $upstreamResult.Text

Write-Host "=== Check git sync: $branch <-> $upstream ==="
$fetchResult = Invoke-GitText @('fetch', '--prune', '--quiet')
if ($fetchResult.ExitCode -ne 0) {
  $detail = $fetchResult.Text
  if ([string]::IsNullOrWhiteSpace($detail)) {
    $detail = "exit $($fetchResult.ExitCode)"
  }
  throw "Publish blocked: git fetch failed, so remote updates cannot be verified. $detail"
}

$countResult = Invoke-GitText @(
  'rev-list'
  '--left-right'
  '--count'
  'HEAD...@{upstream}'
)
if ($countResult.ExitCode -ne 0 -or [string]::IsNullOrWhiteSpace($countResult.Text)) {
  throw "Publish blocked: cannot compare local and remote commits. $($countResult.Text)"
}

$parts = @($countResult.Text -split '\s+')
if ($parts.Count -lt 2) {
  throw "Publish blocked: cannot parse ahead/behind counts: $($countResult.Text)"
}
$ahead = [int]$parts[0]
$behind = [int]$parts[1]

$reasons = @()
if ($ahead -gt 0) {
  $reasons += "local branch '$branch' is $ahead commit(s) ahead of $upstream (not pushed)"
}
if ($behind -gt 0) {
  $reasons += "remote $upstream is $behind commit(s) ahead of local (not pulled)"
}

if ($reasons.Count -gt 0) {
  $hint = @()
  if ($behind -gt 0) {
    $hint += 'git pull'
  }
  if ($ahead -gt 0) {
    $hint += 'git push'
  }
  throw ("Publish blocked: local and remote are out of sync. {0}. Sync first: {1}" -f ($reasons -join '; '), ($hint -join ' / '))
}

Write-Host "Git sync OK: $branch is even with $upstream"
