---
title: 开票申请列表
module: 费用管理
author: auto-doc-sync
last_updated: 2026-09-08
---

# 1. 业务背景说明 (Background)

**白话解释：** 开票申请列表是应收开票的检索入口：按申请单号、发票号、结算对象、申请时间等查出申请，新建或双击进编辑，录入/驳回可提交，待审核可撤销。

# 2. 功能与操作说明 (Features & Operations)

- **检索：** 编号（主提单号/委托编号）、精确 Keys、申请单号、发票号、状态、结算对象、币别、申请时间、创建人。
- **新建：** 进入 `/fee-management/invoice-application/add`。
- **编辑/查看：** 录入、驳回双击进编辑；其他状态进只读查看。
- **提交/撤销：** 录入/驳回可提交；待审核可撤销。

# 3. 状态流转说明 (Status Transitions)

| 当前状态    | 触发人/动作 | 目标状态 | 状态说明                       |
| :---------- | :---------- | :------- | :----------------------------- |
| 录入 / 驳回 | 提交        | 待审核   | 列表提交不先保存单据           |
| 待审核      | 撤销        | 录入     | 工作流已有人审过时后端可能拒绝 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **applyTimeRange** | 申请时间区间 | **开票申请**<br/>`applyTimeStart` / `applyTimeEnd` | **触发：** 无时分 RangePicker | 提交时切到当天 00:00～23:59.999 再转 ISO |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：申请时间是按天筛]** 控件无 `showTime`。点「今天」若直接 `toISOString()` 会带当前时钟，起止变成同一时刻。必须走 `toIsoStartOfDay` / `toIsoEndOfDay`。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-09-08 | `Fix` | 申请时间筛选改为自然日闭区间。 | 详见 `changelogs/change-log-2026-09-08-date-range-start-end-of-day.md`。 |
