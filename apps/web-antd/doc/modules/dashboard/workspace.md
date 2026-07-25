---
title: 工作台
module: 驾驶舱
author: auto-doc-sync
last_updated: 2026-07-24
---

# 1. 业务背景说明 (Background)

**白话解释：** 工作台承载“海运出口服务 / 应收应付审核 / 付费申请审核”三大业务入口；三个入口均已提供统一的顶部查询区与业务列表视图，其中海运出口服务仍按起运港 + 服务项节点组织任务，两个审核入口聚焦审核任务浏览与进入处理页。应收应付审核筛选字段与 `/audit-approval/expense-review` 对齐。

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
  - 统计接口：`SeServiceTaskAdmin/GetWorkbenchCountAsync`（起运港 Tab + 服务项 Badge）
  - 列表接口：`SeServiceTaskAdmin/GetWorkbenchPagedListAsync`（按 `POLId` + `ServiceType` 分页，指派任务不传 `ServiceType`；分页参数 `PageIndex`/`PageSize`，页码从 1 开始）
  - 条件：ETD 区间（ISO 闭区间）、客户、船公司、**编号（Keyword：主提单号/订舱编号/委托编号）**、POD、任务状态（待处理/已处理）；已移除独立 MBL 条件
  - 动态列：切换起运港时拉 `SeServiceConfigAdmin` 详情，按 `seServiceShows` 渲染
  - 分页：默认 20 条，可选 10/20/50
- **审核 Tab 查询与列表：**
  - 应收应付审核接口：`OrderFeeAdmin/OrderFeeTaskListAsync`
  - 付费申请审核接口：`PaymentApplicationAdmin/PayAppTaskListAsync`
  - 应收应付筛选字段：处理状态、业务类型、业务编号、客户、ETD、截止日期、销售、操作（对齐费用审核列表页）。
  - 付费申请筛选字段：处理状态、业务编号、申请单号、结算对象、币种、提交时间、申请人、审核人。
  - 查询区：`WorkbenchReviewFilterBar` 使用 CSS Grid（`auto-fill`），label 固定宽；按钮组占最后一列并右对齐，换行后与首行内容右缘对齐；列表统一复用工作台业务表格组件。筛选区内 Select 与 Input 同宽（`width: 100%`，不定死 170px）。
  - 审核 Tab 表格：卡片上边距 12px，单元格左右内边距 8px（仅审核 Tab）。
- **任务分组展示：**
  - 头部按起运港（POL）切换，并展示该港口任务数 Badge
  - 内容区按服务项（ServiceType）分组展示任务，支持“指派任务”汇总组
- **海运出口业务列表动态列：**
  - 列由当前 chevron 服务项的 `seServiceShows`（`SeaExportPropEnum`）驱动，严格 1 枚举 1 列，顺序与配置数组一致
  - 固定列始终显示：委托单号、处理人；「转交任务」节点额外显示转交备注列；`seServiceShows` 为空时不展示业务列
  - 表头文案取自 `SeaExportPropEnum` 枚举 `displayName`；审核 Tab 仍使用固定列，不受 `seServiceShows` 影响
- **行选中：** 海运出口服务业务列表**仅点击 checkbox 才选中**，单击行不切换选中；双击行仍进入编辑。
- **任务处理动作：**
  - 批量转交：`TransferAsync`（被转交人来自 `UserSelect` 全量用户）
  - 单条/批量完成：`CompleteAsync`（批量为逐条调用）
- **业务列表行跳转：**
  - 单击委托单号或双击整行：进入对应业务编辑/详情（海运出口编辑页、应收应付费用详情、付费申请编辑页）
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
| **serviceTaskStatus** | 任务状态，0=待处理，1=已处理。 | `GetWorkbenchCountAsync` / `GetWorkbenchPagedListAsync` | **触发/依赖：** 顶部“处理中/已处理”切换改变查询参数。 | 只允许在枚举值 0/1 内切换。 |
| **polId / pol** | 起运港与起运港名称。 | `GetWorkbenchCountAsync.items[]` | **触发/依赖：** 构建港口切换头部与港口任务数 Badge。 | 无数据时展示空态。 |
| **serviceType** | 服务项类型（0-5）。 | Count `serviceItems[]`；PagedList 查询参数 | **触发/依赖：** 映射为流程节点标题；为空代表指派任务。 | 指派任务不传 `ServiceType`。 |
| **assigneeUserId** | 被转交人 ID。 | `SeServiceTaskDto.assigneeUserId` | **触发/依赖：** 转交后在任务行展示被转交人。 | 转交时由 `TransferAsync` 校验权限与状态。 |
| **ids + assigneeUserId** | 批量转交入参。 | `TransferAsync` | **触发/依赖：** 由表格勾选行 + 转交弹窗用户选择组装。 | 被转交人不能为空，任务需可转交。 |
| **id** | 完成任务入参。 | `CompleteAsync` | **触发/依赖：** 行内完成或批量完成逐条提交。 | 任务需处于待处理且当前用户有处理权限。 |
| **seServiceShows** | 当前服务项向用户展示的海运出口字段（枚举数组）。 | `SeServiceConfigAdmin/DetailAsync`（按起运港 `polId` 查配置） | **触发/依赖：** 切换 chevron 服务项节点时重建业务列表动态列；表头取 `SeaExportPropEnum.displayName`。 | 指派任务不展示动态列；为空时不展示业务列。 |
| **Keyword（编号）** | 按主提单号 / 订舱编号 / 委托编号统一模糊检索。 | `GetWorkbenchCountAsync` / `GetWorkbenchPagedListAsync` 参数 `Keyword` | **触发/依赖：** 筛选栏输入即时 trim；Count 与 PagedList 共用同一过滤参数。 | 可清空；已替代原 `MblNum`。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：指派汇总组的空服务项类型]** 工作台综合查询中“指派任务汇总组”的 `serviceType` 为空，前端必须以独立分组处理，不能按普通服务项节点逻辑直接渲染。

> [!IMPORTANT] **[卡点 2：批量完成是逐条调用]** `CompleteAsync` 为单条接口。批量完成必须逐条提交，并注意失败场景下的提示和刷新时机。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-07-25 | `Feature` | 新增「业务联系单审核」Tab：复用审核 Tab 行结构与处理状态切换，双击行深链到 `/pre-order/:id/edit`。 | 筛选栏新增 `pre-order-review` 模式（业务编号/委托单位/起运港/ETD 区间）；数据源 `PreOrderAdmin/PreOrderTaskListAsync`，与审核中心页共用。详见 `changelogs/change-log-2026-07-25-pre-order-frontend.md`。 |
| 2026-07-24 | `Refactor` | 海出服务项业务列取值对接对象化：船公司/订舱代理/船代/场站/委托单位改读 `carrier`/`bookingAgent`/`shipAgent`/`yard`/`transportOrder.client`。 | `se-service-show-columns.ts` 与 `SeaExportDto` 对齐。详见 `changelogs/change-log-2026-07-24-sea-export-party-carrier-objectification.md`。 |
| 2026-07-12 | `Feature` | 海运出口服务筛选改为「编号」Keyword（可查主提单/订舱/委托），移除 MBL；业务列表仅 checkbox 选中；编号输入自动 trim；筛选下拉与 Input 同宽。 | 见 `change-log-2026-07-12-workspace-keyword-trim-checkbox.md`；Count/PagedList 共用 `Keyword`。 |
| 2026-07-12 | `Feature` | 应收应付审核筛选对齐费用审核页；修复费用详情深链；审核筛选区 Grid 换行与按钮右对齐；审核表格间距/单元格 padding 调整。 | 见 `change-log-2026-07-12-workspace-review-filter-and-expense-detail.md`；跳转仍用 `transportOrderId::entityId`。 |
| 2026-07-12 | `Style` | 侧边栏「工作台」一级菜单图标改为 `vscode-icons:file-type-go-work`。 | 与其它一级业务菜单同步更换语义化 Iconify 图标，见 `change-log-2026-07-12-sidebar-top-menu-icons.md`。 |
| 2026-06-09 | `Fix` | 工作台 PagedList 分页参数对齐后端：`PageIndex`/`PageSize` 替代 `SkipCount`/`MaxResultCount`，分页器 current 直接传页码。 | 响应 `currentPage` 回写分页器；枚举/港口接口此前已用页码模式无需改动。 |
| 2026-06-27 | `Fix` | 工作台「转交备注」列仅在「转交任务」节点展示。 | `activeStageKey === 'assigned'` 时显示。 |
| 2026-06-27 | `Fix` | 工作台转交弹窗必填转交备注并提交 `assigneeRemark`；列表增加转交备注列；汇总节点文案「指派任务」改为「转交任务」。 | 对齐 `SeServiceTaskTransferDto` / `SeServiceTaskWorkbenchItemDto`。 |
| 2026-06-09 | `Refactor` | 工作台海运出口服务改为 Count + PagedList 两层接口；服务端分页（默认 20）；筛选全服务端化；指派任务独立节点；编辑页保存后返回工作台自动刷新。 | 删除旧 `GetPagedListAsync` 封装；`seServiceShows` 改从 `SeServiceConfigAdmin` 按 `polId` 缓存加载；`WorkbenchBusinessTable` 新增分页 props。 |
| 2026-06-07 | `Fix` | 工作台业务列表双击整行改为跳转对应编辑/详情页（海运出口编辑、应收应付费用详情、付费申请编辑），与单击委托单号行为一致。 | 双击复用 `open-sea-export` 事件；付费申请审核 Tab 的 `seaExportId` 改为 `paymentApplicationId`；移除 `open-business-list` 列表跳转。 |
| 2026-06-07 | `Feature` | 工作台海运出口业务列表列改为按当前服务项 `seServiceShows` 动态展示，1 枚举 1 列，固定保留委托单号/处理人/被转交人。 | 新增 `se-service-show-columns.ts` 注册表；`WorkbenchBusinessTable.dynamicColumns` 仅海运出口 Tab 传入；`BusinessRow.seaExport` 供列取值。 |
| 2026-06-07 | `Refactor` | 工作台服务项文案完全改为枚举中心实时口径，移除本地 ServiceType 默认文案表。 | 初始化映射仅依赖 `getEnumItems('ServiceType')`，服务节点名称不再从前端硬编码兜底。 |
| 2026-05-30 | `Feature` | 工作台“应收应付审核 / 付费申请审核”两个 Tab 由占位改为可用视图：新增审核专用搜索表单（样式对齐海运出口，字段改为各自接口支持条件）并展示审核业务列表，同时接入对应审核 API 与页面跳转。 | `workspace/index.vue` 对三类 Tab 进行分支化数据加载、独立筛选模型与查询参数映射；`WorkbenchReviewFilterBar` 承载审核查询字段；`WorkbenchBusinessTable` 增加 `enableTaskActions` 开关，审核场景关闭海运任务专属批量动作以避免接口误调用。 |
| 2026-05-30 | `Refactor` | 工作台服务项节点文案改为复用统一 `ServiceType` 枚举映射，移除本地硬编码文案表。 | `workspace/index.vue` 初始化时动态加载统一枚举并构建映射；`workbench-data.ts` 仅保留可注入的兜底 map，避免展示口径与其他页面分叉。 |
| 2026-05-25 | `Feature` | 工作台海运出口服务页对接 `SeServiceTaskAdmin` 查询/转交/完成接口，支持按港口+服务项节点展示任务，完成批量转交与单条/批量完成链路，紧急与异常区块继续使用 mock。 | 新增服务项枚举映射与“指派任务汇总组”渲染分支；筛选模型与 API 参数对齐，页面由静态 mock 切换为后端驱动。 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/workspace` 对应组件 `src/views/dashboard/workspace/index.vue`，权限口径为 未在路由中声明独立权限。 |
