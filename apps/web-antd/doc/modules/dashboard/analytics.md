---
title: 分析看板
module: 驾驶舱
author: auto-doc-sync
last_updated: 2026-09-29
---

# 1. 业务背景说明 (Background)

**白话解释：** 侧栏里的「拓客管理」已下线。页面组件还在仓库中，但不再出现在菜单里。打开旧地址会离开该页。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | 已下线，不再注册 |
| 路由名称 | 不再注册 |
| 页面组件 | `src/views/dashboard/analytics/index.vue`（未再挂到菜单） |
| 权限口径 | 菜单不可见。打开旧地址会改去工作台或第一个可见菜单 |
| 关键源码 | `src/router/routes/modules/dashboard.ts`<br/>`src/views/dashboard/analytics/index.vue` |

# 2. 功能与操作说明 (Features & Operations)

- **菜单：** 侧栏不再显示「拓客管理」。
- **旧地址：** 打开后离开该页，有工作台权限进工作台，否则进第一个可见菜单。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作  | 目标状态 | 状态说明                           |
| :------- | :----------- | :------- | :--------------------------------- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **路由路径** | 分析看板入口。 | `src/router/routes/modules/dashboard.ts` | **触发/依赖：** 受动态路由注册控制。 | 需要登录后进入。 |
| **页面组件** | 看板渲染入口。 | `src/views/dashboard/analytics/index.vue` | **触发/依赖：** 由 `Analytics` 路由懒加载。 | 组件需保持单页面入口稳定。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：分析看板一致性]** 指标口径来自前端组件与后端数据契约，文档只记录路由和页面职责，不替代真实统计口径说明。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-09-29 | `Fix` | 拓客管理从菜单下线。打开旧地址会离开该页。 | 非浩瀚远洋登录改去工作台；没有工作台权限时去第一个可见菜单。详见 [变更日志](../../changelogs/change-log-2026-09-29-去掉拓客管理并调整登录首页.md)。 |
| 2026-09-16 | `Fix` | `/analytics` 去掉 `Page.Home` 路由权限，登录即可进首页。 | 工作台仍用 `Admin.Workbench`；hhyy 地球看板本来就无 `authority`。 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/analytics` 对应组件 `src/views/dashboard/analytics/index.vue`，权限口径为 未在路由中声明独立权限。 |
