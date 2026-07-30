@echo off
setlocal
cd /d "%~dp0.."
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0publish-all-web.ps1" %*
set "PUBLISH_EXIT_CODE=%ERRORLEVEL%"
if not "%PUBLISH_EXIT_CODE%"=="0" (
  echo.
  echo Publish-all failed with exit code %PUBLISH_EXIT_CODE%.
)
if "%~1"=="" pause
exit /b %PUBLISH_EXIT_CODE%
