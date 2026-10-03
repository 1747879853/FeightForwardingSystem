@echo off
chcp 936 >nul
setlocal EnableExtensions

rem =================================================================
rem   Git 拉取脚本  --  workmakework 后端
rem   目标仓库 : D:\xfk\git\bzz\Freight
rem   用法     : 双击运行即可
rem              命令行: git-pull-workmakework.bat [check]
rem                      check = 只探测远程, 不改动本地
rem   附加功能 : 拉取成功后, 自动把 aspnet-core\文档 里"本次更新到的内容"
rem              按原目录结构复制一份到前端项目 apps\web-antd\doc 中
rem              调用同目录下的 sync-workmakework-docs-company.ps1 完成
rem   编码说明 : 本文件为 GBK(ANSI) + CRLF 换行, 请勿另存为 UTF-8
rem =================================================================

set "REPO=D:\xfk\git\bzz\Freight"
set "REMOTE=origin"
set "BRANCH=main"
set "GOPT=-c i18n.logOutputEncoding=gbk -c i18n.commitEncoding=utf-8"
set "MODE=pull"
if /i "%~1"=="check" set "MODE=check"
if /i "%~1"=="syncall" set "MODE=syncall"

rem ---- 文档同步配置 ----
set "DOCPS=%~dp0sync-workmakework-docs-company.ps1"
set "DOCSRC=aspnet-core\文档"
set "DOCDST=D:\xfk\git\vben\FeightForwardingSystem\apps\web-antd\doc"

title Git pull - workmakework

echo =================================================================
echo   Git 拉取 : workmakework后端
echo   目标目录 : %REPO%
echo   远程/分支: %REMOTE% / %BRANCH%
echo   模式     : %MODE%
echo   文档同步 : %DOCSRC%  ==^>  %DOCDST%
echo =================================================================
echo.

if not exist "%REPO%\.git" goto :norepo

cd /d "%REPO%"
if errorlevel 1 goto :nocd

set "PRE_HEAD="
for /f "usebackq delims=" %%H in (`git rev-parse HEAD 2^>nul`) do set "PRE_HEAD=%%H"

echo [1/5] 当前分支与本地改动
echo -----------------------------------------------------------------
git rev-parse --abbrev-ref HEAD
git %GOPT% status -sb
echo.

if /i "%MODE%"=="check" goto :do_check
if /i "%MODE%"=="syncall" goto :skip_pull

echo [2/5] 正在从 %REMOTE% 拉取 %BRANCH% ...
echo -----------------------------------------------------------------
git %GOPT% pull %REMOTE% %BRANCH%
if errorlevel 1 goto :pullfail
goto :after_pull

:skip_pull
echo [2/5] syncall 模式: 跳过 git pull, 只做文档全量同步
echo -----------------------------------------------------------------
goto :after_pull

:do_check
echo [2/5] 检查模式: 仅探测远程, 不改动本地任何内容
echo -----------------------------------------------------------------
git %GOPT% fetch --dry-run %REMOTE% %BRANCH%
if errorlevel 1 goto :pullfail
echo.
echo [3/5] 检查模式: 跳过文档同步 (不会改动前端 doc 目录)
echo -----------------------------------------------------------------
goto :after_sync

:after_pull
echo.
echo [3/5] 同步后端文档到前端 doc 目录
echo -----------------------------------------------------------------

set "POST_HEAD="
for /f "usebackq delims=" %%H in (`git rev-parse HEAD 2^>nul`) do set "POST_HEAD=%%H"

if not exist "%DOCPS%" goto :nodocps

set "DOCMODE=auto"
if /i "%MODE%"=="syncall" set "DOCMODE=all"

powershell -NoProfile -ExecutionPolicy Bypass -File "%DOCPS%" -Repo "%REPO%" -SrcRel "%DOCSRC%" -Target "%DOCDST%" -PreHead "%PRE_HEAD%" -PostHead "%POST_HEAD%" -Mode "%DOCMODE%"
set "DOCRC=%ERRORLEVEL%"
chcp 936 >nul
if not "%DOCRC%"=="0" goto :docfail
echo.
goto :after_sync

:nodocps
echo [跳过] 未找到文档同步脚本:
echo        %DOCPS%
echo        请确认 sync-workmakework-docs-company.ps1 与当前 .bat 放在同一目录.
echo.
goto :after_sync

:docfail
echo.
echo [警告] 文档同步未完全成功 (退出码 %DOCRC%), 详见上方输出.
echo        git 拉取本身已成功, 可重复运行本脚本重试同步.
echo.

:after_sync
echo [4/5] 最新提交
echo -----------------------------------------------------------------
git %GOPT% log -1 --date=short --pretty=format:"%%h  %%ad  %%an  %%s"
echo.
echo.

echo [5/5] 拉取后状态
echo -----------------------------------------------------------------
git %GOPT% status -sb
echo.

echo =================================================================
echo   完成 - 操作已成功结束
echo =================================================================
goto :done

:norepo
echo [错误] 目标目录不是 Git 仓库, 找不到 .git 目录:
echo        %REPO%
echo        请确认该路径是否正确.
goto :fail

:nocd
echo [错误] 无法进入目录: %REPO%
goto :fail

:pullfail
echo.
echo [失败] Git 命令返回错误, 常见原因:
echo        1. 本地有未提交的改动, 或存在冲突文件
echo        2. 网络不通 / 账号凭据失效
echo        3. 远程不存在 %BRANCH% 分支
echo        处理建议:
echo          git stash          先暂存本地改动, 再重新运行本脚本
echo          git pull --rebase  改用变基方式拉取, 提交历史更干净
goto :fail

:fail
echo.
echo =================================================================
echo   脚本未正常完成, 请查看上方提示信息
echo =================================================================

:done
echo.
pause
endlocal
