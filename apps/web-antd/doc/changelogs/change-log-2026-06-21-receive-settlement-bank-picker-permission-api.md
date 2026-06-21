# 收费结算银行流水接口改用权限过滤

## 背景意图

收费结算选择、展示银行流水时，应只访问当前用户有操作权限的流水（操作人包含当前用户，或未配置操作人），避免通过 Admin 全量接口误选或越权查看。

## 核心逻辑变更

- 新增 `getBankStatementPagedListByPermission`，调用 `BankStatement/GetPagedListAsync`。
- 新增 `getBankStatementDetailByPermission`，调用 `BankStatement/DetailAsync`。
- 新增 `getBankStatementReceiveSettlementPagedListByPermission`，调用 `BankStatement/GetReceiveSettlementPagedListAsync`。
- `bank-statement-picker` 弹窗列表与 `form.vue` 中 `loadBankStatementSummary`（详情 + 已结算汇总）均改用上述接口。
- `BankStatementSelect` 下拉列表与回显详情同样改用上述权限接口。
- 银行流水列表页、银行流水编辑页仍使用 Admin 接口，行为不变。

## 避坑指南

- 权限过滤接口与 Admin 接口路径前缀不同：`/services/app/BankStatement` vs `/services/app/BankStatementAdmin`。
- 选流后详情与关联结算汇总均走 `BankStatement/*` 权限接口，与列表权限过滤职责一致。
