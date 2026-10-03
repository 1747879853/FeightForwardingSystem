---
title: 发票开出-已提交列表SeaExport归属修正
module: 发票开出（InvoiceIssueAdminAppService）
author: auto-doc-sync
last_updated: 2026-07-24
---

# 1. 背景意图 (Background)

`GetSubmittedApplicationListAsync` 编译/运行报错：代码将海运出口写到 `OrderFeeDto.SeaExport`，但 `OrderFeeDto` **没有** `SeaExport` 字段。海运出口应挂在已有的 `TransportOrderSimpleDto.SeaExport` 上。

# 2. 核心逻辑变更 (Core Changes)

| 项 | 变更前 | 变更后 |
| :-- | :-- | :-- |
| 海运出口赋值位置 | `feeDto.SeaExport = ...` | `toDto.SeaExport = ...`（仅当 `TransportOrder` 非空时） |
| 前端取数路径 | `orderFee.seaExport` | `orderFee.transportOrder.seaExport` |
| DTO | 误以为 `OrderFeeDto` 有 `SeaExport` | 复用 `TransportOrderSimpleDto.SeaExport`，不再给 `OrderFeeDto` 加字段 |

接口、权限、过滤、金额匹配逻辑不变。

**赋值时机**：在构建 `TransportOrderSimpleDto` 时一并填充 `SeaExport`（`SeaExport.Id == TransportOrderId`），再赋给 `feeDto.TransportOrder`。

# 3. 避坑指南 (Pitfalls)

- 前端若仍读 `orderFee.seaExport` 会得到 `undefined`，须改为 `orderFee.transportOrder?.seaExport`。
- 无运输订单时不返回海运出口（与运输订单同生同灭）。
- 勿再往 `OrderFeeDto` 加 `SeaExport`，与运输订单简易 DTO 已有字段重复。

# 4. 变更日志 (Changelog)

| 日期 | 变更类型 | 📝 业务功能变动 | 🤖 代码解析与架构洞察 |
| :-- | :-- | :-- | :-- |
| 2026-07-24 | `Fix` | `GetSubmittedApplicationListAsync` 海运出口改为返回在 `transportOrder.seaExport` | 删除对不存在的 `OrderFeeDto.SeaExport` 赋值；与 `TransportOrderSimpleDto` 字段定义对齐 |
