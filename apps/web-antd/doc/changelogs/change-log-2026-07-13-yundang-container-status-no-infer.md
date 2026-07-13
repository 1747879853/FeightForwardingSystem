---
title: 集装箱轨迹状态不再前端推断，改按后端字段展示
date: 2026-07-13
type: Fix
scope: apps/web-antd
module: 海运出口 / 运踪
---

# 背景意图

集装箱时间轴此前将 `statuses` 数组末项标为「进行中」、其余标为「已完成」，状态胶囊文案由前端推断，与后端实际状态描述不一致。

# 核心逻辑变更

1. **状态文案**：节点标题仅展示后端 `statusDesc` / `statusDescEn`；不再渲染前端推断的「进行中」「已完成」胶囊。
2. **预计标识**：仅当后端 `isEstimate === true` 时展示「预计」胶囊（与 OpenAPI 字段语义一致）。
3. **当前高亮**：集装箱轨迹不再做蓝色「当前」高亮；仅 `isEstimate === true` 时展示橙色「预计」样式。

# 避坑指南

- `YundangShipmentContainerStatusInfoDto` 无 `isCurrent` 字段，勿仿照里程碑用下标或时间推断当前态。
- 当前状态以集装箱级 `currentStatusCd` / `currentStatus` 为准；轨迹节点仅作历史事件展示。
