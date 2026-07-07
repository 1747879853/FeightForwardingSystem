---
title: 运踪订阅文案去品牌化
module: 海运出口 / 外部Api对接
author: auto-doc-sync
last_updated: 2026-07-07
---

# 1. 背景意图 (Background)

**白话解释：** 云当(Trackingeyes)为内部对接的第三方运踪服务，页面不应向用户暴露服务商名称。将按钮、弹窗标题、结果 Modal 等用户可见文案统一改为「运踪订阅」。

# 2. 核心逻辑变更 (Core Logic)

- `zh-CN`：`subscribe` / `subscribeTitle` →「运踪订阅」；`result.title` →「运踪订阅结果」。
- `en-US`：移除 Yundang 字样，改为 `Tracking Subscribe` / `Tracking Subscribe Result`。
- 内部 API 路径、`useYundangOceanSubscribe`、文件命名等代码标识不变。

# 3. 避坑指南 (Blockers)

> [!IMPORTANT] 仅调整 i18n 与活文档中的**用户可见**文案；后端接口名、代码模块名仍保留 yundang 以便开发对接。

# 4. 变更日志 (Changelog)

| 日期 | 变更类型 | 业务功能变动 | 代码解析与架构洞察 |
| :-- | :-- | :-- | :-- |
| 2026-07-07 | `Style` | 页面「云当订阅」改为「运踪订阅」，隐藏第三方服务品牌 | 仅 `seaExport.yundang` i18n 键值变更 |
