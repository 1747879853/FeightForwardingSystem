---
title: 付费申请与审批列表补主提单号委托编号
date: 2026-08-31
module: fee-management / payment-application, audit-approval / payment-review
---

# 背景意图

财务在付费申请、付费审核列表里只能看金额，对不上具体业务。发票申请列表已有「主提单号」「委托编号」。本次只改这两张列表，付费结算不动。

# 核心逻辑变更

- 列表「提单号」改名为「主提单号」，紧挨其后增加「委托编号」。
- 两列都从 `payAppFeeBySeaExportGroup[].transportOrder` 取值：`mblNum` / `commissionNum`，trim、保序去重、逗号拼接；过长用省略号。
- 共用 `formatPayAppMblNums` / `formatPayAppCommissionNums`；集合派生列保留 formatter。

# 避坑指南

- 组内金额字段恒为 null（审批列表），不要拿来展示。
- `mblNums` / `commissionNums` 不是接口平铺字段，列设置只持久化 `field`，展示仍靠代码里的 formatter。
- 已保存过列配置的账号，新「委托编号」列会默认显示并跟在已有可见列后面，不一定紧挨主提单号；列设置里可拖回申请单号后。
- 列标题不要用新加的 `$t` 键：语言包启动时加载，HMR 进不了 i18n，会把 `auditApproval.paymentReview.commissionNum` 原样显示。两列表头直接写「主提单号」「委托编号」。
