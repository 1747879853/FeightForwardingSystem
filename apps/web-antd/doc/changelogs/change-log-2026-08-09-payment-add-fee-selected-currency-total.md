---
title: 添加费用抽屉展示按币别已选合计并修复跨页确认
module: 费用管理 / 付费申请
author: auto-doc-sync
last_updated: 2026-08-09
---

# 1. 背景意图 (Background)

添加费用抽屉勾选后，用户难以及时得知本次按币别选了多少金额；同时翻页后勾选虽仍显示，但确认时原先只解析当前页费用，跨页选择会丢失。

# 2. 核心逻辑变更 (Core Logic)

1. 「费用明细」标题右侧展示「已选 N 笔」及各币别本次申请净额合计（付 − 收）。
2. 勾选时写入 `selectedFeeCache`（feeId → SelectedFeeItem），翻页不清空；合计与「添加到申请单」均读缓存。
3. 修改「本次申请」金额时同步更新缓存与合计展示。

# 3. 避坑指南 (Pitfalls)

- 翻页保留勾选依赖 `selectionMap` + `selectedFeeCache`；搜索条件变化仍会 `clearSelection`。
- 合计金额取 `appliedAmountMap`（本次申请），不是原始金额；符号口径与主表一致（付正收负）。
- 勿再仅用当前页 `orderList` 组装确认结果，否则跨页勾选会丢。
