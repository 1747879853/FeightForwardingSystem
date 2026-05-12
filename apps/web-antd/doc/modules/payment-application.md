# PaymentApplication 模块活文档

## 模块定位

- 模块名称：付费申请管理。
- 业务作用：基于可申请费用生成付费申请单，承接费用审核后到付款执行前的关键业务环节。
- 路由入口：`/fee-management/payment-application`
- 权限：`Admin.PaymentApplication`

## 页面与代码位置

- 列表页：`apps/web-antd/src/views/fee-management/payment-application/list.vue`
- 新建/编辑页：`apps/web-antd/src/views/fee-management/payment-application/form.vue`
- 费用选择抽屉：`apps/web-antd/src/views/fee-management/add-fee-modal/index.vue`
- 表单计算逻辑：`apps/web-antd/src/views/fee-management/payment-application/form-data.ts`
- API：`apps/web-antd/src/api/settlement-management/payment-application-admin.ts`

## 申请单状态（前端枚举）

- `Entering`：录入中
- `Auditing`：审核中
- `Rejected`：已驳回
- `Passed`：已通过
- `Partial`：部分结算
- `Settlemented`：结算完毕

## 核心业务对象

- 申请单头：`PaymentApplicationDto`
- 申请单明细：`PaymentApplicationItem*`（关联 `orderFeeId`）
- 可选费用分组：`PayAppFeeGroupDto`
- 汇总对象：币别分组、订单分组、折算汇总（由 `form-data.ts` 计算）

## 关键字段与来源

- `settlementId`：结算对象（客户/结算主体）。
- `settlementCurrencyId`：结算币别；`null` 代表按原票币申请。
- `appliedAmount`：本次申请金额（明细行输入/调整）。
- `rate`：申请汇率（指定结算币别时用于折算）。
- `currencyGroup`：按币别聚合金额，供列表与详情展示。

## 业务流程

1. 新建申请单，选择结算对象与结算币别策略。
2. 从“可选费用池”按条件筛选费用并加入明细（排除已加入项）。
3. 维护明细申请金额、汇率、行备注等内容。
4. 保存申请单（新增或编辑）。
5. 提交申请进入审核流程；必要时可撤回提交。

## 关键业务规则（前端可见）

- 当申请单已有费用明细时，结算对象与结算币别会被锁定，防止口径漂移。
- 明细行按运输单分组显示，支持分组与全局勾选。
- 汇总区同步展示原币汇总与折算汇总，辅助财务审核。

## 与主流程关系

- 上游依赖：订单费用模块（尤其费用状态与可申请金额）。
- 下游输出：付费审核任务与最终付款/结算状态。
- 并行关系：与客户对账单共享费用池概念，但业务目标不同。

## 测试建议

- 新建单：原票币模式与指定结算币别模式都要覆盖。
- 编辑单：新增明细、删除明细、修改申请金额、保存后重开校验。
- 提交流程：提交、撤回、重复提交、状态展示一致性。
- 金额校验：申请金额边界值与汇率边界值、汇总精度与显示一致性。

## 注意事项

- 申请单状态与费用结算状态并非一一同步，需要按业务口径分别验证。
- 费用是否可被申请的最终规则受后端校验影响，前端仅做筛选与展示控制。
