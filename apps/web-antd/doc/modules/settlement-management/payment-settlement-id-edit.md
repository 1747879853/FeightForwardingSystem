---
title: 付费结算编辑
module: 财务管理
author: auto-doc-sync
last_updated: 2026-09-09
---

# 1. 业务背景说明 (Background)

**白话解释：** 付费结算是把已审核通过的「付费申请」按结算币别折算后合并成一张对外付款单。页面维护结算时间、付款方式、结算对象、结算币别、双方银行与手续费；结算粒度是「付费申请 + 原币币别」一行，详情与选择列表结构一致。结算对象与币别一经确定即随第一张付费申请锁定。

# 2. 功能与操作说明 (Features & Operations)

- **新建结算：** `/settlement-management/payment-settlement/add`，抽屉调 `GetPagedListByCurrencyForSettlementAsync`（有结算币别时传 `settlementCurrencyId`）；确认后走 `AddByCurrencyAsync`。
- **编辑结算：** `/settlement-management/payment-settlement/edit/:id`，`DetailByCurrencyAsync` 回填主信息与 `paymentApplicationCurrencies[]`；追加 `AddItemsByCurrencyAsync`，删除 `DeleteItemsByCurrencyAsync`。
- **汇率：** 前端不录入；后端从付费申请明细快照到行上 `rate`（原币申请恒为 1）。
- **金额：** 每行填 `settledPrice`（结算币别）；结满一行直接用列表返回的 `totalUnSettledPrice`。
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
| **结算对象** | 本次付款的往来单位。 | `DetailByCurrencyAsync` → `settlement` | 新建取第一张付费申请；编辑用详情回显。 | 保存前必填；页面内下拉只读。 |
| **结算币别** | 结算与付款使用的币别。 | `DetailByCurrencyAsync` → `currencyId` / `currency` | 选择列表传 `settlementCurrencyId` 过滤。 | 保存前必填。 |
| **结算行** | 「付费申请+原币」组合。 | `paymentApplicationCurrencies[]`（含 `rowKey`、`settledPrice`、`rate`、`orderFees`） | 追加/删除按组合键。 | 至少一行。 |
| **对方银行** | 结算对象的收款银行。 | `GetClientInvoiceInfoList` | 依赖结算对象。 | 结算对象为空时禁用。 |
| **手续费** | 付款银行手续费及币别。 | `transactionFee` + `transactionFeeCurrencyId` | 币别默认可跟结算币别，可单独改。结算总金额**不含**手续费。 | 选填。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：粒度是申请+原币]** 同一付费申请可拆多行；删明细、判重、选择列表禁用都以 `rowKey`（`paymentApplicationId_originalCurrencyId`）为准。

> [!IMPORTANT] **[卡点 2：三类币别勿混]** `originalCurrencyId`=费用原币；申请行 `currencyId`=申请币别（null=原币申请）；结算单 `currencyId`=结算币别。选择列表的搜索「原币币别」对应查询参数 `currencyId`，结算币别对应 `settlementCurrencyId`。

> [!IMPORTANT] **[卡点 3：固定币别与原币申请可同单]** 固定币别申请要求申请币别=结算币别；原币申请只能挂 `originalCurrencyId`=结算币别的行。

> [!IMPORTANT] **[卡点 4：详情回填勿清空银行]** 加载详情时用 `isHydrating` 跳过结算对象/币别 watch 副作用，先加载银行选项再写回选中值。详见 `changelogs/change-log-2026-09-09-payment-settlement-form-refactor.md`。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-09-09 | `Refactor` | 编辑页结构整理：回填守护、去重复错误提示与死代码；保存校验至少一行明细。 | 拆 `use-form-state` / `use-bank-options` / `use-load-detail` / `use-form-effects` / `use-submit`。详见 `changelogs/change-log-2026-09-09-payment-settlement-form-refactor.md`。 |
| 2026-09-09 | `Fix` | 付费申请附件下载改为 blob + `friendlyFileName`。 | 详见 `changelogs/change-log-2026-09-09-attachment-preview-download-unify.md`。 |
| 2026-09-08 | `Refactor` | 对接按原币+付费申请一套接口；选择列表检索失败自动重试 1 次。 | 抽屉修正 `settlementCurrencyId`/`currencyId` 传参；`existingRowKeys` 禁用已选组合。详见 `doc/付费结算/付费结算-按原币和付费申请-接口文档.md`。 |
| 2026-09-08 | `Fix` | 「选择付费申请」最晚付款时间按自然日闭区间；提交时间仍带时分。 | 提交时间控件有 `showTime`。 |
| 2026-08-09 | `Refactor` | 费用明细「费用名称」「币别」改读嵌套对象。 | `OrderFeeDto` / `OrderFeeForSelectionDto` 对象化。 |
| 2026-07-25 | `Refactor` | 结算对象改读对象化后的 `settlement`。 | 删除 `settlementName` 标量字段。 |
