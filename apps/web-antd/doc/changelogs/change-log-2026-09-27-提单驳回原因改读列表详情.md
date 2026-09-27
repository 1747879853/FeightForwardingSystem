# 提单驳回原因改读列表详情

## 背景意图

[TAPD 1000183](https://www.tapd.cn/61580498/prong/stories/view/1161580498001000183) 后端已在提单列表和详情上返回最近一次签出审核意见。操作没有审核权限时调不了 `GetTaskAsync`，驳回原因不能再靠那条接口补读。

## 核心逻辑变更

- 列表 `GetPagedListAsync`、详情 `GetAsync` 使用 `auditRemark`、`auditTime`、`auditUserName`。权限仍是 `Admin.BillOfLading.Get`。
- 已驳回时，列表状态悬浮和详情基础信息顶部直接展示这三个字段。没填意见显示「未填写」。
- 状态不是已驳回时不展示，避免重新提交后的最新子任务把上一轮意见留在页面上。
- 签出审核页仍读任务明细 `remark`，这次不改。

## 避坑指南

`auditRemark` 为 null 表示从没提交过，空字符串表示审了但没填意见。页面只在已驳回时出现驳回原因，两种空值都显示「未填写」。不要再为这个原因请求 `GetTaskAsync`。

## 验证

提单单测 16 项通过，其中驳回原因 4 项：非已驳回不展示、空意见为「未填写」、带上审核人和时间。

本地佳越测试列表 `GetPagedListAsync` 目前还没有 `auditRemark`、`auditTime`、`auditUserName`，已驳回为 0 条，页面悬浮没有真实驳回原因可对。字段随这次后端上线后才会在列表和详情里出现。

## 对应活文档

- [提单管理](../modules/bill-of-lading/index.md)
