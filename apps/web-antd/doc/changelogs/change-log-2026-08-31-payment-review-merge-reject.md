---
title: 付费申请审批「驳回」与「审核后驳回」合成一个按钮
date: 2026-08-31
module: audit-approval / payment-review
---

# 背景意图

付费审核工具栏原先两个驳回按钮。后端已把「整单已通过再驳回」并进 `AuditAsync(success: false)`，前端只保留一个【驳回】，用户不再区分两种驳回。

# 核心逻辑变更

- 工具栏去掉「审核后驳回」；【驳回】在勾选「审核中」或「审核通过」时可用。
- 待审、整单已通过：`payAppAudit({ success: false })` → `AuditAsync`。
- 整单仍在审、本人节点已过：仍走 `payAppReject` → `RejectAsync`（同一按钮内分流）。

# 避坑指南

- 不要把「审核中且本人已过」也打进 `AuditAsync(false)`：会按当前审核人处理，报「非当前审核人不可审核」。
- 已驳回、部分通过不可驳；通过按钮仍只对待审任务启用。
- `RejectAsync` 接口仍在，只是页面不再单独露出按钮。
