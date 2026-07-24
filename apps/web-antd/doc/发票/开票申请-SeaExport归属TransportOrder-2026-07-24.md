---
title: 开票申请-SeaExport归属TransportOrder
module: 开票申请（InvoiceApplicationAdminAppService）
author: auto-doc-sync
last_updated: 2026-07-24
---

# 1. 背景意图 (Background)

与发票开出已提交列表对齐：海运出口应挂在 `TransportOrderSimpleDto.SeaExport`，不应作为费用分组 DTO 的兄弟字段。`GetOrderFeeGroupAsync` 与 `DetailAsync` 的 `FeeGroups` 原先把 `SeaExport` 放在分组根上（详情侧甚至给没有该属性的 `InvoiceApplicationFeeGroupDto` 赋值，会编译失败）。

# 2. 核心逻辑变更 (Core Changes)

| 接口 | 变更前 | 变更后 |
| :-- | :-- | :-- |
| `GetOrderFeeGroupAsync` | `items[].seaExport` | `items[].transportOrder.seaExport` |
| `DetailAsync` | `feeGroups[].seaExport` | `feeGroups[].transportOrder.seaExport` |
| `InvoiceApplicationFeeGroupOutputDto` | 含独立 `SeaExport` | **移除**该属性，仅保留 `TransportOrder` + `OrderFees` |

赋值：构建 `TransportOrderSimpleDto` 时按 `SeaExport.Id == TransportOrderId` 填充 `toDto.SeaExport`。

# 3. 避坑指南 (Pitfalls)

- 前端取数改为 `transportOrder?.seaExport`，勿再读分组根上的 `seaExport`。
- 详情 `InvoiceApplicationFeeGroupDto` 本来就没有 `SeaExport`，勿再加回根字段。
- 与发票开出 `GetSubmittedApplicationListAsync` 路径一致：`transportOrder.seaExport`。

# 4. 变更日志 (Changelog)

| 日期 | 变更类型 | 📝 业务功能变动 | 🤖 代码解析与架构洞察 |
| :-- | :-- | :-- | :-- |
| 2026-07-24 | `Fix` | 开票申请费用分组/详情的海运出口改为 `transportOrder.seaExport` | 删除 `InvoiceApplicationFeeGroupOutputDto.SeaExport`；`GetOrderFeeGroupAsync`/`DetailAsync` 赋值改挂 `toDto.SeaExport` |
