# 收费结算选费抽屉增加币别筛选

## 背景意图

收费结算添加明细时，`GetOrderFeeGroupAsync` 需传入与银行流水一致的 `currencyId`，仅展示同币别可结算费用；币别由银行流水自动带出，用户不可修改。

## 核心逻辑变更

1. `AddFeeDrawerProps` 新增 `currencyId`、`currencyCode`，由主表 `bankStatementDetail` 传入。
2. 选费抽屉搜索区新增只读 `CurrencySelect`，与结算对象一样随银行流水锁定。
3. `fetchData` / `handleSearch` 调用 `GetOrderFeeGroupAsync` 时携带 `currencyId`。
4. 打开抽屉前校验银行流水是否已关联币别。

## 避坑指南

- 币别来源必须是银行流水详情 `currencyId`，不要允许用户在抽屉内切换。
- 与结算对象字段一致：`drawerProps` 为唯一数据源，表单值仅用于展示。
