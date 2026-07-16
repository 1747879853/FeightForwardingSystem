# 津海通本地打包与 IIS 发布脚本

## 背景意图

津海通原有发布流程只存在于 GitHub Actions，开发人员在本地需要手工重复 jht 构建、MSDeploy 打包和 IIS 同步步骤，容易误用 Vite 命令或发布到错误站点。本次将 CI 中已验证的流程收敛为 Windows PowerShell 脚本。

## 核心逻辑变更

- 新增 `scripts/deploy-jht.ps1`，按“jht 构建 → 产物校验 → MSDeploy 打包 → 端口检查 → WhatIf → 二次确认 → 正式同步”执行。
- 新增 `pnpm deploy:antd:jht` 根目录命令。
- IIS 地址、站点和凭据从 `IIS_JHT_*` 环境变量或脚本参数读取；密码缺失时使用安全输入，不在日志中输出。
- 发布前校验 `dist/_app.config.js` 包含 `.env.jht` 的 API，阻止错误环境产物上线。
- 与 jht Workflow 保持相同的 `AppOffline`、重试和跳过规则，保留站点验证文件、`logs` 与 `data`。
- 支持只预览、跳过构建、安装依赖和受控免确认等本地发布选项。

## 避坑指南

- GitHub Actions Secrets 无法读取回本机，首次使用前必须在当前 PowerShell 会话配置 `IIS_JHT_*`。
- 必须使用 `pnpm build:antd:jht` 或脚本内置构建，不能直接执行 `pnpm vite build --mode jht`，否则 `_app.config.js` 可能回退读取 `.env.production`。
- `apps/web-antd/dist.zip` 是 Vite 普通压缩包；脚本生成的临时 ZIP 才是 MSDeploy package，不可混用。
- `-SkipBuild` 会复用现有 `dist`，但脚本仍会校验 jht API；发布旧版本前应确认 `index.html` SHA256。
- 正式同步未启用自动备份，默认必须输入 `jht` 二次确认；使用 `-Force` 前应确保目标站点和发布窗口正确。
