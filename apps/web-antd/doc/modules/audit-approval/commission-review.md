---
title: 提成审核
module: 审核审批
author: auto-doc-sync
last_updated: 2026-09-08
---

# 1. 业务背景说明 (Background)

**白话解释：** 销售提成、操作提成提交后形成审核任务。审核人在本页对待审单据批量通过或驳回，也可打开提成单详情与审批时间轴。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/audit-approval/commission-review` |
| 路由名称 | `CommissionReview` |
| 页面组件 | `src/views/audit-approval/commission-review/index.vue` |
| 权限口径 | `Admin.CommissionOrder.Audit` |
| 关键源码 | `src/router/routes/modules/audit-approval.ts`<br/>`src/views/audit-approval/commission-review/index.vue`<br/>`src/api/commission/commission-order-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **任务列表：** `CommissionOrderAdmin/GetTaskListAsync`（前端 `getCommissionOrderTaskList`）；筛选与分组统计同一套条件。
- **分组统计：** 提成类型、提成人、提成月；持久化 `group_config_CommissionReview`。提成月分组项 id 为该月 1 号日期。
- **批量审核：** 全部校验通过才执行，有一张不满足就整批报错。通过/驳回成功走 `reloadGrid`：重载表格并 `refreshGroupData()`。
- **详情 / 时间轴：** 复用提成模块详情弹窗与 `workflow-timeline`。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明                         |
| :------- | :---------- | :------- | :------------------------------- |
| 待审     | 批量通过    | 已通过   | 全部校验通过才提交               |
| 待审     | 批量驳回    | 驳回     | 需填写意见；整批失败则一条都不改 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **提成类型** | 销售或操作。 | 筛 `commissionType`；分组 `CommissionOrderGroupField.CommissionType` | **触发/依赖：** 审核页三种分组维度全开，与提成列表不同。 | 筛选项非必填。 |
| **提成人** | 计提对象。 | `commissionUserId` | **触发/依赖：** 启用分组后禁用同名搜索项。 | 筛选项非必填。 |
| **提成月** | 计提所属月份。 | `accountDateRange` | **触发/依赖：** 分组项点击回填该月起止。 | 筛选项非必填。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：整批失败一条都不改]** 批量审核先校验再请求，不要假设部分成功后列表已变。
>
> **[卡点 2：分组数据刷新时机]** 点分组 Tab 只重查列表。审核成功必须走 `reloadGrid` 才会 `refreshGroupData()`，否则 Tab 条数过期。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-09-08 | `Fix` | 审核后重载列表时同步刷新分组 Tab 条数。 | `reloadGrid` 在 `await gridApi.reload()` 后调用 `grouping.refreshGroupData()`。详见 `changelogs/change-log-2026-09-08-list-grouping-refresh-after-mutation.md`。 |
