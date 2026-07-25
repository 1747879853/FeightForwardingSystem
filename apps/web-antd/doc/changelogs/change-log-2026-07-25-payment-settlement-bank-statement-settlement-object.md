---
title: 付费结算与银行流水结算对象对象化前端对接
module: 付费结算 / 银行流水 / 收费核销
author: auto-doc-sync
last_updated: 2026-07-25
---

# 1. 背景意图 (Background)

后端对付费结算、银行流水做破坏性变更：详情与列表**删除字符串 `settlementName`**，改为返回 `settlement` 对象（`ClientSimpleDtoForOrder`：`id` / `name` / `fullName` / `address`），与海运出口、付费申请的往来单位对象化口径一致。前端需同步类型与全部消费点，否则付款方 / 结算对象列与详情会读到 `undefined`。

# 2. 核心逻辑变更 (Core Changes)

| 范围 | 变更前 | 变更后 |
| :-- | :-- | :-- |
| 付费结算详情/列表 | `settlementName: string` | `settlement?.name`（`PaymentApplicationAdminApi.ClientSimpleDtoForOrder`） |
| 付费结算详情分组 | `paymentApplications[]` 无结算对象 | 分组内新增 `settlement`，构造 `mockApplication.clientName` 时优先取分组值 |
| 银行流水详情/列表 | `settlementName?: string` | `settlement?.name`（新增 `BankStatementAdminApi.ClientSimpleDtoForOrder`） |
| 列表列 `field` / `dataIndex` | `settlementName` | **保留旧键**，展示改走 `formatter` / `customRender` |
| 编辑页结算对象回显 | 依赖 ClientSelect 内部兜底 | 用详情 `settlement` 构造 `selected-items` |

**主要改动文件：**

- 类型：`api/sea-export/payment-settlement-admin.ts`、`api/settlement-management/bank-statement-admin.ts`
- 付费结算：`views/settlement-management/payment-settlement/{data.ts,form.vue}`
- 银行流水：`views/bank-statement/{data.ts,form.vue}`
- 收费核销：`views/settlement-management/receive-settlement/{form.vue,invoice-form.vue,bank-statement-picker/index.vue}`

# 3. 避坑指南 (Pitfalls)

1. **破坏性**：`settlementName` 已从两个模块的详情/列表响应中移除，继续读会得到 `undefined`。
2. **费用维度的 `orderFee.settlementName` 未改**：收费核销明细列、添加费用抽屉、付费申请费用行仍是字符串，勿一并替换。
3. **列 `field` 故意保留 `settlementName`**：涉及列宽/顺序持久化与后端排序字段映射（`camelToPascal` → `SettlementName`），改名会同时失效。
4. **对象可能为 `null`**：展示一律 `settlement?.name || '-'`。
5. **`address` 依赖客户默认地址**：无默认地址时为 `null`，打印/展示需兜底。
6. 付费结算编辑页监听 `settlementId` 会拉客户详情补名称，命中 `selected-items` 缓存时直接复用，避免详情加载时的重复请求。

# 4. 变更日志 (Changelog)

| 日期 | 变更类型 | 📝 业务功能变动 | 🤖 代码解析与架构洞察 |
| :-- | :-- | :-- | :-- |
| 2026-07-25 | `Refactor` | 付费结算、银行流水的结算对象/付款方改读 `settlement` 对象；两处编辑页结算对象下拉补充编辑回显 | 列 `field` 保留旧键 + `formatter` 取值；`ClientSimpleDtoForOrder` 在 `bank-statement-admin` 内本地声明，付费结算复用 `PaymentApplicationAdminApi` 的同名类型 |
