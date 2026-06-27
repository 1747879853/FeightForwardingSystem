# 编号规则新增发票申请单号类型

## 背景意图

发票开出模块需按统一编号规则生成申请单号，前端编号规则管理页需支持配置 `InvoiceIssue.ApplicationNo`。

## 核心逻辑变更

- `GenerateNumAdmin/data.ts`：`TABLE_NAME_VALUES` 新增 `InvoiceIssue.ApplicationNo`。
- `locales/zh-CN/system.json`、`locales/en-US/system.json`：补充 `tableNameOptions.InvoiceIssue.ApplicationNo` 文案（发票申请单号 / Invoice Application No.）。

## 避坑指南

- 表名值格式必须为 `Entity.Field`，与后端 `GenerateNumAsync` 约定一致。
- 新增类型仅需改前端常量与 i18n，无需改 API 层；后端需已注册对应实体字段。
