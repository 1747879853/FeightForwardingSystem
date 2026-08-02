---
title: 业务联系单详情（已废弃）
module: 业务联系单
author: 前端团队
last_updated: 2026-08-02
---

# 1. 业务背景说明 (Background)

**白话解释：** 本页曾作为待审核/通过的独立纯展示页。现已取消：`/pre-order/:id/detail` 仅重定向到编辑页，交互统一在 `/pre-order/:id/edit` 完成。

# 2. 功能与操作说明 (Features & Operations)

- **当前行为：** 访问 `/pre-order/:id/detail` → 重定向 `/pre-order/:id/edit`。
- **保存控制：** 编辑页按状态显隐「保存 / 提交审核」，不再使用独立详情组件。

# 3. 状态流转说明 (Status Transitions)

无独立流转，见 [业务联系单编辑](./id-edit.md)。

# 4. 核心字段说明 (Field Definitions)

无。

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：路由仅兼容]** `/detail` 不再承载页面逻辑，勿再往该路径加功能。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-08-02 | `Feature` | 文档所属模块随侧边栏改为一级「业务联系单」；`/detail` 行为不变 | 路由归属 `pre-order.ts` 顶层树 |
| 2026-07-26 | `Feature` | 废弃独立详情页：删除 `detail.vue`，`/detail` redirect 到 `/edit` | 与「按状态显隐保存、不禁用表单」方案对齐 |
| 2026-07-26 | `Feature`/`Style` | 详情页独立纯展示且布局对齐编辑页 | （已废弃） |
| 2026-07-26 | `Feature` | 新增 `/pre-order/:id/detail` | （已废弃） |
