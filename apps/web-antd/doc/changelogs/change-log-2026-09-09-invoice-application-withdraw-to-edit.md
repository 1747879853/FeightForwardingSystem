# 开票申请查看页撤回成功后进入编辑页

## 背景意图

查看页点「撤回」成功后，单据回到可编辑状态（录入），应关闭当前查看页签并打开该条开票申请的编辑页；撤回失败则留在查看页。

## 核心逻辑变更

`invoice-application/form.vue` 的 `handleWithdraw`：

- 成功：`markListShouldRefresh('InvoiceApplicationList')` → `replace` 到 `/:id/edit` → `closeTabByKey` 关掉旧查看 fullPath 残留页签。
- 失败：`catch` 中不跳转。
- 顺带修正原先错误的刷新标记键 `invoice-application-list`。

## 避坑指南

- 与提交成功进查看对称：`replace` + 关旧页签，避免查看与编辑双页签并存。
- 失败路径不要导航，便于用户看清错误后重试。
