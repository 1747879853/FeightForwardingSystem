---
title: 提成单列表
module: 提成管理
author: auto-doc-sync
last_updated: 2026-09-10
---

# 1. 业务背景说明 (Background)

**白话解释：** 销售提成与操作提成共用同一张列表。销售或操作按提成月汇总可计提成，在这里检索、新建、提交/撤销审核、删除。两个菜单页共用组件，靠路由 `meta.commissionType` 区分（0=销售，1=操作）。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/commission/sales`、`/commission/operation` |
| 路由名称 | `CommissionSalesList` / `CommissionOperationList` |
| 页面组件 | `src/views/commission/order-list.vue` |
| 权限口径 | `Admin.CommissionOrder` / `Admin.CommissionOrder.Get` |
| 关键源码 | `src/router/routes/modules/commission.ts`<br/>`src/views/commission/order-list.vue`<br/>`src/api/commission/commission-order-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **分页检索：** 按提成类型（路由固定）、提成人、提成月、状态等筛选；点「查询」才请求。
- **分组统计：** 维度为提成人、提成月；本页提成类型已由路由固定，故不提供「提成类型」分组。分组设置按路由名分别持久化（`group_config_CommissionSalesList` / `group_config_CommissionOperationList`）。提成月分组项 id 为该月 1 号日期，点击后回填提成月起止再查列表。
- **新建 / 动作弹窗：** 新建、提交、撤销、删除成功后走 `handleRefresh`，同时刷新列表与分组条数。销售提成新建弹窗为浅灰底：筛选条件标签内嵌在白色圆角控件内；不可新建原因与未结清提示用独立色条；未结清票与参与计算票分卡，后者精简为业务信息+金额+状态。
- **返回刷新：** keepAlive；重新进入会 `refreshGroupData()`（跳过首次激活）。

# 3. 状态流转说明 (Status Transitions)

| 当前状态  | 触发人/动作 | 目标状态 | 状态说明                           |
| :-------- | :---------- | :------- | :--------------------------------- |
| 录入/驳回 | 提交审核    | 审核中   | 逐单调用提交接口，失败条数汇总提示 |
| 审核中    | 撤销提交    | 录入     | 仅允许撤销仍可操作的单据           |
| 录入/驳回 | 删除        | 记录消失 | 与提交共用可操作行过滤             |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **提成类型** | 销售或操作。 | 路由 `meta.commissionType` | **触发/依赖：** 列表查询始终带上该值，不在本页切换。 | 只读，由菜单入口决定。 |
| **提成人** | 计提对象。 | `userId`；分组 `CommissionOrderGroupField.User` | **触发/依赖：** 可作为分组维度，启用后禁用同名搜索项。 | 筛选项非必填。 |
| **提成月** | 计提所属月份。 | `accountDateRange` → 起止；分组 `AccountDate` | **触发/依赖：** 分组项 id 为该月 1 号，点击后同时回填起止。 | 筛选项非必填。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：销售/操作列表共用组件]** 分组持久化 key 必须带 `route.name`，否则两个菜单会互相覆盖分组设置。
>
> **[卡点 2：分组数据刷新时机]** 点分组 Tab 只重查列表；搜索条件变化才重拉分组。删除/提交/撤销/工具栏刷新必须走 `handleRefresh` 才能同步 `refreshGroupData()`，否则 Tab 条数过期。未开分组时该方法为空操作。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-09-10 | `Style` | 销售提成新建弹窗对齐设计稿：筛选标签内嵌、浅灰底、原因/未结清独立色条、未结清票全列与参与计算票精简列分卡。 | `create-modal.vue` 用 `contentClass` 铺灰底；`useSalesTicketColumns({ compact, showUnsettled })` 拆两套列。详见 `changelogs/change-log-2026-09-10-commission-create-modal-layout.md`。 |
| 2026-09-08 | `Fix` | 刷新列表时同步刷新分组 Tab 条数（提交/撤销/删除后不再显示过期条数）。 | `handleRefresh` 在 `gridApi.query()` 后调用 `grouping.refreshGroupData()`。详见 `changelogs/change-log-2026-09-08-list-grouping-refresh-after-mutation.md`。 |
