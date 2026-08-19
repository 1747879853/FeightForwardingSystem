---
title: 银行流水按费用选费抽屉补编号检索与收付类别
module: 收费核销
author: auto-doc-sync
last_updated: 2026-08-19
---

# 背景意图

银行流水「新建核销 · 按费用」选费区原先只有委托编号、主提单号两个条件，费用明细和核销记录也不展示收付方向。对应 TAPD #0787：检索合并为「编号」、补委托单位/开船日期/销售/操作/收付类型（默认应收），并在抽屉明细与核销记录展示收付类别。业务行委托编号、主提单号仍分列。

# 核心逻辑变更

- 选费检索：`委托编号` + `主提单号` 合并为 `keyword`（标签「编号」）；新增 `clientId`、`etdRange`、`saleIds`、`operatorIds`、`paySide`。`paySide` 默认 `0`（应收），选「全部」时不传该参数。
- 费用明细与收费核销「结算明细」在费用名称后增加「收付类别」Tag（0 应收 / 1 应付），数据来自已有 `paySide`。业务行仍分列展示委托编号、主提单号。
- `GetOrderFeeGroupAsync` 查询 DTO 同步上述字段，数组参数用 `paramsSerializer: 'repeat'`。

# 避坑指南

- **`paySide === 0` 必须原样下发**，不能写成 `values.paySide || undefined`，否则默认「应收」会被当成没选。
- 「全部」是不传 `paySide`，不要发明第三个枚举值给后端。
- 编号只走 `keyword`，不要同时再传 `commissionNum`/`mblNum`，旧接口若对后两者做 AND，会搜不到主提单号。
- 银行流水建单面板与收费核销「添加明细」抽屉共用 `add-fee-drawer/data.ts` 的 schema，改检索条件两边一起生效。
