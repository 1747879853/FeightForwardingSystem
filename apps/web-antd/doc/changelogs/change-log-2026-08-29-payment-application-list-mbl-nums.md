---
title: 付款申请列表新增提单号列
date: 2026-08-29
module: fee-management / payment-application
---

# 背景意图

费用管理「付费申请」列表原先没有提单号，看不出一张申请挂了哪几票业务。列表在申请单号后补「提单号」，多票逗号拼接。取值口径与审批列表一致：读 `payAppFeeBySeaExportGroup[].transportOrder.mblNum`。

# 核心逻辑变更

- `PaymentApplicationDto` 增加 `payAppFeeBySeaExportGroup`（详情仍走同一字段，不再只挂在 DetailDto 上）。
- 提单号 `formatPayAppMblNums`：trim、跳过空值、保序去重，半角逗号拼接。审批列表与付款申请列表共用。
- 列 `field` 为 `mblNums`，插在申请单号之后，不排序。

# 避坑指南

- 当前后端 `GetPagedListAsync` 注释仍是「详情才有 列表没有」，若接口尚未填充该分组，列会显示为空。审批任务列表 `PayAppTaskListAsync` 已填充。
- 不要读组内 `currencyGroup` / `totalPayPrice` / `totalReceivePrice`；金额用行根字段。
- 列设置只持久化 `field`；`mblNums` 不是接口字段，展示靠 formatter。
