# 2026-08-09 付费申请币别展示改为直读接口 code

## 背景意图

付费申请「原始币别」等不应依赖前端 `CN_NAME_TO_CODE` 把「人民币」硬映射成 `RMB`，应以币别主数据/费用上的 `currency.code` 为准。对应 TAPD：[#0701](https://www.tapd.cn/61580498/bugtrace/bugs/view/1161580498001000701) 问题（2）。

## 核心逻辑变更

- 删除 `fee-management/utils/currency-display.ts`（`toCurrencyDisplayCode`）
- 付费申请表单、添加费用抽屉、汇总列一律直读 `currency.code` / 行上已存的 `currencyCode`
- `CurrencySelect`：`labelKey=code` 时只用后端 `code`，禁止回退 `cnName`；option 增加 `raw` 供业务取 `code`

## 避坑指南

- 接口未返回 `code` 时界面为空，不要再前端伪造代码；应修币别主数据或接口 Include
- 同单问题（1）银行 SWIFT 必填校验不在本仓，需后端去掉
