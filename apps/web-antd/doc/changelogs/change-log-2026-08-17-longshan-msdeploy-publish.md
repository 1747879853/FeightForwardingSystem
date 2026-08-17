---
title: 龙山接入本地 MSDeploy 自动发布
date: 2026-08-17
module: brand-pack
---

# 背景意图

龙山此前仅有独立开发/打包，未接入 `publish-web.ps1`；现按 `龙山.pubxml` 将 IIS WebDeploy 目标写入本地发布配置，支持一键发布。

# 核心逻辑变更

- `publish-web.ps1` / `publish-all-web.ps1` 支持环境 `longshan`
- 根目录新增 `pnpm deploy:antd:longshan`
- `publish-config.example.json` 增加 `longshan` 占位项
- 本地 `publish-config.local.json`（Git 忽略）写入：服务器 `175.178.101.30`、站点 `longshan-web`、用户 `IISUSER`
- 批量发布顺序：`jht → jiayue → sjtd → longshan → demo`

# 避坑指南

- **禁止**把真实密码提交进仓库；只写在已被忽略的 `scripts/publish-config.local.json`，或用环境变量 `IIS_LONGSHAN_PWD`
- 发布前确认 IIS 站点名确为 `longshan-web`（与 pubxml 一致），勿与 API 端口 `:86` 混淆
- 须用 `pnpm deploy:antd:longshan` 或 `publish-web.ps1 -Environment longshan`，脚本会校验产物 API 是否为 `http://175.178.101.30:86/api`
