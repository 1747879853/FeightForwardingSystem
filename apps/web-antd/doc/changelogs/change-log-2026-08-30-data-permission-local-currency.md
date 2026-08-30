---
title: 数据权限返回体统一新增本位币（localCurrencyId / localCurrencyCode）
module: 通用 / 报表 / 费用录入
author: auto-doc-sync
last_updated: 2026-08-30
---

# 背景意图

后端把本位币收敛到了数据权限基类 `DataPermissionFullAuditedEntityDto` 上：所有带数据权限的单据返回体统一新增 `localCurrencyId` / `localCurrencyCode`，取值口径是**单据所属公司**（组织串里最后一个 `isCompany` 节点）配置的本位币；`orgs` 元素同步新增 `isCompany`。

关键点是取值口径变了：以前后端和前端都按「组织串上第一个有本位币的节点」找，集团节点历史上配过本位币的租户会取到集团的，而不是分公司的。本次前端跟着改成直接读单据字段，不再自己遍历 `orgs`。

# 核心逻辑变更

## 1. API 类型层

给以下模块的返回体 DTO 补上 `localCurrencyId` / `localCurrencyCode`（付费申请、付费结算、收费结算、海运出口 / 进口、空运出口、客户对账、开票申请、发票开出、提成单、预配单、银行流水、自动费用模板、发票备注模板、利润 / 欠费报表），包括嵌套在明细里的 `transportOrder` 简易对象。

顺带把各处 `OrganizationUnitSimpleDto` 的 `localCurrencyId` / `localCurrencyCode` 统一成可空，并补注释说明「这是**节点自身**的本位币，单据本位币请读单据字段」。

## 2. 客户对账（破坏性变更）

`StatementDto` 删掉了 `localCurrency` 对象，改用 `localCurrencyCode`。前端没有页面读过 `localCurrency.code`，所以只是类型跟随；`localCurrencyReceiveAmount` / `localCurrencyPayAmount` 未变。

## 3. 本位币判定改为直接读单据字段

`views/_shared/order-fee/` 下的费用录入联动（`useOrderFeeLinkage.checkIfIsLocalCurrency`）与费用编辑弹窗的汇率联动，原来都在 `orgs` 里找公司节点，现在统一读 `orderDetail.localCurrencyId`。

预配单编辑页（`views/pre-order/editor.vue`）没有单据可读（新建态、用户临时切换归属组织），原来直接调 `getOrganizationUnit(orgId).localCurrencyId`——归属组织若是**部门**就取不到值。新增 `resolveOrganizationLocalCurrency()`（`api/system/organization-unit.ts`）沿组织串向上找最近的 `isCompany` 节点，与后端口径对齐。

## 4. 报表

利润 / 欠费报表的合计列标题原来写死 `(CNY)`。现在：

- `totalHotColumns` 首位加「本位币」列（`localCurrencyColumn()`），行级展示 `localCurrencyCode`；
- 合计列标题去掉写死的币种；
- 分组行与合计行遇到多种本位币时显示「多币别」、把 `total*` 置为 `-`（利润率置 `null`），不做跨币别加总。币别明细列（`${code}_${field}`）按原币分列，不受影响。

## 5. 顺带清理

后端已停用 `PaymentSettlementAdmin/DetailAsync`，前端 `getPaymentSettlementDetail` 与 `PaymentSettlementDetailDto` / `PaymentSettlementItemDetailDto` / `PaymentApplicationForDetailDto` / `CurrencyGroupForDetailDto` 全部无人引用，一并删除。付费结算详情只走 `DetailByCurrencyAsync`。

# 避坑指南

> [!IMPORTANT] **不要写 `orgs.find(o => o.localCurrencyId)`。** `orgs` 从最高级组织排到本组织，集团节点也可能配过本位币，这么找会取到集团的。直接读单据上的 `localCurrencyId` / `localCurrencyCode`。

- **继承了基类不等于有值。** 提成配置（数据权限停用）、非管理端银行流水列表、`BankStatementAdmin/GetReceiveSettlementPagedListAsync` 结构上有这两个字段但恒为 null。
- **待我审核的付费申请（`PayAppTaskListAsync`）压根没有这两个字段**，它的 `PayAppTaskItemDto` 是平铺结构不继承基类；`orgs` 末级也未必是公司节点，别拿它推本位币。
- **报表合计列不是人民币。** 一次查询会跨多个公司，不同行本位币可能不同，展示时必须配「本位币」列，也不要跨行加总。
- **费用行上的 `orderFee.localCurrencyId` / `orderFee.localCurrency`（对象）是另一对字段**，不在本次基类改动范围内，类型未变；但后端填充口径同样改成了「所属公司」，集团配过本位币的租户取值会变。
