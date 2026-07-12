---
title: 运价查询
module: 航线管理
author: auto-doc-sync
last_updated: 2026-07-12
---

# 1. 业务背景说明 (Background)

**白话解释：** 维护海运运价信息，为委托费用测算和报价提供基础数据入口。侧边栏位于「航线管理」分组下，子菜单名称为「运价查询」，页面路由仍为 `/freight-rate`。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/freight-rate` |
| 路由名称 | `FreightRateList` |
| 页面组件 | `src/views/sea-export-admin/freight-rate/list.vue` |
| 权限口径 | 未在路由中声明独立权限 |
| 关键源码 | `src/router/routes/modules/freight-rate.ts`<br/>`src/views/sea-export-admin/freight-rate/list.vue`<br/>`src/views/sea-export-admin/freight-rate/data.ts`<br/>`src/api/sea-export/freight-rate-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **运价查询：** 按航线、港口、船公司、箱型等维度检索运价。
- **搜索项设置：** 可通过列表工具栏入口调整搜索字段的显示与顺序，设置弹层显示在工具栏下方。
- **航线 Tab 筛选：** 列表工具栏左侧展示「全部 + 各航线」Tab；超出可视区域时可点击左右箭头平滑滚动浏览，并与右侧操作按钮保持固定间距。
- **运价维护：** 通过运价表单或弹窗维护费率明细。
- **批量新增：** 列表页打开批量新增弹窗，支持一次新增多行运价；新增/复制行采用批量 `loadData` 插入并显示 loading，减少多行插入卡顿。
- **批量/同步：** 相关模块包含同步更新与箱型费用维护能力。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作  | 目标状态 | 状态说明                           |
| :------- | :----------- | :------- | :--------------------------------- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **航线/港口** | 运价适用范围。 | `src/views/sea-export-admin/freight-rate/data.ts` | **触发/依赖：** 影响委托匹配运价。 | 需选择有效基础资料。 |
| **箱型费用** | 不同箱型的费率明细。 | `freight-rate/modules/add-ctn-modal.vue` | **触发/依赖：** 与运价主记录关联。 | 金额和币种需合法。 |
| **运价 API** | 运价后端契约。 | `src/api/sea-export/freight-rate-admin.ts` | **触发/依赖：** 列表、保存、同步更新均依赖该契约。 | 接口字段变化需同步文档。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：运价管理一致性]** 运价管理与海运出口业务耦合较强，更新费率时需确认是否影响历史委托或仅影响后续业务。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-07-12 | `Fix` | 修复点击「搜索项设置」后弹层被工具栏裁剪、看似无响应的问题。 | 工具栏允许溢出显示，航线 Tab 仍由自身容器负责横向裁剪与滚动。 |
| 2026-07-11 | `Refactor` | 侧边栏由独立「运价管理」改为「航线管理」分组下的「运价查询」子菜单；页面 path 与组件不变。 | `freight-rate.ts` 父级 `title` 为「航线管理」，`order: 190`；子路由 `FreightRateList` title 为「运价查询」。 |
| 2026-06-12 | `Feature` | 列表航线 Tab 靠左展示，超出时可左右滚动切换，且不再挤占右侧批量操作按钮。 | Tab 区与按钮区分 slot 布局；滚动动画期间只改 DOM，结束后再更新 Vue 滚动状态。 |
| 2026-06-12 | `Fix` | 批量新增弹窗一次新增多行时改为批量插入并增加 loading 反馈，减轻 10 行级卡顿。 | `insertRowsBatch` 合并 `getFullData` + `loadData` 替代循环 `insertAt`；复制行同步走同一路径。 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/freight-rate` 对应组件 `src/views/sea-export-admin/freight-rate/list.vue`，权限口径为 未在路由中声明独立权限。 |
