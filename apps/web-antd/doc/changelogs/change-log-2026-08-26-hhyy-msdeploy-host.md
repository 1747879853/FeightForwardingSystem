# 浩瀚远洋 IIS 发布改到独立机 47.105.61.173

## 背景意图

浩瀚远洋业务机已独立为 `47.105.61.173`（接口 `:84`）。前端 IIS / WebDeploy 仍指向津海通同机 `43.138.14.122` 会发错站。

## 核心逻辑变更

- 本地 `publish-config.local.json` 的 `hhyy.serverIp` 改为 `47.105.61.173`；用户仍为 `IISUSER`，密码只写该 Git 忽略文件。
- `publish-config.example.json` 的 hhyy 模板改为同一 IP、用户 `IISUSER`，密码留空。
- 文档同步：日常发布目标不再写成「与津海通同机」。

GitHub Actions 的 hhyy workflow 仍读 Secret `IIS_SERVER_IP` / `IIS_USER` / `IIS_PWD`，本机无法改仓库 Secrets，须在 GitHub 上手改到新机。

## 避坑指南

- **禁止**把 WebDeploy 密码提交进仓库或写进 changelog。
- 新机 WebDeploy 端口 `8172` 需放行；与接口 `:84` 不是同一端口。
- 站点名仍为 `hhyy-web`。若 GitHub Secret `IIS_MSDEPLOY_ENDPOINT` 写死了旧 IP，也要一起改。
- 发布前仍须 `pnpm build:antd:hhyy`，产物 API 应为 `http://47.105.61.173:84/api`。
