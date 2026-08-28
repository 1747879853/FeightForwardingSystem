---
title: 付费申请审批列表展示提单号
date: 2026-08-28
module: audit-approval / payment-review
---

# 背景意图

审核人在付费申请审批列表里原先只能看到申请单号、结算对象和金额，看不出这张申请挂了哪几票业务。后端 `PayAppTaskListAsync` 现已下发 `payAppFeeBySeaExportGroup`（组内只填业务简要），列表补一列「提单号」，多票用逗号拼接，减少为看提单号而点进详情的次数。

# 核心逻辑变更

- `PayAppTaskItemDto` 对齐新增 `payAppFeeBySeaExportGroup`；组内金额字段恒为 `null`，申请合计仍读行根上的 `currencyGroup`。
- 提单号只取 `payAppFeeBySeaExportGroup[].transportOrder.mblNum`：trim、跳过空值、保序去重后用半角逗号拼接。
- 列 `field` 为 `mblNums`（集合派生，不排序）；空数组兜底 `?? []`。
- `TransportOrderSimpleDto` 补 `saleNamesStr` / `operatorNamesStr` / `customerServiceNamesStr`，与详情同源，本次列表未展示。

# 避坑指南

- 不要读组内的 `currencyGroup` / `totalPayPrice` / `totalReceivePrice`，它们在本接口恒为 `null`；金额用行根字段。
- 组内 `currencyGroup` 与行根 `currencyGroup` 同名不同层级，取值时看层级。
- 费用管理「付款申请列表」已同样加「提单号」列；`GetPagedListAsync` 若未填充 `payAppFeeBySeaExportGroup`，该列会空。
- 列设置只持久化 `field`；`mblNums` 不是接口字段，展示靠代码里的 formatter，恢复列配置后仍能拼出提单号。
