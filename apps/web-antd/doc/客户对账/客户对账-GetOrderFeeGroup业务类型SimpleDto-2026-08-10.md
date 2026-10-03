---
title: GetOrderFeeGroupAsync 业务类型简要赋值
module: 客户对账（StatementAdmin）
author: auto-doc-sync
last_updated: 2026-08-10
---

# 背景意图

选未对账费用接口 `GetOrderFeeGroupAsync` 返回的 `TransportOrderDto` 原先不填充业务类型子表（海运出口/海运进口/空运出口），前端无法在分组业务行展示船名航次、港口、船公司等简要信息。与开票申请等费用分组接口对齐，改为按业务类型赋值对应 SimpleDto。

# 核心逻辑变更

1. `TransportOrderDto.SeaExport` / `SeaImport` / `AirExport` 类型由全量详情 Dto 改为 `SeaExportSimpleDto` / `SeaImportSimpleDto` / `AirExportSimpleDto`。
2. `TransportOrderSimpleDto` 同步补充 `SeaImport`、`AirExport` 简要字段（原仅有 `SeaExport`）。
3. `StatementAdminAppService.GetOrderFeeGroupAsync`：对本页业务 Id 批量查询三类子表，组装港口/船公司/空港 SimpleDto 后按 `BizType` 赋值，非当前类型字段为 `null`。
4. `TransportOrderDto` / `TransportOrderSimpleDto` / `TransportOrderSimplePrintDto` 使用类上 `[AutoMapFrom]`；`SeaExport`/`SeaImport`/`AirExport` 由接口代码手动赋 SimpleDto。
5. `TransportOrderAdminAppService.DetailAsync`、`PreOrderAdminAppService.TransportOrderDetailAsync` 同步改为赋值 SimpleDto（完整详情仍走各业务模块自身 Detail 接口）。

# 避坑指南

- 需要海出/海进/空出**全量详情**时，请分别调用 `SeaExportAdmin` / `SeaImportAdmin` / `AirExportAdmin` 的 `DetailAsync`，不要依赖 `TransportOrderDto` 嵌套字段。
- 前端按 `bizType` 读取对应字段：`0`→`seaExport`，`1`→`seaImport`，空运出口→`airExport`。
