# 付款申请新增跳转编辑后延迟拉取审核流程

## 背景意图

新增付款申请保存成功后会立即跳转编辑页；编辑页挂载时 `WorkflowTimeline` 立刻请求工作流实例。此时后端工作流实例可能尚未创建完成，导致「暂无审批流程数据」。需在「从新增跳入编辑」场景下延迟 2 秒再拉取。

## 核心逻辑变更

1. **跳转带标记**：新增保存成功（含添加费用自动建单、点保存建单）`router.replace` 至编辑页时携带 `query.fromCreate=1`。
2. **延迟拉取**：编辑页将 `workflowLoadDelayMs`（`fromCreate=1` 时为 `2000`）传给 `WorkflowTimeline` 的 `loadDelayMs`。
3. **组件能力**：`WorkflowTimeline` 新增 `loadDelayMs`；有延迟时先显示 loading，到期后再调 `getWorkFlowInstanceDetail`；卸载时清理定时器。

## 避坑指南

- 从列表进入编辑页不要带 `fromCreate`，应立即拉取。
- 勿把延迟写死在所有编辑页加载路径上；仅「刚创建」场景需要等待实例就绪。
- `reload()` 仍直接拉取，不受 `loadDelayMs` 影响。
