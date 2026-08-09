# 2026-08-09 付费申请详情起运港/目的港读 seaExport.pol

## 背景意图

付费申请详情费用分组「起运港 / 目的港」为空。详情 `transportOrder` 港口已挂在嵌套 `seaExport.pol` / `seaExport.pod`（含 `portName`），前端仍读已废弃的平铺 `seaExportPOLPortName` / `seaExportPOL.portName`。对应 TAPD：[#0633](https://www.tapd.cn/61580498/bugtrace/bugs/view/1161580498001000633) 问题（1）。

同单问题（2）：列绑 `unRqstPaymentAmount`（可申请余额），本单已申请满时为 0；结算未结看 `unSettledAmount`。文案已改为「可申请金额」，无需改计算。

## 核心逻辑变更

- `resolvePolPortDisplayName` / `resolvePodPortDisplayName` 优先读 `seaExport.pol|pod.portName`
- `TransportOrderSimpleDto` 补 `seaExport?: SeaExportSimpleForPayAppDto`

## 避坑指南

- 选费列表 `PayAppFeeGroupDto` 仍可能平铺 `pol`，解析函数保留旧路径兜底
- 勿把 `unRqstPaymentAmount` 当成 `unSettledAmount`；前者是可再申请额度，后者是未核销余额
