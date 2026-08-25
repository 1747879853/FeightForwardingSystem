# 浩瀚远洋接入本地 MSDeploy 自动发布

## 背景意图

浩瀚远洋此前只走 GitHub Actions 自动发布，未纳入本地 `publish-web.ps1` / `deploy:antd:all`。后端已迁到金海通同机 `:88`，需要本机也能一键发到 IIS 站点 `hhyy-web`。

## 核心逻辑变更

- `publish-web.ps1` / `publish-all-web.ps1` 支持环境 `hhyy`，全量并行默认并发改为 6。
- 根目录新增 `pnpm deploy:antd:hhyy`；`@vben/web-antd` 新增 `build-only:hhyy`（发布脚本用它保留 `--mode`）。
- `publish-config.example.json` 增加 `hhyy` 项，站点名 `hhyy-web`。
- 本地 `publish-config.local.json`（Git 忽略）写入：服务器 `43.138.14.122`、站点 `hhyy-web`。
- GitHub Actions 的 hhyy workflow 仍使用默认 `apps/web-antd/dist`，不受本地 `dist-hhyy` 影响。
- `.env.hhyy` / `.env.production` 的 `VITE_ARCHIVER` 改为 `false`，与其它本地发布品牌一致，避免 `build-only:hhyy` 在 `dist-hhyy` 产物之外再压硬编码 `dist.zip` 导致 pnpm 退出码 1。
- `publish-web.ps1` 读取 `.env.<品牌>` 时改用 UTF-8，避免 Windows PowerShell 5.1 默认 GBK 把中文注释与下一行 `VITE_GLOB_API_URL` 粘成一行，校验失败却被 trap 静默 `exit 1`。

## 避坑指南

- **禁止**把真实密码提交进仓库；只写在已被忽略的 `scripts/publish-config.local.json`，或用环境变量 `IIS_HHYY_PWD`。
- 发布前确认 IIS 站点名确为 `hhyy-web`，勿与接口端口 `:88` 或津海通站点混淆。
- 须用 `pnpm deploy:antd:hhyy` 或 `publish-web.ps1 -Environment hhyy`，脚本会校验产物 API 是否为 `http://43.138.14.122:88/api`。
- 本地发布不要开 `VITE_ARCHIVER`：插件固定压缩 `dist`，与 `dist-hhyy` 隔离产物冲突，构建看起来成功但 `pnpm` 仍会 `ELIFECYCLE` 退出 1。GitHub 发布用 MSDeploy 自己打 zip，不依赖这份 `dist.zip`。
- Windows PowerShell 5.1 读取无 BOM 的 UTF-8 `.env` 时会把中文注释行与下一行粘在一起；发布脚本必须 `-Encoding UTF8`，否则会报找不到 `VITE_GLOB_API_URL`。
- `main` 推送不再触发 GitHub hhyy 自动发布（仅保留手动 `workflow_dispatch`）；日常用 `pnpm deploy:antd:hhyy`。
