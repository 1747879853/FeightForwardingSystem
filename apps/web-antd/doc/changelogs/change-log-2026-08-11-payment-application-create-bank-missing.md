---
title: 付费申请新增跳转编辑后银行账户空白
date: 2026-08-11
type: Fix
module: 费用管理 / 付费申请
author: auto-doc-sync
---

# 付费申请新增跳转编辑后银行账户空白

## 一、背景意图

新建付费申请在添加费用抽屉确认后会自动 `AddAsync` 并跳转编辑页。用户反馈：跳转后费用合计区「银行账户」无选中/无明细；再次添加一笔费用后银行又显示出来。

## 二、核心逻辑变更

### 根因

1. **新增自动保存时银行漏提交**：`handleFeeConfirm` 在写入 `feeDetailRows` **之前**调用 `buildSubmitData(nextRows)`；而 `buildBankSubmitList` / `bankCurrencies` 仍读当时为空的 `feeDetailRows`，导致 `paymentApplicationBanks` 为空。
2. **编辑回填覆盖默认**：`loadEditData` 中 `loadClientBanks` 已 `applyDefaultBankSelections`，随后 `restoreBankSelectionsFromDetail` 用详情空银行整表覆盖为 `{}`，界面无选中；二次加费用触发 `bankCurrencies` watch，再次补默认，故「又显示了」。

### 修复（`form.vue`）

- 抽出 `resolveBankCurrencies(rows)`；`buildSubmitData` / `buildBankSubmitList` 按入参费用行解析币别，不再依赖尚未写入的 `feeDetailRows`。
- **首次添加费用确认创建**：同步结算对象 → `loadClientBanks(true)` 拉取开票银行 → `applyDefaultBankSelections(currencies)` 自动带出默认账户 → `AddAsync` 携带 `paymentApplicationBanks` 一并保存。
- `loadEditData`：详情回填后再次 `applyDefaultBankSelections()`，详情无银行时用开票默认账户补齐。

## 三、避坑指南

- 任何「先算提交体、后写 `feeDetailRows`」的路径，银行/币别汇总必须用入参 `rows`（或等价快照），不能读响应式 `feeDetailRows`。
- `restoreBankSelectionsFromDetail` 会整表赋值；详情缺银行时务必在其后补默认，否则会把 `loadClientBanks` 刚设的默认冲掉。
- 二次加费用「修好」只是 watch 副作用，不是正确数据源；应以 Add/详情带回的 `paymentApplicationBanks` 为准。
