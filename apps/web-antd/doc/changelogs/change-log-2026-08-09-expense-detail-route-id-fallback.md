# 费用审核详情禁止用全局路由 id 兜底

## 背景意图

费用审核列表页 `keepAlive` 后，详情组件仍存活。原先 `resolvedTransportOrderId = prop || route.params.id`，切到付费申请编辑等带 `:id` 的页面时，会把别人的路由 id 当成业务单 id，误发 `OrderFeeTaskDetailAsync`。

## 核心逻辑变更

- `expense-all/modules/detail.vue`：仅独立路由 `ExpenseDetail` 读 `route.params`；嵌在列表时只认父组件传入的 prop。
- prop 为空时传空字符串，表格侧不发起任务详情请求。

## 避坑指南

- 嵌套详情不要依赖「当前任意页面」的 `route.params`。
- keepAlive 页面内的 `useRoute()` 会随全局路由变化，必须用 `route.name` 等方式限定生效范围。
