[CmdletBinding()]
param(
  [switch]$InstallDeps,
  [switch]$SkipBuild,
  [switch]$WhatIfOnly,
  [switch]$SkipConnectivityCheck,
  [switch]$Force,
  [string]$ServerIp = $env:IIS_JHT_SERVER_IP,
  [string]$Endpoint = $env:IIS_JHT_MSDEPLOY_ENDPOINT,
  [string]$SiteName = $env:IIS_JHT_SITE_NAME,
  [string]$UserName = $env:IIS_JHT_USER,
  [string]$Password = $env:IIS_JHT_PWD,
  [string]$MsDeployPath = 'C:\Program Files\IIS\Microsoft Web Deploy V3\msdeploy.exe',
  [string]$PackagePath = (Join-Path $env:TEMP 'web-antd-dist-jht.zip')
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Invoke-ExternalCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath,
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Arguments
  )

  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed with exit code ${LASTEXITCODE}: $FilePath"
  }
}

function Get-RequiredValue {
  param(
    [string]$Value,
    [string]$Name
  )

  if ([string]::IsNullOrWhiteSpace($Value)) {
    throw "Missing $Name. Set the matching parameter or environment variable."
  }
  return $Value
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$distPath = Join-Path $repoRoot 'apps\web-antd\dist'
$brandEnvPath = Join-Path $repoRoot 'apps\web-antd\.env.jht'
$appConfigPath = Join-Path $distPath '_app.config.js'

Push-Location $repoRoot
try {
  Write-Host '=== JHT local build and IIS deployment ==='
  Write-Host "Repository: $repoRoot"

  if (-not $SkipBuild) {
    if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
      throw 'pnpm was not found. Install the version required by this repository.'
    }
    if ($InstallDeps) {
      Write-Host '=== Install dependencies ==='
      Invoke-ExternalCommand 'pnpm' 'install' '--frozen-lockfile'
    }
    Write-Host '=== Build with jht mode ==='
    Invoke-ExternalCommand 'pnpm' 'run' 'build:antd:jht'
  } else {
    Write-Warning 'Build skipped. The existing dist directory will be deployed.'
  }

  if (-not (Test-Path (Join-Path $distPath 'index.html'))) {
    throw "Build artifact not found: $distPath\index.html"
  }
  if (-not (Test-Path $appConfigPath)) {
    throw "Runtime config not found: $appConfigPath"
  }

  $brandEnv = Get-Content $brandEnvPath
  $apiLine = $brandEnv | Where-Object { $_ -match '^\s*VITE_GLOB_API_URL=' } | Select-Object -First 1
  if (-not $apiLine) {
    throw 'VITE_GLOB_API_URL is missing from .env.jht.'
  }
  $expectedApi = ($apiLine -split '=', 2)[1].Trim()
  $appConfig = Get-Content $appConfigPath -Raw
  if (-not $appConfig.Contains($expectedApi)) {
    throw "Artifact API validation failed. _app.config.js does not contain $expectedApi"
  }

  $files = @(Get-ChildItem $distPath -Recurse -File)
  $indexHash = (Get-FileHash (Join-Path $distPath 'index.html') -Algorithm SHA256).Hash
  Write-Host ("Artifact file count: {0}" -f $files.Count)
  Write-Host "JHT API: $expectedApi"
  Write-Host "index.html SHA256: $indexHash"

  if (-not (Test-Path $MsDeployPath)) {
    throw "MSDeploy was not found: $MsDeployPath"
  }
  $packageDirectory = Split-Path $PackagePath -Parent
  if (-not (Test-Path $packageDirectory)) {
    New-Item -ItemType Directory -Path $packageDirectory -Force | Out-Null
  }
  if (Test-Path $PackagePath) {
    Remove-Item $PackagePath -Force
  }

  Write-Host '=== Create MSDeploy package ==='
  Invoke-ExternalCommand $MsDeployPath `
    '-verb:sync' `
    "-source:contentPath=$distPath" `
    "-dest:package=$PackagePath"

  if (-not (Test-Path $PackagePath)) {
    throw "MSDeploy package was not created: $PackagePath"
  }
  $package = Get-Item $PackagePath
  $packageHash = (Get-FileHash $PackagePath -Algorithm SHA256).Hash
  Write-Host ("Package: {0} ({1:N2} MB)" -f $PackagePath, ($package.Length / 1MB))
  Write-Host "Package SHA256: $packageHash"

  $SiteName = Get-RequiredValue $SiteName 'IIS_JHT_SITE_NAME'
  $UserName = Get-RequiredValue $UserName 'IIS_JHT_USER'
  if ([string]::IsNullOrWhiteSpace($Password)) {
    $securePassword = Read-Host 'Enter IIS_JHT_PWD' -AsSecureString
    $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    try {
      $Password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    } finally {
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    }
  }
  $Password = Get-RequiredValue $Password 'IIS_JHT_PWD'

  if ([string]::IsNullOrWhiteSpace($Endpoint)) {
    $ServerIp = Get-RequiredValue $ServerIp 'IIS_JHT_SERVER_IP'
    $Endpoint = "https://${ServerIp}:8172/msdeploy.axd?site=$SiteName"
  }
  try {
    $endpointUri = [Uri]$Endpoint
  } catch {
    throw "Invalid IIS_JHT_MSDEPLOY_ENDPOINT: $Endpoint"
  }

  Write-Host "Target site: $SiteName"
  Write-Host "MSDeploy endpoint: $Endpoint"

  if (-not $SkipConnectivityCheck) {
    Write-Host '=== Check MSDeploy port ==='
    $targetPort = if ($endpointUri.Port -gt 0) { $endpointUri.Port } else { 8172 }
    $connection = Test-NetConnection `
      -ComputerName $endpointUri.Host `
      -Port $targetPort `
      -WarningAction SilentlyContinue
    if (-not $connection.TcpTestSucceeded) {
      throw "Cannot connect to $($endpointUri.Host):$targetPort. Check the network, firewall, and endpoint."
    }
  }

  $destination = "contentPath=$SiteName,ComputerName=$Endpoint,UserName=$UserName,Password=$Password,AuthType=Basic,IncludeAcls=False"
  $deployArguments = @(
    '-verb:sync'
    "-source:package=$PackagePath"
    "-dest:$destination"
    '-enableRule:AppOffline'
    '-disableRule:BackupRule'
    '-retryAttempts:20'
    "-skip:objectName=filePath,absolutePath='.*google.*\.html'"
    "-skip:objectName=filePath,absolutePath='.*BingSiteAuth\.xml'"
    "-skip:objectName=filePath,absolutePath='logs\\.*'"
    "-skip:objectName=dirPath,absolutePath='logs'"
    "-skip:objectName=filePath,absolutePath='data\\.*'"
    "-skip:objectName=dirPath,absolutePath='data'"
    '-allowUntrusted'
    '-verbose'
  )

  Write-Host '=== Deployment preview (WhatIf) ==='
  $previewArguments = $deployArguments + '-whatif'
  Invoke-ExternalCommand $MsDeployPath @previewArguments
  if ($WhatIfOnly) {
    Write-Host 'WhatIf completed. No server files were changed.'
    return
  }

  if (-not $Force) {
    $confirmation = Read-Host "IIS site '$SiteName' will be overwritten. Enter jht to continue"
    if ($confirmation -cne 'jht') {
      throw 'Deployment cancelled.'
    }
  }

  Write-Host '=== Deploy to IIS ==='
  Invoke-ExternalCommand $MsDeployPath @deployArguments
  Write-Host 'JHT deployment completed.'
} finally {
  Pop-Location
}
