# 编号规则新增发票申请单号并修正开具单号文案

## 背景意图

开票业务区分「申请」与「开具」两个阶段，编号规则需分别支持：

- `InvoiceApplication.ApplicationNo`：提交发票开具申请时的唯一流水号（开票申请编号）
- `InvoiceIssue.ApplicationNo`：正式开票时的唯一编号（开票流水号）

此前仅配置了 `InvoiceIssue.ApplicationNo`，且中文文案误标为「发票申请单号」。

## 核心逻辑变更

- `GenerateNumAdmin/data.ts`：`TABLE_NAME_VALUES` 新增 `InvoiceApplication.ApplicationNo`。
- `locales/zh-CN/system.json`：新增 `InvoiceApplication.ApplicationNo`（发票申请单号）；`InvoiceIssue.ApplicationNo` 改为「发票开具单号」。
- `locales/en-US/system.json`：新增 `Invoice Application No.`；`Invoice Issue No.` 替换原 `Invoice Application No.`。

## 避坑指南

- 申请单号与开具单号为不同实体字段，配置规则时勿混淆表名。
- 表名值格式必须为 `Entity.Field`，与后端 `GenerateNumAsync` 约定一致。
