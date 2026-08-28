# 变更记录：发布后自动探测站点标题与后端 API

## 背景意图

并行发布后可能把包发到错误 IIS 站点（例如 `:188` 仍是津海通标题、API 指向 `:82`）。构建期只校验 `dist/_app.config.js`，看不到线上实际打开的是哪一套。

## 核心逻辑变更

- 新增 `scripts/invoke-site-health-check.ps1`，封装 `.cursor/skills/site-health-check/scripts/check-sites.ps1`。
- `publish-web.ps1` 在 MSDeploy 成功后探测当前环境；`PackageOnly` / `WhatIfOnly` 不探测。
- `publish-all-web.ps1` 给子进程传 `-SkipHealthCheck`，避免并行过程中互相干扰，全部 SUCCESS 后再测全集。
- 增加 `-SkipHealthCheck` 可跳过。探测失败则发布脚本非 0 退出。

## 避坑指南

- IIS `AppOffline` 后会先等 6 秒再探测；仍 503 时看是站点没起来还是绑错站。
- 预期标题/API 以 `sites.json` 为准，改地址要同步该文件，否则会误报 FAIL。
