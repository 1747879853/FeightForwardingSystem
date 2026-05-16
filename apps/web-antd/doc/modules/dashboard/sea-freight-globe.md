---
title: 海运 3D 地球看板
module: 驾驶舱
author: auto-doc-sync
last_updated: 2026-05-16
---

# 1. 业务背景说明 (Background)

**白话解释：** 用于以地球可视化方式展示海运相关数据，是 dashboard 分组下的专题看板。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/dashboard/sea-freight-globe` |
| 路由名称 | `SeaFreightGlobe` |
| 页面组件 | `src/views/dashboard/sea-freight-globe/index.vue` |
| 权限口径 | 未在路由中声明独立权限 |
| 关键源码 | `src/router/routes/modules/dashboard.ts`<br/>`src/views/dashboard/sea-freight-globe/index.vue` |

# 2. 功能与操作说明 (Features & Operations)

- **三维看板：** 进入 `/dashboard/sea-freight-globe` 后加载海运地球看板。
- **分组菜单：** 作为 `/dashboard` 子路由展示，标题为“海运 3D 地球看板”。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作  | 目标状态 | 状态说明                           |
| :------- | :----------- | :------- | :--------------------------------- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **路由路径** | 海运看板入口。 | `src/router/routes/modules/dashboard.ts` | **触发/依赖：** 依附 `/dashboard` 分组。 | 需要登录后访问。 |
| **页面组件** | 三维可视化页面。 | `src/views/dashboard/sea-freight-globe/index.vue` | **触发/依赖：** 由 `SeaFreightGlobe` 路由懒加载。 | 注意图形性能与数据加载时机。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：海运 3D 地球看板一致性]** 三维可视化页面对性能敏感，后续调整需关注首次渲染、动画帧率和异常降级。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/dashboard/sea-freight-globe` 对应组件 `src/views/dashboard/sea-freight-globe/index.vue`，权限口径为 未在路由中声明独立权限。 |
