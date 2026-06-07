# 变更记录：工作台业务列表双击跳转对应业务列表

## 背景意图

工作台「业务列表」表格此前仅支持点击委托单号链接进入编辑/详情，与项目列表页「双击行进入业务」的交互习惯不一致。需补充整行双击能力，按当前 Tab 跳转到对应模块的业务列表页。

## 核心逻辑变更

1. `workbench-business-table.vue`
   - 数据行增加 `@dblclick`，触发 `open-business-list` 事件。
   - 行样式增加 `cursor: pointer`，提示可交互。
   - 委托单号单击仍走 `open-sea-export`；通过 220ms 延迟与双击互斥，避免双击时误触发两次单击跳转。

2. `workspace/index.vue`
   - 新增 `handleOpenBusinessList`，按 `activeServiceTab` 路由：
     - 海运出口服务 → `SeaExportList`（`/sea-exports`）
     - 应收应付审核 → `ExpenseAll`（`/audit-approval/expense-review`）
     - 付费申请审核 → `PaymentReview`（`/audit-approval/payment-review`）

## 避坑指南

- 双击与委托单号单击需做防抖/清定时器，否则双击会先触发两次链接 click。
- 审核 Tab 与海运出口 Tab 共用表格组件，跳转逻辑应放在页面层按 Tab 分支，勿写死在表格内。
