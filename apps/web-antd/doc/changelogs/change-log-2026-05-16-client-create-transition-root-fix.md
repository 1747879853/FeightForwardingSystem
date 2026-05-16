# ClientCreate 路由切换空白修复

## 背景意图

- 客户新建页 `ClientCreate` 在路由切换时出现 Vue 运行时警告，页面进入后空白。
- 警告集中在 `Transition` 与运行时指令，根因是页面组件不是单一元素根节点，导致动画与指令无法按预期挂载。

## 核心技术决策 / 逻辑变更

- 将 `apps/web-antd/src/views/client/base/form.vue` 的模板结构从双根节点调整为单根节点。
- 具体做法是将原先独立的 `<Modal />` 挂回主容器内部，确保页面组件对外只暴露一个元素根节点。
- 业务逻辑保持不变：地址弹窗的 `@add` / `@edit` 事件与原处理函数完全一致。

## 避坑指南（Gotchas & Constraints）

- 被 `RouterView + Transition + KeepAlive` 包裹的页面组件应始终保持单元素根节点，避免出现 fragment 根节点。
- 若页面存在全局弹窗、抽屉等“看似独立”的节点，也要纳入同一根容器中，避免触发 `Runtime directive used on component with non-element root node`。
- 遇到同类“切换路由空白 + Transition 警告”时，优先检查目标页面模板根结构，而不是先排查路由表或权限守卫。
