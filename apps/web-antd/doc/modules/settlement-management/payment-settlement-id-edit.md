---
title: 付费结算编辑
module: 财务管理
author: auto-doc-sync
last_updated: 2026-07-25
---

# 1. 业务背景说明 (Background)

**白话解释：** 付费结算是把已审核通过的「付费申请」按结算币别折算后合并成一张对外付款单。页面维护结算时间、付款方式、结算对象、结算币别、双方银行与手续费，并按「付费申请 → 原币币别 → 费用」三层展开维护本次结算量；结算对象与币别一经确定即随第一张付费申请锁定，不允许在本页自由更改。

# 2. 功能与操作说明 (Features & Operations)

- **新建结算：** `/settlement-management/payment-settlement/add`，先通过「选择付费申请」抽屉挑选审核通过的申请；首次添加后自动带出结算对象与结算币别。
- **编辑结算：** `/settlement-management/payment-settlement/edit/:id`，`DetailAsync` 回填主信息、汇率明细与 `paymentApplications` 分组；结算对象下拉只读并按详情 `settlement` 回显。
- **汇率维护：** 按涉及的原币币别维护汇率快照，原币与结算币别相同时强制为 1。
- **金额结算：** 第二层按币别展示本次结算量与结算金额，第三层展示费用明细及剩余可结算额度。
- **锁定/解锁与删除：** 在列表页按结算单执行；锁定后不允许进入编辑。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| 新建 | 保存成功 | 编辑 | 跳转编辑页继续维护，列表标记需刷新。 |
| 录入中 | 提交审核（后端流程） | 审核中/审核通过 | 前端只以 Tag 展示 `status`，不提供状态流转按钮。 |
| 未锁定 | 列表点击「锁定」 | 已锁定 | 调用 `LockAsync`；已锁定的结算单双击不再进入编辑。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **结算对象** | 本次付款的往来单位。 | **付费结算**<br/>`PaymentSettlementAdmin/DetailAsync` → `settlement`（`id`/`name`/`fullName`/`address`） | 新建时取第一张付费申请的 `settlementId`；编辑用详情 `settlement` 构造 `ClientSelect` 的 `selected-items` 回显，命中缓存则不再拉客户详情；变更后清空对方银行并重载结算银行选项。 | 保存前必填；页面内下拉只读。 |
| **结算币别** | 结算与付款使用的币别。 | **付费结算**<br/>`DetailAsync` → `currencyId` / `currencyCode` | 与汇率明细联动，原币等于结算币别时汇率固定为 1。 | 保存前必填。 |
| **付费申请分组** | 本次结算包含的付费申请及其费用明细。 | **付费结算**<br/>`DetailAsync` → `paymentApplications[]`（含 `settlement`、`currencyGroup`） | 分组重建 `mockApplication` 时，`clientName` 优先取分组 `settlement?.name`，回退到主表 `settlement?.name`。 | 至少添加一张付费申请。 |
| **对方银行** | 结算对象的收款银行。 | **客户开票信息**<br/>`GetClientInvoiceInfoList` | 依赖结算对象；结算对象变化即清空并重新加载选项。 | 结算对象为空时禁用。 |
| **手续费** | 付款产生的银行手续费。 | **付费结算**<br/>`AddAsync` / `EditAsync` | — | 选填。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：结算对象与币别随第一张付费申请锁定]** 首次添加付费申请后即写入 `settlementId` 与 `currencyId`，页面内不提供修改入口；换结算对象需重开结算单。

> [!IMPORTANT] **[卡点 2：`settlementName` 已被删除]** 详情与列表只返回 `settlement` 对象，任何展示都必须走 `settlement?.name` 并做空值兜底；费用行上的 `orderFee.settlementName` 是费用维度字段，与主表结算对象无关。

> [!IMPORTANT] **[卡点 3：ClientSelect 无通用详情接口]** 结算对象下拉的编辑回显必须由外部传 `selected-items`，否则目标客户不在首页分页结果内时会显示空白。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-08-09 | `Refactor` | 付费申请展开行、以及「添加付费申请」抽屉展开的费用明细，「费用名称」「币别」改读嵌套对象。 | `PaymentSettlementAdminApi.OrderFeeDto` 与 `OrderFeeForSelectionDto` 均已对象化——后者虽名字不同，但接口文档写明 `orderFees: List<OrderFeeDto>`，属同一后端 DTO。`application-items-table.vue` 与 `add-application-drawer/index.vue` 的内层 a-table `dataIndex` 改数组路径 `['feeCode','cnName']`/`['currency','code']`，`key` 保持不变以免影响既有 `#bodyCell` 分支。注意这两处列绑定是无类型的字符串，`vue-tsc` 查不出来，只能靠接口文档比对。详见 `changelogs/change-log-2026-08-09-order-fee-statement-foreign-key-objectification.md`。 |
| 2026-07-25 | `Refactor` | 结算对象改读对象化后的 `settlement`；编辑进入时下拉直接回显结算对象，列表「结算对象」列同步取对象值。 | 详情/列表删除 `settlementName`，类型复用 `PaymentApplicationAdminApi.ClientSimpleDtoForOrder`；列 `field` 保留 `settlementName` 以维持列持久化与排序映射，展示走 `formatter`；`watch(settlementId)` 命中 `selected-items` 缓存时跳过 `getClientDetail`。 |
