---
title: 本地全量发布改为按品牌独立 dist 并行
date: 2026-08-17
module: brand-pack
---

# 背景意图

`deploy:antd:all` 原先串行共用 `apps/web-antd/dist`，后一个品牌会覆盖前一个产物，无法并行。需要各品牌独立目录并行打包并发布，且不能改动浩瀚远洋（hhyy）的 GitHub Actions 自动发布。

# 核心逻辑变更

- 本地 `publish-web.ps1` 构建时追加 `--outDir dist-<品牌>` 与独立 Vite cache，产物落到 `apps/web-antd/dist-<品牌>`
- 仅在传入 `--outDir` 时把品牌 `public` 拷到 `.brand-public/<mode>`，避免并行构建互相改写共享 `public/`
- `publish-all-web.ps1` 先共享一次 `@vben-core` prebuild，再按 `-ThrottleLimit`（默认 5）并行打包与 MSDeploy
- **不包含 hhyy**：GitHub workflow 仍执行 `pnpm build:antd:hhyy`，默认写入 `apps/web-antd/dist`

# 避坑指南

- 不要给 hhyy / GitHub 构建设置 `WEB_ANTD_OUT_DIR`，否则会偏离现有 `dist` 路径
- `-SkipBuild` 读取的是 `dist-<环境>`，不再是共享 `dist`
- 本机内存不足时用 `.\scripts\publish-all-web.ps1 -ThrottleLimit 2` 降低并发
- 并行日志在 `output/releases/<品牌>/publish.stdout.log`；是否成功以同目录 `publish.result=SUCCESS` 为准，不要只看进程 exit 0
- 汇总会打印各品牌耗时和整次 `deploy:antd:all` 总耗时（含共享 prebuild）
- pnpm 额外 `--outDir` 会被当成字面参数传给 vite 而失效，隔离目录改走环境变量 `WEB_ANTD_OUT_DIR`
