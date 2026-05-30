# 海运出口编辑页保存与完成服务后重新拉取详情

## 背景意图

编辑工作台 `/sea-exports/:id/edit` 在点击「保存」或「完成服务」后，页面仍保留提交前的本地状态。后端可能已更新服务任务、锁定状态、只读摘要等字段，前端未重新请求详情导致流水线勾选、任务状态与服务器不一致。

## 核心逻辑变更

1. **保存成功后刷新**（`form.vue` → `handleSubmit`）
   - 编辑态调用 `editSeaExport` 成功后，追加 `await loadEditData()`，重新执行 `getSeaExportDetail` 及表单/服务项回填。

2. **完成服务成功后刷新**（`form.vue` → `handleCompleteService`）
   - 调用 `completeSeServiceTask` 成功后，改为 `await loadEditData()`，不再仅本地更新 `serviceItemTaskStatusValues` 单字段。

## 避坑指南

- 仅编辑态保存后刷新；新建成功仍跳转编辑路由，由路由进入触发 `onMounted` → `loadEditData`。
- `loadEditData` 会短暂开启 `pageLoading`，属预期 loading 行为。
- 完成服务失败时不刷新，避免覆盖用户未保存的表单编辑。
