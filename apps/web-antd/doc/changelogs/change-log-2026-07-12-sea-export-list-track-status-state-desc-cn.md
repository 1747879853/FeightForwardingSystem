---
title: 海运出口列表运踪状态改显当前节点 stateDescCN
date: 2026-07-12
type: Feature
scope: apps/web-antd
module: 海运出口 / 运踪
---

# 背景意图

列表「运踪状态」列原先展示 `yundangTrackStatus` 英文/聚合状态，与运踪详情里程碑中文节点描述不一致；后端列表 DTO 已补充当前海运节点 `yundangShipmentOceanNode`，需对齐展示 `stateDescCN`。

# 核心逻辑变更

1. **`SeaExportDto`**：新增 `yundangShipmentOceanNode`（类型复用 `YundangShipmentOceanNodeInfoDto`）。
2. **`use-yundang-ocean-track.ts`**：`getYundangTrackStatusLabel` 优先取 `row.yundangShipmentOceanNode.stateDescCN`；移除对 `yundangTrackStatus` 的展示依赖。
3. **四态推导**：列表行已有 `stateDescCN` 时视为 `has_shipment`，Tag 颜色为 `processing`。
4. **推送详情回退**：`resolveLatestStatusFromShipment` 同样优先当前节点 `stateDescCN`，再回退 `trackStatus`。

# 避坑指南

- 列表展示勿再读 `yundangTrackStatus`；无 `stateDescCN` 时仍按订阅状态回退（未订阅/订阅失败/等待推送）。
- 后端需在海运出口分页列表填充 `yundangShipmentOceanNode`（当前节点），否则成功订阅票会显示「等待推送」。
