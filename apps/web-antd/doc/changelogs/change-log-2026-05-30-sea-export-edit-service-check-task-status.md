# 海运出口编辑页服务项流水线交互优化

## 背景意图

编辑工作台 `/sea-exports/:id/edit` 的服务项目流水线存在三类体验问题：

1. 节点圆形勾选与「服务是否启用」绑定，已启用但任务未处理也显示 ✓，与任务流语义不符。
2. 状态标签、完成按钮区域使用固定 `min-width` 占位，无内容时节点仍偏宽。
3. 仅「任务已处理」时禁止关闭服务，业务要求只要已生成服务任务（不论待处理/已处理）均不可取消。

## 核心逻辑变更

1. **勾选与启用解耦**（`form.vue`）
   - `isServiceItemEnabled`：本单是否启用，决定表单字段与保存 `serviceTypes`。
   - `getServiceItemCheckmarkShown`：编辑态勾选仅当 `serviceTaskStatus === 已处理`；新建态仍为启用即勾选。
   - 编辑态 `active` 节点不再给未完成任务的空圈加蓝色高亮，避免与「已完成」混淆。

2. **节点宽度自适应**
   - 状态标签、完成按钮仅在满足展示条件时渲染 DOM，移除空槽 `min-width`。
   - 完成按钮在未 hover/非 active 时 `width: 0` 折叠，不占横向空间。

3. **有任务不可关闭**
   - `hasServiceItemTask`：详情存在 `seServiceTask.id`（或兼容字段）即视为有任务。
   - 编辑态已启用且 `hasServiceItemTask` 时，`canToggleServiceItemNode` 禁止关闭，提示「已生成服务任务，不可关闭服务」。

4. **文案**
   - 编辑态流水线提示：「勾选表示服务任务已完成，点击节点可启用/关闭服务」（有任务时关闭会被拦截）。

## 避坑指南

- 保存 `serviceTypes` 仍走 `serviceItemEnabledValues`，勿用节点勾选或任务状态替代启用态。
- `canCompleteServiceItem` 仍为「已启用 + 待处理 + taskId」，与勾选展示无关。
- 完成服务成功后需更新 `serviceItemTaskStatusValues`，编辑态勾选才会出现。
- 新建页不受 `hasServiceItemTask` 限制，逻辑以 `isEdit` 为界。
