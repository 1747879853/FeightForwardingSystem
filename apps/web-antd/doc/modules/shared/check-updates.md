---
title: 检查更新
module: 共享能力
author: auto-doc-sync
last_updated: 2026-09-13
---

# 1. 业务背景说明 (Background)

**白话解释：**  
登录后的根布局会定时探测前端是否已发新包。发现新包后弹出「新版本可用」，用户点刷新整页重载。不绑定具体业务路由。

# 2. 功能与操作说明 (Features & Operations)

- **开关与间隔：** `preferences.app.enableCheckUpdates`、`checkUpdatesInterval`（分钟，默认 1）。
- **探测请求：** `GET {BASE_URL}version.json?_t=`，比对 JSON 的 `id`（或 `entry`）。
- **构建产物：** 应用 build 时由 `vite:emit-version-json` 写出 `version.json`：`id`/`entry` 给检查更新；`commit`/`builtAt`/`dirty` 给发布记录对齐 git，运行时不参与比对。
- **本地：** `localhost` / `127.0.0.1` 不探测。
- **切回标签：** 页签从隐藏到可见时立即探测一次。

# 3. 状态流转说明 (Status Transitions)

| 当前状态   | 触发人/动作    | 目标状态 | 状态说明                  |
| :--------- | :------------- | :------- | :------------------------ |
| 已记录指纹 | 下次 `id` 相同 | 保持     | 不弹窗                    |
| 已记录指纹 | 下次 `id` 不同 | 弹窗     | 停轮询，点刷新后 `reload` |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **id** | 本次构建 js/css 文件名指纹 | **构建产物**<br/>`version.json` | **触发：** 与内存中上次指纹不同则弹窗 | 8 位内容哈希 |
| **entry** | 入口 JS 路径 | **构建产物**<br/>`version.json` | **依赖：** `id` 缺失时回退 | 如 `/jse/index-index-xxx.js` |
| **commit** | 构建时 HEAD 的 40 位 SHA | **构建产物**<br/>`git rev-parse HEAD` | **不参与**检查更新；发布记录作 `git log` 起点 | 无 git 时省略 |
| **builtAt** | 构建完成时刻 | **构建产物**<br/>UTC ISO | 给人看，不参与比对 | 如 `2026-09-13T07:21:00.000Z` |
| **dirty** | 构建时工作区有未提交改动 | **构建产物**<br/>`git status --porcelain` | 仅脏时写出 `true`；Wiki 需标明 | 干净工作区不出现该字段 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：旧包没有 version.json]** 未重新打包部署 -> 探测失败，不弹窗，等于关掉检查更新。
>
> **[卡点 2：不要用首页 etag]** IIS 压缩缓存冷热切换会使 `HEAD /` 的 etag/体积变化 -> 未发版也弹窗。
>
> **[卡点 3：commit 不是检查更新指纹]** `commit` 是 git SHA，`id` 才是 js/css 文件名哈希。只改静态资源、未进 js/css 时 `id` 可能不变；工作区脏时 `commit` 仍是 HEAD，产物并不等于该提交。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-09-13 | `Feature` | `version.json` 增写 git `commit`、`builtAt`；工作区不干净时带 `dirty`。检查更新弹窗逻辑不变。 | 插件 `readGitBuildMeta` 用 `execSync`，失败不阻断构建。详见 [变更日志](../../changelogs/change-log-2026-09-13-version-json-git-commit.md)。 |
| 2026-08-13 | `Fix` | 检查更新改为拉取 `version.json`，避免 IIS etag 误报。 | 详见 [变更日志](../../changelogs/change-log-2026-08-13-check-updates-version-json.md)。 |
