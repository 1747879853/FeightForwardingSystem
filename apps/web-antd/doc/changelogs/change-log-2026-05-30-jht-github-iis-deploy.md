# 津海通 (jht) GitHub Actions IIS 自动发布

## 背景意图

津海通此前仅支持本地 `pnpm build:antd:jht` 后手动发布；与浩瀚远洋 (hhyy) 对齐，在 `main` 合并后自动构建并 MSDeploy 到 IIS。

## 核心逻辑变更

- 新增 `.github/workflows/deploy-web-antd-iis-jht.yml`：`pnpm build:antd:jht` → MSDeploy，并发组 `web-antd-iis-deploy-jht-*` 与 hhyy 互不取消。
- 部署目标使用独立 Secrets 前缀 `IIS_JHT_*`，避免覆盖 hhyy 站点。
- hhyy workflow 显示名称改为「浩瀚远洋 (hhyy)」，便于 Actions 列表区分。
- `brand-dev-build-commands.md` 补充双品牌 CI 与 Secrets 对照表。

## 避坑指南

1. 首次启用须在 GitHub 配置全部 `IIS_JHT_*`；可与 hhyy 同 IP/账号，但 `IIS_JHT_SITE_NAME` 必须指向 jht 站点物理目录。
2. `main` 一次 push 会**并行**触发 hhyy 与 jht 两条 workflow；若仅需发布一方，用 `[skip ci]` 会跳过双方，或改用手动 `workflow_dispatch` 单跑。
3. 未配置 Secrets 时 job 会在部署步骤因空凭据失败，属预期行为。
