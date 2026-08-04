---
title: 海运进口列表
module: 海运进口
author: auto-doc-sync
last_updated: 2026-08-04
---

# 1. 业务背景说明 (Background)

**白话解释：** 海运进口列表是委托单检索、进入新建和编辑的业务入口。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/sea-imports` |
| 路由名称 | `SeaImportList` |
| 页面组件 | `src/views/sea-import-admin/list.vue` |
| 权限口径 | `Admin.SeaImport` |
| 关键源码 | `src/router/routes/modules/operation-management.ts`<br/>`src/views/sea-import-admin/list.vue`<br/>`src/views/sea-import-admin/data.ts`<br/>`src/views/sea-import-admin/use-sea-import-copy.ts`<br/>`src/api/sea-import/sea-import-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **委托检索：** 按查询区条件分页加载委托单（含进口特有筛选字段）。
- **分组统计：** 支持列表分组 Tabs。
- **复制 / 删除：** 工具栏复制（可选复制费用）、批量删除。
- **进入编辑：** 进入 `/sea-imports/:id/edit`。
- **进入新建：** 进入 `/sea-imports/create`。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作  | 目标状态 | 状态说明                           |
| :------- | :----------- | :------- | :--------------------------------- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **委托编号** | 运输单业务识别号。 | `src/views/sea-import-admin/data.ts` / `sea-import-admin.ts` | **触发/依赖：** 贯穿列表、编辑、费用与审核。 | 展示与查询口径以后端 DTO 为准。 |
| **客户** | 委托关联的客户主体。 | 客户选择组件与客户 API | **触发/依赖：** 影响账期、付款、对账等后续链路。 | 必须选择有效客户。 |
| **锁费状态** | 费用是否允许继续改动。 | 运输单详情字段 | **触发/依赖：** 影响订单费用、费用审核和锁费页面。 | 锁定后费用编辑能力受限。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：海运进口列表一致性]** 列表是业务链路入口，查询条件、表格列和编辑跳转必须与 `data.ts` 中 schema 保持一致。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-08-04 | `Feat` | 列表按进口接口重建列与搜索；支持分组统计、复制、删除；权限 `Admin.SeaImport`。 | 复制逻辑抽至 `use-sea-import-copy.ts`。 |
| 2026-07-12 | `Fix` | 列表仅点击 radio 才选中，单击行不再切换选中。 | `radioConfig.trigger` 由 `'row'` 改为 `'default'`；费用子表同步。 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/sea-imports` 对应组件 `src/views/sea-import-admin/list.vue`，权限口径为 未在路由中声明独立权限。 |
