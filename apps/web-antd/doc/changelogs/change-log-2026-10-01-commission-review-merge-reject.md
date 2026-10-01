# 提成审核合并驳回按钮

## 改动

工具栏原「驳回」「审核后驳回」合并为一个【驳回】，交互对齐付费申请审批。

- 可选范围：审核中、审核通过（已发放等仍不可驳）。
- 分流：当前审核人驳回 → `BatchAuditAsync(success: false)`；整单已通过，或整单仍在审但本人节点已过 → `BatchRejectAsync`。
- 混选时共用同一驳回原因，按行拆成两次批量调用。

## 影响范围

`/audit-approval/commission-review`。
