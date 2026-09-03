# Probe brand Web sites: HTTP access, HTML title, _app.config.js API.
[CmdletBinding()]
param(
  [string]$Name = '',
  [int]$TimeoutSec = 12,
  [string]$ConfigPath = ''
)

$ErrorActionPreference = 'Continue'
$utf8 = New-Object System.Text.UTF8Encoding $false
try {
  [Console]::OutputEncoding = $utf8
  $OutputEncoding = $utf8
} catch {}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if ([string]::IsNullOrWhiteSpace($ConfigPath)) {
  $ConfigPath = Join-Path $scriptDir 'sites.json'
}

if (-not (Test-Path -LiteralPath $ConfigPath -PathType Leaf)) {
  throw "Site health check config was not found: $ConfigPath"
}

$raw = [System.IO.File]::ReadAllText($ConfigPath, $utf8)
$config = $raw | ConvertFrom-Json
$sites = @($config.sites)
if (-not [string]::IsNullOrWhiteSpace($Name)) {
  $sites = @($sites | Where-Object {
    $_.id -eq $Name -or $_.name -eq $Name
  })
  if ($sites.Count -eq 0) {
    throw "Unknown site: $Name"
  }
}

function Get-UrlText {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [string]$HostHeader = '',
    [switch]$AllowInvalidCert
  )

  $previousCertCallback = [System.Net.ServicePointManager]::ServerCertificateValidationCallback
  if ($AllowInvalidCert) {
    [System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
  }

  try {
    $request = [System.Net.HttpWebRequest]::Create($Url)
    $request.Method = 'GET'
    $request.Timeout = $TimeoutSec * 1000
    $request.ReadWriteTimeout = $TimeoutSec * 1000
    $request.AllowAutoRedirect = $true
    $request.UserAgent = 'site-health-check/1.0'
    $request.AutomaticDecompression = [System.Net.DecompressionMethods]::GZip -bor [System.Net.DecompressionMethods]::Deflate
    if (-not [string]::IsNullOrWhiteSpace($HostHeader)) {
      $request.Host = $HostHeader
    }
    try {
      $response = $request.GetResponse()
      try {
        $status = [int]$response.StatusCode
        $stream = $response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream, $utf8)
        $body = $reader.ReadToEnd()
        $reader.Close()
        return [pscustomobject]@{ Ok = $true; Status = $status; Body = $body; Error = '' }
      } finally {
        $response.Close()
      }
    } catch [System.Net.WebException] {
      $resp = $_.Exception.Response
      $status = 0
      $body = ''
      if ($null -ne $resp) {
        $status = [int]$resp.StatusCode
        try {
          $stream = $resp.GetResponseStream()
          $reader = New-Object System.IO.StreamReader($stream, $utf8)
          $body = $reader.ReadToEnd()
          $reader.Close()
        } catch {}
      }
      return [pscustomobject]@{
        Ok = $false
        Status = $status
        Body = $body
        Error = $_.Exception.Message
      }
    }
  } finally {
    [System.Net.ServicePointManager]::ServerCertificateValidationCallback = $previousCertCallback
  }
}

function Resolve-SiteWebFetchPlan {
  param(
    [Parameter(Mandatory = $true)][string]$Web,
    [string]$WebHostIp = ''
  )

  $plans = @([pscustomobject]@{ Url = $Web; HostHeader = ''; AllowInvalidCert = $false })
  if ([string]::IsNullOrWhiteSpace($WebHostIp)) {
    return $plans
  }

  try {
    $uri = [Uri]$Web
    if ($uri.Scheme -eq 'https' -and -not [string]::IsNullOrWhiteSpace($uri.Host)) {
      $fallbackUrl = '{0}://{1}{2}' -f $uri.Scheme, $WebHostIp, $uri.PathAndQuery
      $plans += [pscustomobject]@{
        Url = $fallbackUrl
        HostHeader = $uri.Host
        AllowInvalidCert = $true
      }
    }
  } catch {}

  return $plans
}

function Get-SiteWebPage {
  param(
    [Parameter(Mandatory = $true)][string]$Web,
    [string]$WebHostIp = ''
  )

  foreach ($plan in (Resolve-SiteWebFetchPlan -Web $Web -WebHostIp $WebHostIp)) {
    $page = Get-UrlText -Url $plan.Url -HostHeader $plan.HostHeader -AllowInvalidCert:$plan.AllowInvalidCert
    if ($page.Ok -and ($page.Status -ge 200) -and ($page.Status -lt 400)) {
      return [pscustomobject]@{
        Page = $page
        CheckedUrl = $plan.Url
      }
    }
  }

  $firstPlan = (Resolve-SiteWebFetchPlan -Web $Web -WebHostIp $WebHostIp)[0]
  return [pscustomobject]@{
    Page = (Get-UrlText -Url $firstPlan.Url -HostHeader $firstPlan.HostHeader -AllowInvalidCert:$firstPlan.AllowInvalidCert)
    CheckedUrl = $firstPlan.Url
  }
}

function Get-HtmlTitle {
  param([string]$Html)
  if ([string]::IsNullOrWhiteSpace($Html)) { return '' }
  if ($Html -match '(?is)<title[^>]*>(.*?)</title>') {
    return ($Matches[1] -replace '\s+', ' ').Trim()
  }
  return ''
}

function Get-AppConfigApi {
  param([string]$Js)
  if ([string]::IsNullOrWhiteSpace($Js)) { return '' }
  if ($Js -match '"VITE_GLOB_API_URL"\s*:\s*"([^"]+)"') {
    return $Matches[1].Trim()
  }
  return ''
}

$passCount = 0
$failCount = 0
$rows = @()

foreach ($site in $sites) {
  $web = [string]$site.web
  $expectedTitle = [string]$site.title
  $expectedApi = [string]$site.api
  $webHostIp = [string]$site.webHostIp
  $webCheckOptional = [bool]$site.webCheckOptional
  $configUrl = ($web.TrimEnd('/') + '/_app.config.js')
  $sessionUrl = ($expectedApi.TrimEnd('/') + '/services/app/Session/GetCurrentLoginInformations')

  $webFetch = Get-SiteWebPage -Web $web -WebHostIp $webHostIp
  $page = $webFetch.Page
  $checkedWebUrl = [string]$webFetch.CheckedUrl
  $title = Get-HtmlTitle $page.Body
  $pageOk = $page.Ok -and ($page.Status -ge 200) -and ($page.Status -lt 400)

  $cfg = Get-UrlText -Url $configUrl
  if (-not $cfg.Ok -and $pageOk -and -not [string]::IsNullOrWhiteSpace($checkedWebUrl)) {
    $cfgUrlFromPage = ($checkedWebUrl.TrimEnd('/') + '/_app.config.js')
    $cfg = Get-UrlText -Url $cfgUrlFromPage
  }
  $actualApi = Get-AppConfigApi $cfg.Body
  $apiOk = $cfg.Ok -and ($actualApi -eq $expectedApi)

  $backend = Get-UrlText -Url $sessionUrl
  $backendOk = ($backend.Status -in 200, 401, 403) -or (
    $backend.Ok -and ($backend.Status -ge 200) -and ($backend.Status -lt 500)
  )

  $titleOk = $pageOk -and ($title -eq $expectedTitle)
  $webChecksOk = $pageOk -and $titleOk -and $apiOk
  if ($webCheckOptional -and -not $webChecksOk -and $backendOk) {
    $allOk = $true
    $resultLabel = 'WARN'
  } else {
    $allOk = $webChecksOk -and $backendOk
    $resultLabel = $(if ($allOk) { 'PASS' } else { 'FAIL' })
  }
  if ($allOk) { $passCount += 1 } else { $failCount += 1 }

  $rows += [pscustomobject]@{
    Id = $site.id
    Name = $site.name
    Result = $resultLabel
    Web = $(if ($pageOk) { "OK $($page.Status)" } elseif ($webCheckOptional -and $backendOk) { "SKIP $($page.Status) $($page.Error)" } else { "FAIL $($page.Status) $($page.Error)" })
    Title = $(if ($titleOk) { "OK $title" } elseif ($webCheckOptional -and $backendOk) { 'SKIP web unreachable' } else { "FAIL got='$title' want='$expectedTitle'" })
    ConfigApi = $(if ($apiOk) { "OK $actualApi" } elseif ($webCheckOptional -and $backendOk) { 'SKIP web unreachable' } else { "FAIL got='$actualApi' want='$expectedApi'" })
    Backend = $(if ($backendOk) { "OK $($backend.Status)" } else { "FAIL $($backend.Status) $($backend.Error)" })
    WebUrl = $(if ($checkedWebUrl) { $checkedWebUrl } else { $web })
  }
}

Write-Host ''
Write-Host "site-health-check  pass=$passCount  fail=$failCount"
Write-Host ''
foreach ($row in $rows) {
  Write-Host ("[{0}] {1}  {2}" -f $row.Result, $row.Id, $row.Name)
  Write-Host ("  web      {0}  {1}" -f $row.Web, $row.WebUrl)
  Write-Host ("  title    {0}" -f $row.Title)
  Write-Host ("  api      {0}" -f $row.ConfigApi)
  Write-Host ("  backend  {0}" -f $row.Backend)
  Write-Host ''
}

if ($failCount -gt 0) { exit 1 }
exit 0
