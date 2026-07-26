# 业务联系单待审核/通过走详情路由

## 背景意图

业务联系单进入「待审核」或「通过」后整单只读，列表与审核入口仍统一跳 `/edit`，URL 语义与交互不符。需要独立详情路由，审核态从列表进入即打开详情页展示。

## 核心逻辑变更

1. **路由**：新增 `PreOrderDetail` → `/pre-order/:id/detail`，组件仍复用 `editor.vue`（状态驱动只读不变）。
2. **路径助手**：`getPreOrderFormPath` / `isPreOrderDetailStatus`——待审核、通过 → detail；录入、驳回 → edit。
3. **列表双击**：按行状态走 `getPreOrderFormPath`。
4. **审核中心 / 工作台**：打开单据改为 `/detail`（任务本身即审核态）。
5. **状态对齐 URL**：`editor` 拉详情或提交/撤回/审核后 `syncRouteByStatus`，`replace` 到与状态匹配的 edit/detail，避免标签页路径错乱。

## 避坑指南

1. **详情与编辑是同一组件**：只读仍由 `status` 决定，不是靠路由名；路由只负责语义与入口分流。
2. **手工打开错误路由会被纠正**：打开 `/edit` 但状态已是待审核/通过时，加载后会 `replace` 到 `/detail`，反之亦然。
3. **新增成功仍落编辑页**：新建保存后进 `/edit`（录入态），提交审核后再切详情。
