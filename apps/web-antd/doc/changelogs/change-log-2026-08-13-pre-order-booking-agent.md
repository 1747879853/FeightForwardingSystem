# 2026-08-13 业务联系单主表新增订舱代理字段

## 背景意图

后端业务联系单（`PreOrder`）新增 `bookingAgentId`（订舱代理，往来单位，行业类别 `o`）。仅海运出口/空运出口有该字段；审核通过生成海运出口时写入 `SeaExport.BookingAgentId`。前端需在新建/编辑主表录入、详情回显，并让费用结算对象类别为订舱代理时能自动带出。

## 核心逻辑变更

1. **API 类型：** `PreOrderDto` / `PreOrderAddDto` 增加 `bookingAgentId`；详情另含 `bookingAgent`（`SimpleNamedDto`），列表仅有 id。
2. **主表表单：** `usePreOrderBasicSchema` 在船公司后增加 `ClientSelect`（`industryCategory: 'o'`），字段 CSS order 为第 6 位（首行末项），其后付费方式/港口/条款/备注顺延。
3. **回显与联动：** `bindBookingAgentLinkage` 注入 `selectedItems`，并同步 `currentBookingAgentId/Name` 供费用表使用；`buildSubmitPayload` 经 `basicValues` 自然带出，无需单独映射。
4. **费用结算对象：** `PreOrderFeeParties` 与 `applySettlementByLetter` 增加字母码 `o` → 订舱代理映射（对齐海运出口费用联动）。

## 避坑指南

- 订舱代理必须传 `industryCategory: 'o'`；`updateSchema` 时也要显式带上，避免合并冲掉过滤条件。
- 详情回显优先用 `bookingAgent.name` 写 `selectedItems`，勿只塞 Guid。
- 进口业务后端无此字段；本期业务联系单仅开放海运出口，表单始终展示即可。
- 审核通过后订舱代理由后端写入海出，前端内嵌海出编辑器读海出详情即可，不必在联系单侧再写一遍。
