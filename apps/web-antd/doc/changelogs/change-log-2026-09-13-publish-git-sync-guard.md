# 变更记录：发布前检查 git 同步

## 背景意图

本地自动发布可能把尚未推送的提交、或落后于远程的旧代码发到 IIS。需要在打包前拦住「本地未推送」和「远程有更新未拉取」两种不同步。

## 核心逻辑变更

- 新增 `scripts/assert-git-publish-ready.ps1`：`git fetch` 后比较当前分支与 `@{upstream}` 的 ahead/behind。
- `publish-web.ps1` / `publish-all-web.ps1` 在构建前调用该检查；无上游、detached HEAD、fetch 失败同样禁止发布。
- 全量发布只检查一次，再给各品牌子进程传 `-SkipGitSyncCheck`，避免并行重复 fetch。
- 紧急情况可显式 `-SkipGitSyncCheck`。

## 避坑指南

- 当前分支必须已设置上游（例如 `git push -u origin <branch>`），否则一律视为未推送。
- fetch 失败（无网、凭据失效）也会禁止发布，因为无法确认远程是否有未拉取更新。
- 本检查不拦截未提交的工作区改动；未提交代码仍可能被打进包，发布前请先提交并推送。
