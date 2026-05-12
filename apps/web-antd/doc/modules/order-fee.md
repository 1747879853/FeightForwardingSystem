# OrderFee 模块活文档

## 模块定位

- 模块名称：订单费用（应收应付）管理。
- 业务作用：承接海运出口/海运进口委托后的费用录入，是付费申请、审核、结算的基础数据层。
- 核心 API：`apps/web-antd/src/api/sea-export/order-fee-admin.ts`（海进同构 API 在 `sea-import` 目录）。

## 入口与页面

- 海运出口编辑页 Tab：`apps/web-antd/src/views/sea-export-admin/orderFee/index.vue`
- 海运进口编辑页对应目录：`apps/web-antd/src/views/sea-import-admin/orderFee/`
- 主要表格组件：`order-fee-table.vue`

## 核心业务对象

- `OrderFeeDto`：费用主对象。
- 核心字段（前端可见）：
  - 标识与归属：`id`、`transportOrderId`、`changeOrderId`
  - 业务属性：`paySide`、`feeCodeId`、`settlementId`、`currencyId`
  - 金额属性：`unitPrice`、`amount`、`taxRate`、`noTaxAmount`
  - 进度属性：`feeStatus`、`invoiceStatus`、`settlementStatus`
  - 付费关联：`rqstPaymentAmount`、`unRqstPaymentAmount`、`settledAmount`、`unSettledAmount`

## 关键字段来源（当前可确定）

- 费用名称：`feeCodeId` 关联费用代码主数据得到 `feeCodeName`。
- 结算对象：`settlementId`（注释约定：船公司走船公司，其余走客户）。
- 币别/汇率：`currencyId`、`exchangeRate`，汇率可在录入时调整。
- 展示计算项：`unInvoicedAmount`、`noTaxUnitPrice`、`noTaxAmount` 为服务端计算返回。

## 业务流程

1. 在委托编辑页进入「应收应付」。
2. 新增/编辑费用明细（收付、费目、结算对象、币别、单价、数量、税率、备注等）。
3. 批量或单条保存费用，形成费用台账。
4. 按需触发提交审核、修改申请、删除申请。
5. 费用数据进入付费申请、对账单和结算状态推进链路。

## 状态流转（前端枚举可见）

- `feeStatus`：覆盖录入、提交审核、审核通过/驳回、申请改/删、部分结算、结算完毕等状态。
- `invoiceStatus`：开票维度状态。
- `settlementStatus`：结算维度状态。

说明：最终状态转换规则与并发控制以后端实现为准，前端负责触发动作与展示结果。

## 与主流程关系

- 上游依赖：海运出口/进口委托数据、客户与主数据。
- 下游输出：为费用审核、付费申请、对账单提供可选费用明细。
- 关键影响：费用录入口径直接影响财务申请金额、审核结果与结算进度。

## 测试建议

- 基础录入：覆盖应收/应付、多币别、多结算对象。
- 金额口径：校验金额、税率、未申请、未结算等展示字段计算结果。
- 状态链路：录入 -> 提交审核 -> 通过/驳回 -> 申请结算后的状态变化。
- 关联校验：费用进入付费申请和对账单时字段是否完整、金额是否一致。

## 注意事项

- 海出/海进 API 结构高度一致，但仍需分别验证业务类型差异字段。
- 费用表可能含任务列表字段（`submitOrderFeeTasks` 等），用于显示审核上下文。
- 若后续补充字段来源文档，可按“主数据来源 / 计算来源 / 回写来源”三段扩展。
