# 付费申请编辑页结算对象文案统一

## 背景意图

付费申请编辑页主表字段已使用「结算对象」，但费用明细列与添加费用抽屉仍显示「结算单位」，术语不一致。

## 核心逻辑变更

- `seaExport.export.paymentApplication.settlementNameColumn` 文案由「结算单位」改为「结算对象」。
- 添加费用抽屉（`add-fee-modal`）搜索表单标签、费用子表列标题、校验提示统一引用上述 i18n 键。

## 避坑指南

- `add-fee-modal` 仅被付费申请页引用，修改不会影响对账单模块；对账单 `statement.settlementNameColumn` 仍保持原值，需单独调整时再改。
