# hhyy 取消 main push 自动发布

## 背景意图

浩瀚远洋已改走本地 `pnpm deploy:antd:hhyy`（站点 `hhyy-web`）。`main` 推送再自动发 GitHub 那条 workflow，会和本地发布互相覆盖，先关掉 push 触发。

## 核心逻辑变更

- `.github/workflows/deploy-web-antd-iis.yml` 移除 `push` 触发，仅保留 `workflow_dispatch`，与津海通一致。
- 日常发布用 `pnpm deploy:antd:hhyy`；GitHub 上仍可手动跑「生产环境前端自动发布 - 浩瀚远洋 (hhyy)」。

## 避坑指南

1. 本改动必须合进 `main` 后才会真正停掉自动发布；未推送前，远端 workflow 仍会在 push 时跑。
2. 需要临时用 GitHub 发一次时，到 Actions 手动 `Run workflow`。
3. `[skip ci]` 不再影响 hhyy/jht 发布（两条都不跟 push）。
