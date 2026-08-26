[CmdletBinding()]
param(
  [ValidateSet('hhyy', 'jht', 'jiayue', 'jytest', 'sjtd', 'longshan', 'demo')]
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

# powershell.exe -File + Start-Process often reports exit 0 after `throw`.
# Always write a result file and force a non-zero process exit on failure.
$resultPath = ''
trap {
  $message = $_.Exception.Message
  if ([string]::IsNullOrWhiteSpace($message)) {
    $message = "$_"
  }
  Write-Host "ERROR: $message"
  if (-not [string]::IsNullOrWhiteSpace($resultPath)) {
    Set-Content -LiteralPath $resultPath -Value 'FAILED' -Encoding ascii
  }
  exit 1
}

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
  Write-Host '  1. hhyy'
  Write-Host '  2. jht'
  Write-Host '  3. jiayue'
  Write-Host '  4. jytest'
  Write-Host '  5. sjtd'
  Write-Host '  6. longshan'
  Write-Host '  7. demo'
  $selection = Read-Host 'Enter 1-7 or environment name'
  switch ($selection.ToLowerInvariant()) {
    '1' { return 'hhyy' }
    '2' { return 'jht' }
    '3' { return 'jiayue' }
    '4' { return 'jytest' }
    '5' { return 'sjtd' }
    '6' { return 'longshan' }
    '7' { return 'demo' }
    'hhyy' { return 'hhyy' }
    'jht' { return 'jht' }
    'jiayue' { return 'jiayue' }
    'jytest' { return 'jytest' }
    'sjtd' { return 'sjtd' }
    'longshan' { return 'longshan' }
    'demo' { return 'demo' }
    default { throw "Unsupported environment: $selection" }
  }
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$defaultMsDeployPath = 'C:\Program Files\IIS\Microsoft Web Deploy V3\msdeploy.exe'

if ([string]::IsNullOrWhiteSpace($Environment)) {
  $Environment = Select-Environment
}

# Isolated per-brand dist so deploy:antd:all can build in parallel.
# GitHub hhyy workflow still uses the default apps/web-antd/dist (no --outDir).
$distPath = Join-Path $repoRoot "apps\web-antd\dist-$Environment"
$viteOutDir = "dist-$Environment"
$viteCacheDir = "node_modules/.vite-$Environment"

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
$resultPath = Join-Path $releaseDirectory 'publish.result'
if (-not (Test-Path -LiteralPath $releaseDirectory)) {
  New-Item -ItemType Directory -Path $releaseDirectory -Force | Out-Null
}
Set-Content -LiteralPath $resultPath -Value 'RUNNING' -Encoding ascii

Push-Location $repoRoot
try {
  Write-Host ''
  Write-Host "=== Local web publish: $Environment ==="
  Write-Host "Repository : $repoRoot"
  Write-Host "IIS site   : $siteName"
  Write-Host "Endpoint   : $endpoint"
  Write-Host "Dist       : $distPath"

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
      try {
        Remove-Item -LiteralPath $staleArchivePath -Force -ErrorAction Stop
        Write-Host "Remove stale disabled VITE_ARCHIVER output: $staleArchivePath"
      } catch {
        Write-Warning "Skip locked dist.zip: $($_.Exception.Message)"
      }
    }

    # build-only:<env> preserves npm_lifecycle_script so the custom environment
    # loader sees --mode. Isolated outDir/cacheDir are passed via env because
    # pnpm extra CLI args were forwarded as a literal "--" and vite ignored them.
    $env:WEB_ANTD_OUT_DIR = $viteOutDir
    $env:WEB_ANTD_CACHE_DIR = $viteCacheDir
    Invoke-ExternalCommand 'pnpm' @(
      '--filter'
      '@vben/web-antd'
      'run'
      "build-only:$Environment"
    )
  } else {
    Write-Warning "Build skipped. Existing dist-$Environment will be treated as '$Environment'."
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

  $apiLine = Get-Content -LiteralPath $brandEnvPath -Encoding UTF8 |
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
    Set-Content -LiteralPath $resultPath -Value 'SUCCESS' -Encoding ascii
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
    Set-Content -LiteralPath $resultPath -Value 'SUCCESS' -Encoding ascii
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
  Set-Content -LiteralPath $resultPath -Value 'SUCCESS' -Encoding ascii
} finally {
  Pop-Location
}
