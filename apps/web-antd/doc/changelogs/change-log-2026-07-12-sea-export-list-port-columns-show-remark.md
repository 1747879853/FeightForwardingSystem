---
title: 海运出口列表港口列改显备注、排序仍用港口字段
module: 海运出口
author: auto-doc-sync
last_updated: 2026-07-12
---

# 海运出口列表港口列改显备注、排序仍用港口字段

## 背景意图

海运出口列表的六段货物流转节点列（收货地、起运港、中转港1、中转港2、目的港、交货地）此前直接展示各自的港口名称 `*Name`。业务实际更关注这些节点的「备注」内容（如具体地址、约定说明等），因此要求列表单元格改为展示对应的备注字段；但列头排序仍需按港口字段（港口名）进行，保持排序语义不变。

## 核心逻辑变更

### `data.ts`：`useColumns` 为六段港口列补 `formatter`

保持列 `field` 不变（仍为 `*Name`），仅新增 `formatter` 改变单元格展示内容为对应备注字段：

| 列（业务名） | 列 `field`（排序键） | 展示内容（formatter 返回） |
| :----------- | :------------------- | :------------------------- |
| 收货地       | `receivePortName`    | `row.receivePortRemark`    |
| 起运港       | `polName`            | `row.polRemark`            |
| 中转港1      | `poT1Name`           | `row.poT1Remark`           |
| 中转港2      | `poT2Name`           | `row.poT2Remark`           |
| 目的港       | `podName`            | `row.podRemark`            |
| 交货地       | `deliverPortName`    | `row.deliverPortRemark`    |

`formatter` 统一使用 `({ row }) => row.xxxRemark ?? ''` 兜底空值。

排序未受影响：列头排序仍由 `list.vue` 中 `createPagedListQuery` 的 `fieldMap` 决定（列 `field` `*Name` → 实体导航路径 `{POL/POD/ReceivePort/POT1/POT2/DeliverPort}.PortName`），因此点击列头排序依旧作用于各自港口字段。

## 避坑指南

1. **显示与排序解耦靠 `formatter` + `field` 分离**：`field` 决定排序键（经 `fieldMap` 映射到实体路径），`formatter` 只改单元格显示。切勿为了改显示而修改 `field`，否则会破坏 `fieldMap` 的排序映射。
2. **备注字段均在 `SeaExportDto` 根级**：`receivePortRemark/polRemark/poT1Remark/poT2Remark/podRemark/deliverPortRemark` 与 `*Name` 同级，无需跨 `transportOrder` 层取值。
3. **空备注展示为空字符串**：`?? ''` 兜底，避免展示 `undefined`。港口有值但备注为空时，单元格会显示为空——这是预期行为（业务要求以备注为准）。
