# 开票申请编辑页提交成功后进入查看页

## 背景意图

编辑页点「提交」成功后，单据已进入待审核，不应再停留在可编辑页。应关闭当前编辑页签并打开该条开票申请的只读查看页；提交失败则留在编辑页便于改完再提。

## 核心逻辑变更

`invoice-application/composables/use-submit.ts`：

- 抽出 `navigateToViewAfterSubmit`：`markListShouldRefresh` → `replace` 到 `/:id/view` → 关掉旧编辑/新建 fullPath 残留页签。
- `handleDirectSubmit` / `handleSubmitForAudit` 提交成功后走上述导航；`catch` 中不跳转。

## 避坑指南

- 失败路径不要 `replace`/`push`，否则用户改不动就丢上下文。
- 列表刷新仍靠 `InvoiceApplicationList` 标记，从查看页回列表时会刷状态。
