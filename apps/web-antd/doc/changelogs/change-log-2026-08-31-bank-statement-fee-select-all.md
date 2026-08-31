---
title: 银行流水按费用核销补费用明细全选
date: 2026-08-31
module: settlement-management / bank-statement-edit
---

# 背景意图

银行流水「按费用核销」展开前只能看到业务行，没有勾选列。收费核销添加费用抽屉用 Ant Table `row-selection` 自带表头全选，财务在银行流水这边找不到费用明细全选。

# 核心逻辑变更

- 业务行增加勾选列：表头勾选当前页全部费用明细，行勾选该票全部费用。
- 展开后组内表头勾选、行勾选仍保留，三层勾选共用 `selectedFeeIds`。
- 勾选列加 `fee-select-col`，避免 48px 列被 `overflow: hidden` 裁掉。

# 避坑指南

- 不要改共享 `orderColumns`：收费核销抽屉的 Ant Table 也在用，加列会多出空列。
- 全选只覆盖当前页 `orderList` 里的费用，翻页后不会带上其它页。
