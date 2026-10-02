# 费用录入结算对象拖拽填充

## 背景意图

结算对象列填完后，向下拖拽填充柄覆盖下方单元格时内容未写入。

## 原因

选中结算对象后单元格 data 存的是客户 **id**；列是 `strict + allowInvalid:false` 的 autocomplete。拖拽填充不会打开编辑器，`currentOptionsCache` 为空，且旧的合法值集合只收录 label/name，**不含 id**，strict 校验把复制的 id 判无效并取消写入。

## 核心逻辑变更

- `buildSettlementAutofillValueSet`：合法值纳入客户 id / label / name，以及表内已填结算对象。
- autocomplete `source`：query 命中上述集合则纳入候选，保证 autofill 通过 strict。
- `afterChange`：缓存未命中时从全量客户或表内同源行解析 id 与 `__settlementName`。
- 联动 `applySettlementIdentity`：解析 id 时同步补展示名与税率缓存。

## 涉及文件（摘要）

- `modules/utils/helpers.ts` / `helpers.test.ts`
- `modules/composables/useHotColumns.ts`
- `modules/composables/useHotSettings.ts`
- `modules/composables/useOrderFeeLinkage.ts`
- `modules/order-fee-table-handsontable.vue`
