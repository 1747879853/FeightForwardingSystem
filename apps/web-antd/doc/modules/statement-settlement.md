# StatementSettlement 模块活文档

## 模块定位

- 模块名称：客户对账与结算口径说明。
- 业务作用：澄清系统内“对账”“付费申请”“结算状态”的关系，避免产品与测试对结算链路理解混淆。
- 路由入口：`/fee-management/statement`
- 权限：`Admin.Statement`

## 页面与代码位置

- 列表页：`apps/web-antd/src/views/fee-management/statement/index.vue`
- 编辑页：`apps/web-antd/src/views/fee-management/statement/editor.vue`
- API：`apps/web-antd/src/api/settlement-management/statement-admin.ts`

## 核心业务对象

- 对账单：`StatementDto`
- 对账单费用集合：`orderFeeIds`
- 币别分组：`StatementCurrencyDto`
- 业务分组：`OrderFeeAndSeaExportDto`（费用 + 运输单信息）

## 结算相关概念拆分

### 1) 费用结算状态（费用维度）

- 来源：`OrderFeeDto.settlementStatus` 等费用字段。
- 含义：某条费用是否已进入部分/完成结算。

### 2) 付费申请状态（申请单维度）

- 来源：`PaymentApplicationStatus`。
- 含义：申请单从录入到审核、再到部分/全部结算的流程状态。

### 3) 客户对账单（账单维度）

- 来源：`StatementDto`。
- 含义：面向客户账单汇总与核对，不直接等同于付款审批动作。

## 对账单业务流程

1. 新建对账单，选择客户并维护时间范围/说明/备注。
2. 从未对账费用池按条件筛选费用并加入对账单。
3. 支持后续增删费用，更新对账单内容。
4. 按币别与业务维度展示金额汇总，支持附件管理。

## 关键字段来源线索

- `clientId`：对账客户主体。
- `orderFeeIds`：关联费用明细主键集合。
- `statementCurrencyGroup`：后端按币别汇总后返回。
- `localCurrencyReceiveAmount/localCurrencyPayAmount`：本位币口径汇总字段。

## 与主流程关系

- 与“付费申请”关系：共享费用来源，但目标不同（对账偏核对，付费申请偏支付审批）。
- 与“费用结算状态”关系：对账并不自动代表结算完成，需结合费用与申请状态共同判断。
- 与“海运出口”关系：对账展示可回溯到运输单信息（委托号、提单号、港口等）。

## 测试建议

- 对账单新增、编辑、删除、批量删除全链路验证。
- 费用加入/移除对汇总金额影响是否正确。
- 多币别场景下币别分组与本位币汇总口径一致性。
- 与付费申请并行操作时，校验可选费用池是否符合后端规则。

## 注意事项

- 该模块文档重点是业务口径澄清，不替代财务制度定义。
- 若后续要补充“字段来源到主数据表级别”，建议在本文件新增“字段字典映射”章节持续沉淀。
