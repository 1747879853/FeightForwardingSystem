---
title: 付费申请审批通过/驳回/审核后驳回接口对齐
date: 2026-08-09
module: audit-approval / payment-review
---

# 背景意图

付费申请审核有两套后端接口，语义不同，前端原先把工具栏「驳回」误接到了「审核后反悔驳回」：

| 操作 | 接口 | 关键字段 | 前置 |
| --- | --- | --- | --- |
| 通过 | `AuditAsync` | `success: true` | 任务待审核 |
| 驳回（审核中不通过） | `AuditAsync` | `success: false` | 同上 |
| 审核后驳回（通过后再反悔） | `RejectAsync` | 无 `success` | 任务已 Passed，或 Auditing 且本人节点已过 |

权限均为 `Admin.PaymentApplication.Audit`，入参均为审核**任务** id 列表 + 备注。

# 核心逻辑变更

`payment-review/index.vue`：

- **通过** → `payAppAudit({ success: true, ids, remark })`
- **驳回** → `payAppAudit({ success: false, ids, remark })`（不再调用 `RejectAsync`）
- 新增 **审核后驳回** → `payAppReject({ ids, remark })` → `RejectAsync`
- 按钮按选中行状态启用：待审可点通过/驳回；已通过（或整单仍在审且 `myStatus=Passed`）可点审核后驳回；提交时只带符合条件的任务 id
- 文案：`通过` / `驳回` / `审核后驳回`

`payment-review-admin.ts` 补充 `AuditAsync` / `RejectAsync` 与 DTO 注释，避免再混用。

# 避坑指南

- **不要把审核中「驳回」打到 `RejectAsync`**：那是通过后反悔专用；待审任务应走 `AuditAsync(success: false)`。
- 审核接口传的是任务行 `id`，不是 `paymentApplicationId`。
- 多选时若混有已终态行，前端会过滤后只提交合法行；全不合法则提示并不发请求。
