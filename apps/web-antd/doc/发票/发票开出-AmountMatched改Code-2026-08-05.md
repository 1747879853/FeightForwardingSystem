---
title: 发票开出开票申请列表AmountMatched改为Code
module: 应收/开票管理
author: auto-doc-sync
last_updated: 2026-08-05
---

# 1. 背景意图 (Background)

**白话解释：**
已提交开票申请列表（及发票开出详情里的关联申请）原先只返回布尔值 `amountMatched`，前端只能知道「对不上」，还要自己数商品明细条数才能决定「调修正接口」还是「引导驳回」。`AddAsync` / `AddApplicationsAsync` 已经用 `code`（0/1/2）把这件事说清楚了，列表侧继续用 bool 会造成两套语义。

# 2. 核心逻辑变更 (Core Changes)

- `InvoiceIssueApplicationDto` 删除 `AmountMatched`，新增 `Code`（int）。
- 赋值在 `BuildInvoiceIssueApplicationDtosAsync`（`GetSubmittedApplicationListAsync` 与 `DetailAsync.invoiceIssueApplications` 共用）：
  - `totalGoodsAmount == appliedAmountRmb` → `code=0`
  - 对不上且商品明细恰好 1 条 → `code=1`
  - 对不上且商品明细条数 ≠ 1，或无有效发票汇率 → `code=2`
- 折算改为 `ToFinancialRound`，与 `CheckApplicationsExchangeRateAsync` / `SubmitAsync` 口径一致。

# 3. 避坑指南 (Pitfalls)

> [!IMPORTANT]
> **前端破坏性变更。** 原来读 `amountMatched` 的地方必须改读 `code`：`code === 0` 等价于旧的 `amountMatched === true`；`code !== 0` 等价于旧的 `amountMatched === false`。需要区分可修正/只能驳回时直接用 `code`，不要再自己数 `invoiceApplicationGoodsDtls.length`。

# 4. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 业务功能变动 | 代码解析与架构洞察 |
| :--- | :--- | :--- | :--- |
| 2026-08-05 | `Breaking` | 列表/详情开票申请输出 `amountMatched` → `code` | 与 `InvoiceIssueExchangeRateCheckDto.Code` 语义对齐；无有效汇率走 `code=2`（无法自动修正） |
