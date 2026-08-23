# 2026-08-23 监装工单详细说明对接 remark

## 背景意图

后端 `LoadingOrderAdmin` 新建/编辑/详情已提供工单级 `remark`（最长 1024，与拒接原因独立）。原先「详细说明」只读拼接当前组已勾监装要求明细的 `remark`，不入库。改为读写工单 `remark`。

## 核心逻辑变更

- `LoadingOrderAddDto` / `LoadingOrderEditDto` / `LoadingOrderDetailDto` 补 `remark`。
- 监装 Tab「详细说明」绑定 `form.remark`：详情回填，保存随 `AddAsync` / `EditAsync` 提交；空串按 `null` 传。
- 未提交且有编辑权限时可改；待认领/已认领/已完成仍只读。上限 1024。
- 不再把监装要求明细备注拼进该文本框。勾选要求仍只提交 `loadingRequirementItemIds`。

## 避坑指南

- `remark` 是工单备注，不是拒接原因 `rejectReason`，也不是监装要求主/子表上的 `remark`。
- 漏传或传 `null` 会清空工单备注；编辑时必须带回当前值。
