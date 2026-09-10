---
title: 全量发布默认并发改为 5 路
date: 2026-09-10
module: brand-pack
---

# 背景意图

接入青港 / 青岛海鼎 / 山东金冠后 `deploy:antd:all` 变成 10 套。默认不限并发会 10 路同时 Vite，Windows 上 `fs.realpathSync.native` 报 `UNKNOWN`，部分进程还会 V8 Fatal error。需要把默认并发降下来，又不要压得太死。

# 核心逻辑变更

- `scripts/publish-all-web.ps1` 默认 `ThrottleLimit=5`（10 套分两波）
- 仍可用 `-ThrottleLimit 2` 再降，或 `-ThrottleLimit 0` 全开

# 避坑指南

- 再出现 `realpath UNKNOWN` 先降到 2，不要先改品牌 env
- `0` 仍表示按环境数全开，只是不再作为默认
