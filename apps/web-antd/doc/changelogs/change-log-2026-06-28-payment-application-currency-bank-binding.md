---
title: 付费申请费用合计按币别绑定结算银行
date: 2026-06-28
type: Feature
module: 费用管理 / 付费申请
author: auto-doc-sync
---

# 付费申请费用合计按币别绑定结算银行

## 一、背景意图

付费申请新增子表 `PaymentApplicationBank`，要求在「费用合计」中为每个币别绑定结算对象维护的开票银行账户。前端需在 `/fee-management/payment-application/add`（及编辑页）的费用合计区，按结算模式为每个币别提供银行下拉，默认选中默认账户、可下拉切换，且为必填；选中后额外展示开户行 / 账号 / SWIFT Code。

## 二、核心逻辑变更

### 1. API 类型（`payment-application-admin.ts`）

- 新增 `ClientInvoiceBankSimpleDto`、`PaymentApplicationBankDto`（详情返回）。
- `CurrencyGroupDto` 增补 `totalUnSettledAmount?` 与 `paymentApplicationBank?`（仅最外层 `currencyGroup` 返回）。
- 新增 `PaymentApplicationBankAddDto`（`{ clientInvoiceBankId }`）、`PaymentApplicationBankEditDto`（`{ id?, clientInvoiceBankId }`）。
- `PaymentApplicationAddDto` 增补 `paymentApplicationBanks?`；`PaymentApplicationEditDto` 增补 `paymentApplicationBanks?`（全量替换）。

### 2. 页面逻辑（`form.vue`）

- 复用既有接口 `ClientInvoiceInfoAdmin/GetListAsync`（`getClientInvoiceInfoList`）拉取结算对象开票信息，扁平化所有 `clientInvoiceBanks` 得到 `clientBanks`。
- `bankCurrencies` 计算需要绑定银行的币别：
  - 原币结算（`settlementCurrencyId === null`）：取费用各币别（`currencySummaries`）；
  - 指定币别结算：仅结算币别一条。
- `bankSelections`（`currencyId -> clientInvoiceBankId`）维护选择；`applyDefaultBankSelections` 为缺失/失效币别按该币别默认银行（`isDefault`）补默认，已有有效选择保留。
- 结算对象变更（`onSettlementChange` / `onSettlementIdSync`）触发 `loadClientBanks`，并清空旧选择。
- 提交前 `ensureBanksSelected` 校验每个币别均已选银行；`buildBankSubmitList` 按 `bankCurrencies` 顺序产出 `paymentApplicationBanks`。
- 新增走 `AddAsync`（`buildSubmitData`）携带 `paymentApplicationBanks`；编辑走 `EditAsync`（`saveEditMode`）全量替换。
- 编辑回填 `restoreBankSelectionsFromDetail`：原币按 `currencyGroup[].id`（币别）映射 `paymentApplicationBank.clientInvoiceBankId`；指定币别取任一分组共享的银行映射到结算币别。

### 3. UI

- 原币模式：每张币别卡片下方新增「结算银行」下拉 + 选中后开户行/账号/SWIFT 明细。
- 指定币别模式：折算合计条下方新增结算币别银行下拉 + 明细。
- 银行选择仅在新增或编辑且录入中（`canEditBank`）可编辑。

## 三、避坑指南

- **键的口径不同**：原币模式 `bankSelections` 以「费用币别 id」为键；指定币别模式以「结算币别 id」为键。编辑回填和提交都需按当前模式取键，切勿混用。
- **后端校验严格**：原币结算必须每种费用币别恰好一条对应币别银行；指定币别结算必须且仅一条结算币别银行；银行须属于当前结算对象且主数据含完整开户行/账号/SWIFT，否则保存被拦截。
- **默认选中时机**：`clientBanks` 异步加载，`bankCurrencies` 随费用变化；`applyDefaultBankSelections` 在两者就绪后都会执行（watch + 加载完成回调），保留用户已选的有效项。
- 编辑回填顺序：先 `loadClientBanks(true)` 应用默认，再 `restoreBankSelectionsFromDetail` 覆盖为已保存值。
