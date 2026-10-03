---
title: SeaExportSimpleDto港口与船公司对象化
module: 海运出口（SeaExportSimpleDto）
author: auto-doc-sync
last_updated: 2026-07-24
---

# 1. 背景意图 (Background)

`SeaExportSimpleDto` 原先用扁平字段返回港口/船公司（`polId`/`polName`、`podId`/`podName`、`carrierId`/`carrierName`），与项目其它简易关联（`PortCodeSimpleDto`、`CarrierSimpleDto`）不一致。现改为对象字段，便于前端统一展示与扩展。

# 2. 核心逻辑变更 (Core Changes)

| 字段 | 变更前 | 变更后 |
| :-- | :-- | :-- |
| 起运港 | `polId` + `polName` | `pol`：`PortCodeSimpleDto`（字段见《港口模块总逻辑文档》4.1） |
| 目的港 | `podId` + `podName` | `pod`：`PortCodeSimpleDto` |
| 船公司 | `carrierId` + `carrierName` | `carrier`：`CarrierSimpleDto`（`id`/`cnName`/`cnShortName`/`enName`/`code`英文简称/`ediCode`） |

未改：`id`、`vessel`、`innerVoyno`。

**受影响组装点**（均改为查完整简易 DTO 再挂载）：

- `InvoiceApplicationAdminAppService.GetOrderFeeGroupAsync` / `DetailAsync`
- `InvoiceIssueAdminAppService.GetSubmittedApplicationListAsync`
- `OrderFeeAdminAppService.GetPagedListAsync`（`IsPrint==true`）

# 3. 避坑指南 (Pitfalls)

- 前端勿再读 `polId`/`polName`/`carrierId`/`carrierName`，改为 `pol?.cnName`、`carrier?.cnName` 等。
- 船公司可用 `cnName`（全称）或 `cnShortName`（简称）；EDI 用 `ediCode`；`code` 为英文简称。
- 无港口/船公司时对应对象为 `null`。

# 4. 变更日志 (Changelog)

| 日期 | 变更类型 | 📝 业务功能变动 | 🤖 代码解析与架构洞察 |
| :-- | :-- | :-- | :-- |
| 2026-07-24 | `Refactor` | `SeaExportSimpleDto` 的 POL/POD/Carrier 改为简易对象 | 复用 `PortCodeSimpleDto`/`CarrierSimpleDto`；四处组装批量字典改为对象字典 |
| 2026-07-24 | `Enhancement` | `CarrierSimpleDto` 增补 `cnShortName`、`ediCode`；`code` 明确为英文简称 | 与 `SeaExportDto.carrier` 字段对齐；开票/发票开出/打印等组装点同步赋值 |
