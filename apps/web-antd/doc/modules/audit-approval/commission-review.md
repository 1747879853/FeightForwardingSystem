---
title: 提成审核
module: 审核审批
author: auto-doc-sync
last_updated: 2026-10-01
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
- **当页合计：** 列表底部展示当前页「提成金额 / 底薪 / 最终应发」合计；空数据时显示「暂无数据」。
- **分组统计：** 提成类型、提成人、提成月；持久化 `group_config_CommissionReview`。提成月分组项 id 为该月 1 号日期。
- **批量审核：** 全部校验通过才执行，有一张不满足就整批报错。通过/驳回成功走 `reloadGrid`：重载表格并 `refreshGroupData()`。
- **通过：** 仅「审核中」提成单，走 `BatchAuditAsync(success: true)`。
- **驳回：** 工具栏只留一个【驳回】。勾选「审核中」或「审核通过」可用。当前审核人驳回走 `BatchAuditAsync(success: false)`；整单已通过，或整单仍在审但本人节点已过，走 `BatchRejectAsync`（同一按钮内分流，不再单独露出「审核后驳回」）。
- **审批流程：** 无工具栏按钮；悬停「状态」列标签弹出审核流程时间线（任务已整单通过时仅 Tooltip 展示我的审核状态），交互对齐客户审核状态列。
- **详情 / 时间轴：** 复用提成模块详情弹窗。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明                         |
| :------- | :---------- | :------- | :------------------------------- |
| 待审     | 批量通过    | 已通过   | 全部校验通过才提交               |
| 待审     | 批量驳回    | 驳回     | 需填写意见；整批失败则一条都不改 |
| 已通过   | 驳回        | 驳回     | 同一【驳回】按钮内走 RejectAsync |

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
>
> **[卡点 3：当页合计只加当前页]** 底部合计读查询返回的当前页 `items`，翻页后随页变化；不要跨页累加。
>
> **[卡点 4：驳回按行分流]** 混选「审核中」与「审核通过」时，同一确认框共用驳回原因，前端按行拆成 Audit / Reject 两次批量调用。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-10-01 | `UX` | 去掉工具栏「审批流程」；悬停状态列查看审核流程。 | `CommissionStatusCell` + `WorkflowTimeline`，对齐客户审核状态列浮层。详见[变更记录](../../changelogs/change-log-2026-10-01-commission-review-status-hover-workflow.md)。 |
| 2026-10-01 | `UX` | 工具栏「驳回」与「审核后驳回」合并为一个【驳回】。 | `doUnifiedReject` 按 `needsRejectAsync` 分流 BatchAudit / BatchReject；交互对齐付费申请审批。详见[变更记录](../../changelogs/change-log-2026-10-01-commission-review-merge-reject.md)。 |
| 2026-09-30 | `Perf` | 列表分页改大后只绘制可见行列，不再深拷贝整页数据。 | 开启 virtualX/Y（gt: 0），行高 40，去掉无编辑用途的 keepSource。详见[变更记录](../../changelogs/change-log-2026-09-30-其余业务列表虚拟滚动.md)。 |
| 2026-09-09 | `Feature` | 列表底部增加当页「提成金额 / 底薪 / 最终应发」合计。 | `fetchList` 写入 `currentPageData`；`Page` `#footer` 样式对齐进项发票。详见 `changelogs/change-log-2026-09-09-commission-review-page-footer-summary.md`。 |
| 2026-09-08 | `Fix` | 审核后重载列表时同步刷新分组 Tab 条数。 | `reloadGrid` 在 `await gridApi.reload()` 后调用 `grouping.refreshGroupData()`。详见 `changelogs/change-log-2026-09-08-list-grouping-refresh-after-mutation.md`。 |
