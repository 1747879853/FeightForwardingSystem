# 变更记录：全量发布默认不限制并发

## 背景意图

`pnpm deploy:antd:all` 默认 `ThrottleLimit=6`，接入佳越测试后环境变成 7 套，演示会被排到第二波，总耗时多出一整轮构建。日常希望一次把全部站点发完。

## 核心逻辑变更

- `scripts/publish-all-web.ps1` 默认 `ThrottleLimit=0`，表示不限制，按 `$environments.Count` 全量并行。
- 仍保留参数：机器吃紧时可 `.\scripts\publish-all-web.ps1 -ThrottleLimit 2`。

## 避坑指南

- 7 路同时 Vite + MSDeploy 会吃满 CPU/内存；本机卡死时再显式降并发，不要改回默认 6。
- 上限校验改为 `0–32`；`0` 只表示“跟环境数走”，不会真的开 0 路。
