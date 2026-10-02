# TAPD #1001037 发票开出列宽拖动不挤压他列

## 背景意图

发票开出列表拖宽某一列时，其余列被自适应压缩，观感像整表在挤。

## 核心逻辑变更

- 列表 `resizableConfig.dragMode` 设为 `fixed`：拖宽当前列时先把其它可见列的 `resizeWidth` 钉死为当前渲染宽，再改拖拽列，从而横向撑开而非挤压邻列。
- `NestedDataTable`：外/内表按列宽之和写 `min-width`，去掉内表 `max-width: 100%`，拖宽后可横向滚动而不挤邻列（开出发票选申请抽屉等同款表）。

## 涉及文件

- `views/settlement-management/invoice-issue/list.vue`
- `components/nested-data-table/nested-data-table.vue`
