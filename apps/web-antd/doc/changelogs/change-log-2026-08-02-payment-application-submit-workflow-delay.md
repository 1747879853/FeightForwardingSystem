# 付款申请提交/撤销提交后延迟拉取审核流程

## 背景意图

编辑页点击「提交」或「撤销提交」后，后端审核流实例状态可能尚未同步完成。若立刻拉取 `WorkflowTimeline`，会看到旧流程或「暂无审批流程数据」。需在这两类状态变更成功后延迟 2 秒再刷新审核流程。

## 核心逻辑变更

1. **付款申请编辑页**：`handleSubmitApplication` / `handleUnsubmitApplication` 在 `loadEditData` 完成后置 `workflowDelayAfterStatusChange=true` 并递增 `workflowReloadKey`。
2. **强制重挂载**：`WorkflowTimeline` 使用 `:key="workflow-${editId}-${workflowReloadKey}"`，key 变化后按 `loadDelayMs=2000` 重新调度拉取（先 loading，2s 后再请求）。
3. **`WorkflowTimeline.reload({ delayMs })`** 仍保留，但本页不依赖 template ref（ref 可能拿不到实例导致静默跳过）。
4. **新增跳入编辑**仍用 `query.fromCreate=1` + `loadDelayMs`。

## 避坑指南

- 提交/撤销后不要立刻无延迟拉审核流，否则会读到旧状态。
- 勿仅依赖 `ref.reload()`；编辑页用 key 重挂载更可靠。
- 延迟只覆盖「状态变更后刷新」；从列表进入编辑页仍应立即拉取。
