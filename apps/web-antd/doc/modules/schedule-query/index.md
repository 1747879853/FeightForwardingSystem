---
title: 船期查询
module: 航线管理
author: auto-doc-sync
last_updated: 2026-07-16
---

# 1. 业务背景说明 (Background)

**白话解释：** 对接飞驼船期实时查询，供业务按港口/船期条件检索航线船期信息。侧边栏位于「航线管理」分组下，子菜单为「船期查询」。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/schedule` |
| 路由名称 | `ScheduleQueryList` |
| 页面组件 | `src/views/schedule-query/list.vue` |
| 权限口径 | `Admin.Schedule` / `Admin.Schedule.Get` |
| 关键源码 | `src/router/routes/modules/freight-rate.ts`<br/>`src/views/schedule-query/list.vue`<br/>`src/api/schedule/feituo-schedule-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **船期查询：** 按条件调用飞驼 `QueryScheduleAsync` 实时查询船期（不落库）。
- **菜单归属：** 与「运价查询」同属侧边栏「航线管理」分组。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作  | 目标状态 | 状态说明                           |
| :------- | :----------- | :------- | :--------------------------------- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **查询条件** | 船期检索入参。 | `FeituoScheduleAdmin/QueryScheduleAsync` | **触发/依赖：** 提交后刷新列表结果。 | 以后端校验为准。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：实时查询]** 船期数据来自第三方实时接口，不落库；刷新与网络异常需有明确提示。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-07-16 | `Refactor` | 船期查询从独立「船期管理」顶级菜单并入「航线管理」；URL `/schedule` 不变。 | 删除 `schedule.ts`；子路由挂在 `freight-rate.ts`，父级权限聚合 `SeFreiPrice`+`Schedule`。 |
