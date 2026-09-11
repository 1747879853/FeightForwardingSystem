---
title: 完成服务项后展示自动生成费用
date: 2026-09-11
module: sea-exports
---

# 背景意图

后端 `SeServiceTaskAdmin/CompleteAsync` 已改为返回本次按自动费用模板生成的费用条数与列表。完成服务后如果生成了费用，需要立刻把关键字段展示给操作人核对。

# 核心逻辑变更

1. `completeSeServiceTask` 出参由 `boolean` 改为 `SeServiceTaskCompleteResultDto`。
2. 仅当 `generatedFeeCount > 0` 时弹窗展示费用表：费用名称、结算对象、币别、汇率、含税单价、含税金额、单位、数量、税率、收付类型。
3. 海运出口编辑页「完成服务」与工作台单条/批量完成共用同一套展示。批量完成会汇总各任务返回的费用后再弹一次。
4. 费用名称 / 结算对象 / 币别分别读 `feeCode.cnName`、`settlement.name`、`currency.code`，与业务费用对象化口径一致。收付类型按后端约定：`0` 收、`1` 付。

# 避坑指南

- 没生成费用时 `generatedFeeCount = 0`、`generatedFees = []`，不要弹空表。
- 旧后端若仍返回 `true`，前端按对象缺失处理，不弹窗、不报错。
- 弹窗在详情刷新 / 工作台列表刷新之后再出现，避免完成态还转圈时挡住操作。
