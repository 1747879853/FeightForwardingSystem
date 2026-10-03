<#
  sync-workmakework-docs.ps1
  ------------------------------------------------------------------
  作用 : 把后端仓库 <Repo>\aspnet-core\文档 里"本次拉取更新到的内容"复制一份到
         前端项目 <Target> 中, 并保持与源完全一致的目录结构。

  调用 : 由 git-pull-workmakework.bat 在 git pull 成功之后自动调用;
         也可以单独手动运行 (见文末示例)。

  参数 :
    -Repo       后端仓库根目录   默认 D:\work\makework\后端\workmakework后端
    -SrcRel     源子目录(相对仓库) 默认 aspnet-core\文档
    -Target     目标目录         默认 D:\work\makework\vben1\FeightForwardingSystem\apps\web-antd\doc
    -PreHead    本次拉取前的提交 (空=读状态文件; 仍为空则退化为全量同步)
    -PostHead   本次拉取后的提交 (空=取当前 HEAD)
    -Mode       auto(默认) | diff(仅本次变更) | all(全量)
    -PruneDeleted  源里已删除的文件同时在目标删除 (默认只提示)
    -NoBackup      覆盖前不备份 (默认对被覆盖的文件先备份)

  安全设计 :
    * 内容完全相同的文件直接跳过, 不做无意义覆盖;
    * 会覆盖目标文件时, 先把旧文件备份到 D:\work\makework\.doc-sync-backup\<时间戳>\;
    * 支持失败重跑, 重复执行结果一致 (幂等)。

  编码 : 本文件为 UTF-8 with BOM + CRLF, 请勿另存为其它编码。
  ------------------------------------------------------------------

  手动用法示例:
    powershell -NoProfile -ExecutionPolicy Bypass -File .\sync-workmakework-docs.ps1 -Mode all
    powershell -NoProfile -ExecutionPolicy Bypass -File .\sync-workmakework-docs.ps1 -PreHead <旧commit> -PostHead <新commit>
#>

[CmdletBinding()]
param(
    [string]$Repo = '',
    [string]$SrcRel = '',
    [string]$Target = '',
    [string]$PreHead = '',
    [string]$PostHead = '',
    [ValidateSet('auto', 'diff', 'all')][string]$Mode = 'auto',
    [switch]$PruneDeleted,
    [switch]$NoBackup
)

$ErrorActionPreference = 'Stop'

# ---------------------------------------------------------------- 默认常量
$DefaultRepo = 'D:\xfk\git\bzz\Freight'
$DefaultSrcRel = 'aspnet-core\文档'
$DefaultTarget = 'D:\xfk\git\vben\FeightForwardingSystem\apps\web-antd\doc'
$BackupRootBase = 'D:\xfk\git\.doc-sync-backup'

function Resolve-Usable([string]$p) {
    if ([string]::IsNullOrWhiteSpace($p)) { return $null }
    if (Test-Path -LiteralPath $p) { return (Resolve-Path -LiteralPath $p).Path }
    return $null
}

function Write-Section([string]$title) {
    Write-Host ''
    Write-Host ('=' * 65) -ForegroundColor Cyan
    Write-Host ('  ' + $title) -ForegroundColor Cyan
    Write-Host ('=' * 65) -ForegroundColor Cyan
}

# ---------------------------------------------------------------- 定位仓库 / 源 / 目标
$repoPath = Resolve-Usable $Repo
if (-not $repoPath) { $repoPath = Resolve-Usable $DefaultRepo }
if (-not $repoPath) {
    Write-Host '[错误] 找不到后端仓库目录:' -ForegroundColor Red
    Write-Host ('        传入值   : ' + $Repo)
    Write-Host ('        默认值   : ' + $DefaultRepo)
    exit 2
}

$srcRelUse = $SrcRel
if ([string]::IsNullOrWhiteSpace($srcRelUse) -or
    -not (Test-Path -LiteralPath (Join-Path $repoPath $srcRelUse))) {
    $srcRelUse = $DefaultSrcRel
}
$srcAbs = Resolve-Usable (Join-Path $repoPath $srcRelUse)
if (-not $srcAbs) {
    Write-Host ('[错误] 源目录不存在: ' + (Join-Path $repoPath $srcRelUse)) -ForegroundColor Red
    exit 3
}

$targetPath = Resolve-Usable $Target
if (-not $targetPath) { $targetPath = $DefaultTarget }

# ---------------------------------------------------------------- git 辅助
$scriptDir = $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($scriptDir)) { $scriptDir = $env:TEMP }
$stateFile = Join-Path $scriptDir '.doc-sync-last-head.txt'

function Invoke-GitText([string[]]$a) {
    $old = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $out = & git @a 2>&1
    $code = $LASTEXITCODE
    $ErrorActionPreference = $old
    $text = ($out | ForEach-Object { [string]$_ }) -join "`n"
    if ($code -ne 0) { throw ('git ' + ($a -join ' ') + ' 执行失败 (exit ' + $code + '): ' + $text) }
    return $text
}

Push-Location $repoPath
try {
    if (-not (Test-Path -LiteralPath (Join-Path $repoPath '.git'))) {
        Write-Host ('[错误] 不是 Git 仓库: ' + $repoPath) -ForegroundColor Red
        exit 4
    }

    Write-Section '同步后端文档到前端 doc 目录'
    Write-Host ('  后端仓库 : ' + $repoPath)
    Write-Host ('  源目录   : ' + $srcRelUse)
    Write-Host ('  目标目录 : ' + $targetPath)

    $pre = $PreHead.Trim()
    $post = $PostHead.Trim()
    if ([string]::IsNullOrWhiteSpace($post)) {
        $post = (Invoke-GitText -a @('rev-parse', 'HEAD')).Trim()
    }
    if ([string]::IsNullOrWhiteSpace($pre) -and (Test-Path -LiteralPath $stateFile)) {
        $pre = (Get-Content -LiteralPath $stateFile -Raw).Trim()
        if ($pre) { Write-Host ('  上次同步 : ' + $pre + '  (取自状态文件)') }
    }

    $useAll = ($Mode -eq 'all')
    if ($Mode -eq 'auto') { $useAll = [string]::IsNullOrWhiteSpace($pre) }

    if ($useAll) {
        Write-Host '  同步范围 : 全量 (源目录下所有文件)' -ForegroundColor Yellow
        if ($PreHead -or $pre) { Write-Host '             * 已指定 -Mode all' -ForegroundColor Yellow }
    }
    elseif ($pre -eq $post) {
        Write-Host ('  同步范围 : ' + $pre.Substring(0, [Math]::Min(8, $pre.Length)) + ' .. ' + $post.Substring(0, [Math]::Min(8, $post.Length)) + ' (本次无新提交)')
    }
    else {
        Write-Host ('  同步范围 : ' + $pre.Substring(0, [Math]::Min(8, $pre.Length)) + ' .. ' + $post.Substring(0, [Math]::Min(8, $post.Length)) + ' 的变更文件')
    }

    $srcRelGit = $srcRelUse -replace '\\', '/'
    $prefix = $srcRelGit.TrimEnd('/') + '/'

    $relList = New-Object 'System.Collections.Generic.List[string]'
    $delList = New-Object 'System.Collections.Generic.List[string]'

    if ($useAll) {
        Get-ChildItem -LiteralPath $srcAbs -Recurse -File -Force | ForEach-Object {
            $relList.Add($_.FullName.Substring($srcAbs.Length + 1))
        }
    }
    elseif ($pre -ne $post) {
        $tmp = Join-Path ([System.IO.Path]::GetTempPath()) ('git-doc-sync-' + [Guid]::NewGuid().ToString('N') + '.txt')
        $utf8 = New-Object System.Text.UTF8Encoding($false)
        try {
            foreach ($filter in @('ACMR', 'D')) {
                $ga = @('diff', '--name-only', '-z', '--no-renames', ('--diff-filter=' + $filter),
                        ('--output=' + $tmp), $pre, $post, '--', $srcRelGit)
                Invoke-GitText -a $ga | Out-Null
                $raw = [System.IO.File]::ReadAllText($tmp, $utf8)
                foreach ($p in $raw.Split([char]0)) {
                    if ([string]::IsNullOrEmpty($p)) { continue }
                    if ($p.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
                        $rel = $p.Substring($prefix.Length) -replace '/', '\'
                        if ($filter -eq 'D') { $delList.Add($rel) } else { $relList.Add($rel) }
                    }
                }
            }
        }
        finally {
            if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Force }
        }
    }

    $uniq = @($relList | Sort-Object -Unique)

    if ($uniq.Count -eq 0 -and $delList.Count -eq 0) {
        Write-Host ''
        Write-Host '  本次没有文档内容需要同步 (源文档目录无变更)。' -ForegroundColor Green
        Set-Content -LiteralPath $stateFile -Value $post -Encoding ASCII
        exit 0
    }

    # ------------------------------------------------------------ 目标目录准备
    if (-not (Test-Path -LiteralPath $targetPath)) {
        Write-Host ('  提示: 目标目录不存在, 自动创建 -> ' + $targetPath) -ForegroundColor Yellow
        New-Item -ItemType Directory -Path $targetPath -Force | Out-Null
    }

    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $backupRoot = Join-Path $BackupRootBase $stamp

    $added = 0; $updated = 0; $same = 0; $missing = 0; $failed = 0
    $changedList = New-Object 'System.Collections.Generic.List[string]'
    $failList = New-Object 'System.Collections.Generic.List[string]'

    foreach ($rel in $uniq) {
        $srcFile = Join-Path $srcAbs $rel
        if (-not (Test-Path -LiteralPath $srcFile -PathType Leaf)) { $missing++; continue }

        $dstFile = Join-Path $targetPath $rel
        $dstDir = Split-Path -Parent $dstFile
        if ($dstDir -and -not (Test-Path -LiteralPath $dstDir)) {
            New-Item -ItemType Directory -Path $dstDir -Force | Out-Null
        }

        $isNew = -not (Test-Path -LiteralPath $dstFile -PathType Leaf)
        if (-not $isNew) {
            $identical = $false
            try {
                $h1 = (Get-FileHash -LiteralPath $srcFile -Algorithm SHA1).Hash
                $h2 = (Get-FileHash -LiteralPath $dstFile -Algorithm SHA1).Hash
                if ($h1 -eq $h2) { $identical = $true }
            }
            catch { $identical = $false }
            if ($identical) { $same++; continue }

            if (-not $NoBackup) {
                $bkFile = Join-Path $backupRoot $rel
                $bkDir = Split-Path -Parent $bkFile
                if ($bkDir -and -not (Test-Path -LiteralPath $bkDir)) {
                    New-Item -ItemType Directory -Path $bkDir -Force | Out-Null
                }
                Copy-Item -LiteralPath $dstFile -Destination $bkFile -Force
            }
        }

        try {
            Copy-Item -LiteralPath $srcFile -Destination $dstFile -Force
            try {
                (Get-Item -LiteralPath $dstFile).LastWriteTime = (Get-Item -LiteralPath $srcFile).LastWriteTime
            }
            catch { }
            if ($isNew) { $added++ } else { $updated++ }
            $changedList.Add($rel)
        }
        catch {
            $failed++
            $failList.Add($rel + '  ->  ' + $_.Exception.Message)
        }
    }

    # ------------------------------------------------------------ 源中已删除
    $prunedList = New-Object 'System.Collections.Generic.List[string]'
    $delExist = New-Object 'System.Collections.Generic.List[string]'
    foreach ($d in (@($delList | Sort-Object -Unique))) {
        $dstFile = Join-Path $targetPath $d
        if (Test-Path -LiteralPath $dstFile -PathType Leaf) {
            if ($PruneDeleted) {
                Remove-Item -LiteralPath $dstFile -Force
                $prunedList.Add($d)
            }
            else { $delExist.Add($d) }
        }
    }

    Set-Content -LiteralPath $stateFile -Value $post -Encoding ASCII

    # ------------------------------------------------------------ 汇总
    Write-Section '同步结果'
    Write-Host ('  新增文件   : ' + $added)
    Write-Host ('  覆盖更新   : ' + $updated) -ForegroundColor Yellow
    Write-Host ('  内容相同跳 : ' + $same)
    if ($missing -gt 0) { Write-Host ('  源中不存在 : ' + $missing) -ForegroundColor Yellow }
    if ($failed -gt 0) { Write-Host ('  复制失败   : ' + $failed) -ForegroundColor Red }
    Write-Host ('  合计写入   : ' + ($added + $updated))
    if ($updated -gt 0 -and -not $NoBackup) {
        Write-Host ('  旧文件备份 : ' + $backupRoot) -ForegroundColor DarkGray
    }

    if ($changedList.Count -gt 0) {
        Write-Host ''
        Write-Host ('  已同步文件清单 (最多显示 300 条, 共 ' + $changedList.Count + ' 条):') -ForegroundColor Gray
        $n = 0
        foreach ($c in $changedList) {
            $n++
            if ($n -gt 300) { Write-Host ('    ... 其余 ' + ($changedList.Count - 300) + ' 条略'); break }
            Write-Host ('    + ' + $c) -ForegroundColor Gray
        }
    }

    if ($delExist.Count -gt 0) {
        Write-Host ''
        Write-Host ('  源中已删除, 目标仍保留 ' + $delExist.Count + ' 个 (默认不删, 可加 -PruneDeleted 清理):') -ForegroundColor Yellow
        foreach ($d in $delExist) { Write-Host ('    - ' + $d) -ForegroundColor DarkYellow }
    }
    if ($prunedList.Count -gt 0) {
        Write-Host ''
        Write-Host ('  已按源删除目标文件 ' + $prunedList.Count + ' 个:') -ForegroundColor Yellow
        foreach ($d in $prunedList) { Write-Host ('    x ' + $d) -ForegroundColor DarkYellow }
    }
    if ($failList.Count -gt 0) {
        Write-Host ''
        Write-Host '  失败明细:' -ForegroundColor Red
        foreach ($f in $failList) { Write-Host ('    ! ' + $f) -ForegroundColor Red }
    }

    if ($failed -gt 0) { exit 1 }
    exit 0
}
finally {
    Pop-Location
}
