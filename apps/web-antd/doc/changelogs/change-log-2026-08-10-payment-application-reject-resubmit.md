# 付费申请 - 驳回后可再次提交

## 背景意图

TAPD #0753：付费申请审核驳回后，编辑页缺少「提交」按钮，无法重新进入审批。

## 核心逻辑变更

- 顶部「提交」由仅 `Entering` 改为 `canSubmit`：`Entering` 或 `Rejected` 时显示。
- 仍走现有 `SubmitAsync`（先 `saveEditMode` 再提交），驳回态与录入中共用同一提交链路。

## 避坑指南

- 勿把「撤销提交」开放给驳回态；撤销仅针对 `Auditing`。
- 驳回后再提交依赖后端 `SubmitAsync` 接受 `Rejected` 状态；若接口拒绝需后端放开。
