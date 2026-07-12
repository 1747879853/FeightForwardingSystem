# 工作台审核筛选对齐与费用详情深链修复

## 背景意图

工作台「应收应付审核」筛选字段与费用审核列表页不一致；列表点击进入费用详情时路由未把动态段映射为组件 props，独立详情页无法加载费用表；审核 Tab 筛选区换行与按钮对齐、表格间距也需统一。

## 核心逻辑变更

1. **应收应付筛选对齐费用审核页**
   - `WorkbenchReviewFilterBar` 的 `ar-ap-review` 模式改为：业务类型、业务编号、客户、ETD、截止日期、销售、操作（保留处理状态）。
   - `workspace/index.vue` 查询参数映射到 `OrderFeeTaskListAsync`；`GetPagedListParams` 补充 `BizType/Keyword/ClientId/ETDStart/ETDEnd/SaleId/OperatorId`。

2. **费用详情独立路由可用**
   - `ExpenseDetail` 路由增加 `props`：`:id → transportOrderId`、`:entityId → entityId`。
   - `detail.vue` props 可选；独立打开时从路由兜底解析 id，并展示返回与布局切换工具条。

3. **审核筛选区布局**
   - 筛选区改为 CSS Grid（`auto-fill` + `minmax(240px, 1fr)`）；按钮组作为最后一列 `grid-column: -2 / -1` 右对齐，换行后与首行内容右缘对齐；字段 label 固定宽 64px。

4. **审核表格样式**
   - 审核 Tab 表格卡片 `margin-top: 12px`；表头/单元格左右 padding `8px`（仅审核 Tab，不影响海运出口）。

## 避坑指南

- 工作台跳转费用详情的 `seaExportId` 格式仍为 `transportOrderId::entityId`；其中 `entityId` 业务上即 `TransportOrder.Id`，两段 GUID 可能相同，属正常。
- 费用审核列表页仍以内嵌 `Detail` 传 props 使用；独立路由与内嵌共用同一组件，勿再假设 props 必填。
- 审核筛选布局改动在 `workbench-review-filter-bar.vue`，付费申请审核 Tab 一并受影响。
