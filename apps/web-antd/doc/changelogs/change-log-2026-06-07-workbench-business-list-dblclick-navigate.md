# 变更记录：工作台业务列表双击跳转编辑详情页

## 背景意图

工作台「业务列表」此前双击整行会跳转到当前 Tab 对应的业务列表页，与项目列表页「双击行进入编辑/详情」的交互习惯不一致。需改为双击直接进入对应业务的编辑/详情页。

## 核心逻辑变更

1. `workbench-business-table.vue`
   - 双击数据行改为触发 `open-sea-export` 事件（传入 `row.seaExportId`），与单击委托单号共用跳转逻辑。
   - 移除 `open-business-list` 事件。

2. `workspace/index.vue`
   - 移除 `handleOpenBusinessList` 列表跳转函数。
   - 付费申请审核 Tab：`mapPaymentTaskToBusinessRow` 的 `seaExportId` 改为 `paymentApplicationId`（任务 id 与申请 id 不同）。
   - `handleOpenSeaExport` 付费申请审核分支改为跳转 `PaymentApplicationEdit`。

## 各 Tab 双击目标

| Tab | 跳转目标 |
| :-- | :-- |
| 海运出口服务 | `SeaExportEdit` |
| 应收应付审核 | `/audit-approval/expense-review/:transportOrderId/expense-detail/:entityId` |
| 付费申请审核 | `PaymentApplicationEdit` |

## 避坑指南

- 双击与委托单号单击需做防抖/清定时器，否则双击会先触发两次链接 click。
- 付费申请审核任务的 `id` 是任务 id，跳转编辑页需使用 `paymentApplicationId`。
