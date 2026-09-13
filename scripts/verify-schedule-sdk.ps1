param([string]$BaseUrl = 'http://localhost:5010')

$ErrorActionPreference = 'Stop'
# Browser navigation requests must not be rewritten to the main SPA document.
$response = Invoke-WebRequest "$($BaseUrl.TrimEnd('/'))/schedule-sdk.html" -Headers @{ Accept = 'text/html' }
if (!$response.Content.Contains('web-sdk.js') -or $response.Content.Contains('/src/main.ts')) {
    throw 'FAIL: SDK HTML request falls back to main app'
}
Write-Output 'PASS: browser HTML request serves the SDK page'
