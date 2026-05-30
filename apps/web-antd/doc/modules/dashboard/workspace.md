---
title: 工作台
module: 驾驶舱
author: auto-doc-sync
last_updated: 2026-05-30
---

# 1. 业务背景说明 (Background)

**白话解释：** 工作台承载“海运出口服务 / 应收应付审核 / 付费申请审核”三大业务入口；三个入口均已提供统一的顶部查询区与业务列表视图，其中海运出口服务仍按起运港 + 服务项节点组织任务，两个审核入口聚焦审核任务浏览与进入处理页。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/workspace` |
| 路由名称 | `Workspace` |
| 页面组件 | `src/views/dashboard/workspace/index.vue` |
| 权限口径 | 未在路由中声明独立权限 |
| 关键源码 | `src/router/routes/modules/dashboard.ts`<br/>`src/views/dashboard/workspace/index.vue`<br/>`src/api/sea-export/se-service-task-admin.ts`<br/>`src/api/audit-approval/expense-admin.ts`<br/>`src/api/audit-approval/payment-review-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **顶层业务入口：**
  - Tab1：海运出口服务（已对接）
  - Tab2：应收应付审核（已对接列表）
  - Tab3：付费申请审核（已对接列表）
- **海运出口服务查询：**
  - 接口：`SeServiceTaskAdmin/GetWorkbenchListAsync`
  - 条件：ETD 区间、客户、船公司、MBL、POD、任务状态（待处理/已处理）
- **审核 Tab 查询与列表：**
  - 应收应付审核接口：`OrderFeeAdmin/OrderFeeTaskListAsync`
  - 付费申请审核接口：`PaymentApplicationAdmin/PayAppTaskListAsync`
  - 查询区样式复用海运出口风格，但字段按审核接口能力独立配置（不再复用海运出口字段）；列表统一复用工作台业务表格组件。
- **任务分组展示：**
  - 头部按起运港（POL）切换，并展示该港口任务数 Badge
  - 内容区按服务项（ServiceType）分组展示任务，支持“指派任务”汇总组
- **任务处理动作：**
  - 批量转交：`TransferAsync`（被转交人来自 `UserSelect` 全量用户）
  - 单条/批量完成：`CompleteAsync`（批量为逐条调用）
- **保留 mock 区域：**
  - 紧急处理任务区块：仍用 mock
  - 异常业务区块：仍用 mock

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| 页面初始 | 用户进入 `/workspace` | 拉取任务列表 | 默认查询待处理任务并渲染港口+服务项分组 |
| 待处理任务 | 批量转交 | 待处理任务（被转交） | 调用 `TransferAsync`，更新 `assigneeUserId/assigneeTime` |
| 待处理任务 | 完成任务 | 已处理任务 | 调用 `CompleteAsync`，任务状态改为 Processed |
| 待处理/已处理切换 | 点击状态切换按钮 | 重新查询 | `serviceTaskStatus` 在 0/1 间切换并重新拉取 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **serviceTaskStatus** | 任务状态，0=待处理，1=已处理。 | `SeServiceTaskAdmin/GetWorkbenchListAsync` | **触发/依赖：** 顶部“处理中/已处理”切换改变查询参数。 | 只允许在枚举值 0/1 内切换。 |
| **polId / pol** | 起运港与起运港名称。 | `GetWorkbenchListAsync.items[].pol` | **触发/依赖：** 构建港口切换头部与港口任务数 Badge。 | 若无返回则使用配置分组 key 兜底。 |
| **serviceType** | 服务项类型（0-5）。 | `GetWorkbenchListAsync.items[].seServiceConfigItems[]` | **触发/依赖：** 映射为流程节点标题（订舱、拖车、报关、仓库、保险、代收支）。 | 为空时识别为“指派任务”汇总组。 |
| **assigneeUserId** | 被转交人 ID。 | `SeServiceTaskDto.assigneeUserId` | **触发/依赖：** 转交后在任务行展示被转交人。 | 转交时由 `TransferAsync` 校验权限与状态。 |
| **ids + assigneeUserId** | 批量转交入参。 | `TransferAsync` | **触发/依赖：** 由表格勾选行 + 转交弹窗用户选择组装。 | 被转交人不能为空，任务需可转交。 |
| **id** | 完成任务入参。 | `CompleteAsync` | **触发/依赖：** 行内完成或批量完成逐条提交。 | 任务需处于待处理且当前用户有处理权限。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：指派汇总组的空服务项类型]** 工作台综合查询中“指派任务汇总组”的 `serviceType` 为空，前端必须以独立分组处理，不能按普通服务项节点逻辑直接渲染。

> [!IMPORTANT] **[卡点 2：批量完成是逐条调用]** `CompleteAsync` 为单条接口。批量完成必须逐条提交，并注意失败场景下的提示和刷新时机。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-05-30 | `Feature` | 工作台“应收应付审核 / 付费申请审核”两个 Tab 由占位改为可用视图：新增审核专用搜索表单（样式对齐海运出口，字段改为各自接口支持条件）并展示审核业务列表，同时接入对应审核 API 与页面跳转。 | `workspace/index.vue` 对三类 Tab 进行分支化数据加载、独立筛选模型与查询参数映射；`WorkbenchReviewFilterBar` 承载审核查询字段；`WorkbenchBusinessTable` 增加 `enableTaskActions` 开关，审核场景关闭海运任务专属批量动作以避免接口误调用。 |
| 2026-05-30 | `Refactor` | 工作台服务项节点文案改为复用统一 `ServiceType` 枚举映射，移除本地硬编码文案表。 | `workspace/index.vue` 初始化时动态加载统一枚举并构建映射；`workbench-data.ts` 仅保留可注入的兜底 map，避免展示口径与其他页面分叉。 |
| 2026-05-25 | `Feature` | 工作台海运出口服务页对接 `SeServiceTaskAdmin` 查询/转交/完成接口，支持按港口+服务项节点展示任务，完成批量转交与单条/批量完成链路，紧急与异常区块继续使用 mock。 | 新增服务项枚举映射与“指派任务汇总组”渲染分支；筛选模型与 API 参数对齐，页面由静态 mock 切换为后端驱动。 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/workspace` 对应组件 `src/views/dashboard/workspace/index.vue`，权限口径为 未在路由中声明独立权限。 |
