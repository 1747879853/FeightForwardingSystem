[CmdletBinding()]
param(
  [ValidateSet('jht', 'jiayue', 'sjtd', 'demo')]
  [string]$Environment,
  [string]$ConfigPath = '',
  [switch]$InstallDeps,
  [switch]$SkipBuild,
  [switch]$SkipPrebuild,
  [switch]$ForcePrebuild,
  [switch]$PackageOnly,
  [switch]$WhatIfOnly,
  [switch]$SkipConnectivityCheck,
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# Windows PowerShell 5.1 evaluates parameter default expressions before
# $PSScriptRoot is populated, so script-relative defaults must be resolved here.
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

function Get-ConfigValue {
  param(
    [Parameter(Mandatory = $true)]
    [object]$Config,
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [AllowEmptyString()]
    [string]$DefaultValue = ''
  )

  $property = $Config.PSObject.Properties[$Name]
  if ($null -eq $property -or $null -eq $property.Value) {
    return $DefaultValue
  }
  return [string]$property.Value
}

function Get-RequiredValue {
  param(
    [AllowEmptyString()]
    [string]$Value,
    [Parameter(Mandatory = $true)]
    [string]$Name
  )

  if ([string]::IsNullOrWhiteSpace($Value)) {
    throw "Missing '$Name' in $ConfigPath."
  }
  return $Value
}

function Read-PlainTextPassword {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Prompt
  )

  $securePassword = Read-Host $Prompt -AsSecureString
  $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
  }
}

function Select-Environment {
  Write-Host ''
  Write-Host 'Select company environment:'
  Write-Host '  1. jht'
  Write-Host '  2. jiayue'
  Write-Host '  3. sjtd'
  Write-Host '  4. demo'
  $selection = Read-Host 'Enter 1-4 or environment name'
  switch ($selection.ToLowerInvariant()) {
    '1' { return 'jht' }
    '2' { return 'jiayue' }
    '3' { return 'sjtd' }
    '4' { return 'demo' }
    'jht' { return 'jht' }
    'jiayue' { return 'jiayue' }
    'sjtd' { return 'sjtd' }
    'demo' { return 'demo' }
    default { throw "Unsupported environment: $selection" }
  }
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$distPath = Join-Path $repoRoot 'apps\web-antd\dist'
$defaultMsDeployPath = 'C:\Program Files\IIS\Microsoft Web Deploy V3\msdeploy.exe'

if ([string]::IsNullOrWhiteSpace($Environment)) {
  $Environment = Select-Environment
}

if (-not (Test-Path -LiteralPath $ConfigPath -PathType Leaf)) {
  $examplePath = Join-Path $PSScriptRoot 'publish-config.example.json'
  throw "Local publish config was not found: $ConfigPath`nCopy '$examplePath' to '$ConfigPath' and fill in the IIS settings."
}

try {
  $allConfig = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
} catch {
  throw "Invalid JSON config '$ConfigPath': $($_.Exception.Message)"
}

$environmentProperty = $allConfig.PSObject.Properties[$Environment]
if ($null -eq $environmentProperty) {
  throw "Environment '$Environment' is missing from $ConfigPath."
}
$config = $environmentProperty.Value

$serverIp = Get-ConfigValue $config 'serverIp'
$endpoint = Get-ConfigValue $config 'endpoint'
$siteName = Get-RequiredValue (Get-ConfigValue $config 'siteName') 'siteName'
$userName = Get-RequiredValue (Get-ConfigValue $config 'userName') 'userName'
$password = Get-ConfigValue $config 'password'
$msDeployPath = Get-ConfigValue $config 'msDeployPath' $defaultMsDeployPath

$passwordEnvironmentVariable = "IIS_$($Environment.ToUpperInvariant())_PWD"
$passwordFromEnvironment = [Environment]::GetEnvironmentVariable($passwordEnvironmentVariable)
if (-not [string]::IsNullOrWhiteSpace($passwordFromEnvironment)) {
  $password = $passwordFromEnvironment
}
if (-not $PackageOnly -and [string]::IsNullOrWhiteSpace($password)) {
  $password = Read-PlainTextPassword "Enter IIS password for $userName"
}

if ([string]::IsNullOrWhiteSpace($endpoint)) {
  $serverIp = Get-RequiredValue $serverIp 'serverIp'
  $escapedSiteName = [Uri]::EscapeDataString($siteName)
  $endpoint = "https://${serverIp}:8172/msdeploy.axd?site=$escapedSiteName"
}

try {
  $endpointUri = [Uri]$endpoint
} catch {
  throw "Invalid endpoint for '$Environment': $endpoint"
}
if (-not $endpointUri.IsAbsoluteUri) {
  throw "The endpoint must be an absolute URI: $endpoint"
}

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$releaseDirectory = Join-Path $repoRoot "output\releases\$Environment"
$packagePath = Join-Path $releaseDirectory "web-antd-$Environment-$timestamp.zip"
$brandEnvPath = Join-Path $repoRoot "apps\web-antd\.env.$Environment"
$appConfigPath = Join-Path $distPath '_app.config.js'

Push-Location $repoRoot
try {
  Write-Host ''
  Write-Host "=== Local web publish: $Environment ==="
  Write-Host "Repository : $repoRoot"
  Write-Host "IIS site   : $siteName"
  Write-Host "Endpoint   : $endpoint"

  if (-not $SkipBuild) {
    if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
      throw 'pnpm was not found. Install Node.js and pnpm first.'
    }
    if ($InstallDeps) {
      Write-Host '=== Install dependencies ==='
      Invoke-ExternalCommand 'pnpm' @('install', '--frozen-lockfile')
    }
    if ($SkipPrebuild) {
      Write-Warning 'Core package prebuild skipped by request.'
    } else {
      Write-Host '=== Prebuild core packages (Turbo cache enabled) ==='
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

    Write-Host "=== Build web-antd ($Environment) ==="
    $staleArchivePath = Join-Path $repoRoot 'apps\web-antd\dist.zip'
    if (Test-Path -LiteralPath $staleArchivePath -PathType Leaf) {
      Write-Host "Remove stale disabled VITE_ARCHIVER output: $staleArchivePath"
      Remove-Item -LiteralPath $staleArchivePath -Force
    }

    # build-only:<env> preserves npm_lifecycle_script so the custom environment
    # loader sees --mode, but it has no matching prebuild lifecycle to rerun.
    Invoke-ExternalCommand 'pnpm' @(
      '--filter'
      '@vben/web-antd'
      'run'
      "build-only:$Environment"
    )
  } else {
    Write-Warning "Build skipped. Existing dist will be treated as '$Environment'."
  }

  if (-not (Test-Path -LiteralPath (Join-Path $distPath 'index.html') -PathType Leaf)) {
    throw "Build artifact not found: $distPath\index.html"
  }
  if (-not (Test-Path -LiteralPath $appConfigPath -PathType Leaf)) {
    throw "Runtime config not found: $appConfigPath"
  }
  if (-not (Test-Path -LiteralPath $brandEnvPath -PathType Leaf)) {
    throw "Brand environment file not found: $brandEnvPath"
  }

  $apiLine = Get-Content -LiteralPath $brandEnvPath |
    Where-Object { $_ -match '^\s*VITE_GLOB_API_URL=' } |
    Select-Object -First 1
  if (-not $apiLine) {
    throw "VITE_GLOB_API_URL is missing from $brandEnvPath."
  }
  $expectedApi = ($apiLine -split '=', 2)[1].Trim().Trim('"').Trim("'")
  $appConfig = Get-Content -LiteralPath $appConfigPath -Raw
  if (-not $appConfig.Contains($expectedApi)) {
    throw "Artifact validation failed: _app.config.js does not contain API '$expectedApi'."
  }

  $files = @(Get-ChildItem -LiteralPath $distPath -Recurse -File)
  $indexHash = (Get-FileHash (Join-Path $distPath 'index.html') -Algorithm SHA256).Hash
  Write-Host "Files       : $($files.Count)"
  Write-Host "API         : $expectedApi"
  Write-Host "index SHA256: $indexHash"

  if (-not (Test-Path -LiteralPath $msDeployPath -PathType Leaf)) {
    throw "MSDeploy was not found: $msDeployPath`nInstall Microsoft Web Deploy 3.6 or set msDeployPath in the local config."
  }
  if (-not (Test-Path -LiteralPath $releaseDirectory)) {
    New-Item -ItemType Directory -Path $releaseDirectory -Force | Out-Null
  }

  Write-Host '=== Create MSDeploy package ==='
  Invoke-ExternalCommand $msDeployPath @(
    '-verb:sync'
    "-source:contentPath=$distPath"
    "-dest:package=$packagePath"
  )
  if (-not (Test-Path -LiteralPath $packagePath -PathType Leaf)) {
    throw "Package was not created: $packagePath"
  }

  $package = Get-Item -LiteralPath $packagePath
  $packageHash = (Get-FileHash -LiteralPath $packagePath -Algorithm SHA256).Hash
  Write-Host ("Package     : {0} ({1:N2} MB)" -f $packagePath, ($package.Length / 1MB))
  Write-Host "ZIP SHA256  : $packageHash"

  if ($PackageOnly) {
    Write-Host 'Package completed. IIS was not changed.'
    return
  }

  if (-not $SkipConnectivityCheck) {
    Write-Host '=== Check Web Deploy port ==='
    $targetPort = if ($endpointUri.Port -gt 0) { $endpointUri.Port } else { 8172 }
    $connection = Test-NetConnection `
      -ComputerName $endpointUri.Host `
      -Port $targetPort `
      -WarningAction SilentlyContinue
    if (-not $connection.TcpTestSucceeded) {
      throw "Cannot connect to $($endpointUri.Host):$targetPort. Check VPN, firewall and IIS Web Management Service."
    }
  }

  $destination = "contentPath=$siteName,ComputerName=$endpoint,UserName=$userName,Password=$password,AuthType=Basic,IncludeAcls=False"
  $deployArguments = @(
    '-verb:sync'
    "-source:package=$packagePath"
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

  if ($WhatIfOnly) {
    Write-Host '=== Deployment preview (WhatIf only) ==='
    Invoke-ExternalCommand $msDeployPath ($deployArguments + '-whatif')
    Write-Host 'WhatIf completed. IIS was not changed.'
    return
  }

  if (-not $Force) {
    $confirmation = Read-Host "IIS site '$siteName' will be overwritten. Enter '$Environment' to continue"
    if ($confirmation -cne $Environment) {
      throw 'Deployment cancelled.'
    }
  }

  Write-Host '=== Deploy to IIS ==='
  Invoke-ExternalCommand $msDeployPath $deployArguments
  Write-Host "Deployment completed: $Environment -> $siteName"
} finally {
  Pop-Location
}
