---
title: 付费申请列表增加当页申请合计
date: 2026-09-09
module: fee-management / payment-application
---

# 背景意图

付费申请列表每行已有「RMB申请合计」「USD申请合计」，但没有当前页加总。TAPD 要求补合计。单独一条合计栏会跟分页拆成两行，改嵌进表格分页行。

# 核心逻辑变更

- 分页行嵌入「当页合计」，按币别汇总当前页申请净额（付 − 收），与列上 `calcRowAppliedTotal` 口径一致。
- 固定币别申请只计入结算币别；若该币别不在 `currencyGroup` 里，合计仍补上结算币别。
- 走 vxe `pagerConfig.slots.left`，用 flex order 插在「共 xx 条 / 每页条数」和翻页按钮之间，不另起一行。
- 合计只算当前页，翻页会变；不把人民币和美元加在一起做「总计」。

# 避坑指南

- 不要用表格最后一行当合计：会和勾选、排序、分页抢行。
- 固定币别行不要把 `currencyGroup` 里的原币金额加进合计。
- 全局 `.vxe-pager--sizes { margin-right: auto }` 会把合计挤到最左；本页把 auto 挪到合计容器上，并 `justify-content: flex-start`。
