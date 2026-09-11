# 费用录入行业类别补「个人」且可清空

## 背景意图

海运出口费用录入 Handsontable 中，行业类别下拉缺少「个人」；清空行业类别时因 strict 校验或 `_value` 残留，无法真正为空。

## 核心逻辑变更

- `_shared/order-fee/data.ts`：`getIndustryCategoryOptions` 对齐客户模块，补 `key:22 / value:'v' / personnelAgent`（个人）。
- `useHotColumns`：行业类别自定义 validator，允许 null/空串。
- `useHotSettings` / `useOrderFeeLinkage`：清空时同步清除 `industryCategory_value`，避免旧枚举值继续联动或提交。
- `en-US/seaExport.json`：补 `personnelAgent` 文案。

## 避坑指南

- 费用录入选项源是 `_shared/order-fee/data.ts`，不是 `client/base/options.ts`；客户模块已有「个人」时费用表仍可能缺项。
- 仅清显示值不够，必须清 `*_value`，否则 sanitize/联动仍按旧 key。
