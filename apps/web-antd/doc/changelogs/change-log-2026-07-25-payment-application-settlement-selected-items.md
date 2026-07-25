# 付款申请编辑结算对象回显补 selectedItems

## 背景意图

付款申请编辑页 `ClientSelect` 仅绑定 `settlementId`，未注入 `selectedItems`。详情接口已返回 `settlement`（含 `id/name/fullName`），但下拉首屏未加载到该客户时只显示空白 id，无法正确回显结算对象名称。

## 核心逻辑变更

- `PaymentApplicationDto` 补 `settlement?: ClientSimpleDtoForOrder | null`。
- 编辑加载时用 `detail.settlement`（缺省则用 `settlementId` + `clientName`）构建 `settlementSelectedItems`，传给 `ClientSelect` 的 `selected-items`。
- 手动清空结算对象时同步清空 `selectedItems`；选费确认/同步结算对象时用费用行 `settlementName` 补齐回显。

## 避坑指南

- `ClientSelect` 无 Detail 接口，编辑回显必须靠父级传 `selectedItems`，不能只设 `modelValue`。
- 详情字段优先用嵌套 `settlement`，`clientName` 仅作兜底展示名。
