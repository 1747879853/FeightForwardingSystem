# 收费结算列表银行流水查询条件调整

## 背景意图

收费结算列表接口 `ReceiveSettlementAdmin/GetPagedListAsync` 已支持 `bankStatementId` 查询参数。原先通过工具栏「选择银行流水」弹窗筛选，交互与列表查询区不一致，且与接口能力重复。

## 核心逻辑变更

1. 新增 `BankStatementSelect` 业务下拉组件，复用 `BankStatementAdmin/GetPagedListAsync` 分页搜索。
2. 收费结算列表查询表单新增「银行流水」字段，查询时直接传 `bankStatementId`。
3. 移除列表工具栏「选择银行流水」按钮及已选流水 Tag，保留从银行流水页带 `bankStatementId` query 进入时的预填逻辑。
4. 新建收费结算时，若查询区已选银行流水，继续通过 query 带入新建页。
5. 查询区布局调整为 `grid-cols-6` 一行六列，结算时间范围占两列（`col-span-2`），标签宽度 64px（`commonConfig.labelWidth`）。

## 避坑指南

- 列表筛选应走查询表单，不要在工具栏再挂独立 picker，避免同一条件两套入口。
- `BankStatementSelect` 搜索关键字映射为 `bankStatementNo`，与银行流水列表页一致。
- Vben 列表查询表单的 `labelWidth` 必须写在 `formOptions.commonConfig` 内，顶层配置不会生效。
