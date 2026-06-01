# 双品牌 IIS 发布改为 dist.zip 包上传（hhyy/jht）

## 背景意图

原流程直接以 `contentPath` 同步 `dist` 目录，文件数量多、传输开销较大。此次调整为先打包再部署，降低网络传输体积并保持现有 IIS 发布能力。

## 核心逻辑变更

- `deploy-web-antd-iis.yml`（hhyy）新增打包步骤：将 `apps/web-antd/dist` 生成 `web-antd-dist-hhyy.zip`（MSDeploy package）。
- `deploy-web-antd-iis-jht.yml`（jht）新增打包步骤：将 `apps/web-antd/dist` 生成 `web-antd-dist-jht.zip`（MSDeploy package）。
- 两条 workflow 的 `whatif` 与正式部署步骤，统一由 `-source:contentPath` 切换为 `-source:package`。
- 补充品牌打包文档说明：发布链路为“构建 dist → 生成 dist.zip → 上传并在目标 IIS 侧自动解包同步”。

## 避坑指南

1. 该 zip 为 **MSDeploy package**，不是普通压缩包；请继续使用 `msdeploy.exe` 部署，不要改用手工解压覆盖。
2. 若部署报 `Package not found`，优先检查打包步骤是否成功，以及 `RUNNER_TEMP` 路径是否可写。
3. 如需复核优化效果，可对比日志中的 `package size` 与历史目录同步耗时。
