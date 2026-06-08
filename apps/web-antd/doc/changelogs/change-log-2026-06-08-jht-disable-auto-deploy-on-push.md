# jht 取消 main push 自动发布

## 背景意图

代码推送到 `main` 后仅需自动发布浩瀚远洋 (hhyy)，津海通 (jht) 改为按需手动发布，避免双品牌并行部署。

## 核心逻辑变更

- `.github/workflows/deploy-web-antd-iis-jht.yml` 移除 `push` 触发，仅保留 `workflow_dispatch`。
- `.github/workflows/deploy-web-antd-iis.yml`（hhyy）保持 `main` push 自动发布不变。
- `brand-dev-build-commands.md` 更新 jht 触发说明为「仅手动」。

## 避坑指南

1. 发布 jht 须在 GitHub Actions 手动运行「生产环境前端自动发布 - 津海通 (jht)」。
2. `[skip ci]` 仅影响 hhyy 的 push 触发；jht 本就不随 push 运行。
3. 本地仍可用 `pnpm build:antd:jht` 构建后自行部署。
