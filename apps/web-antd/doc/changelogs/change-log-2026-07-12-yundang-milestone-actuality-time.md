---
title: 运踪里程碑仅按实际时间排序并移除「未到」状态
date: 2026-07-12
type: Fix
scope: apps/web-antd
module: 海运出口 / 运踪
---

# 背景意图

里程碑节点缺少 `actualityTime` 时，原先会展示「未到」状态，容易误解为「尚未到达」；实际上该节点可能根本不适用本票服务。同时排序曾混用预计/计划时间，与业务期望不符。

# 核心逻辑变更

1. **`yundang-tracking-panel.vue` 排序**：里程碑 `oceanNodes` 仅按 `actualityTime` 升序；无实际时间的节点排在末尾，彼此保持后端相对顺序。
2. **状态展示**：移除 `pending/未到` 兜底；无 `actualityTime`、`estimateTime`、`planTime` 且非当前节点时，仅展示节点名称（中性圆点），不显示状态胶囊与时间行。
3. **保留逻辑**：有 `actualityTime` → 已完成；`isCurrent` → 进行中；有 `estimateTime` → 预计；有 `planTime` → 计划中。

# 避坑指南

- 不要用「无实际时间 = 未到」推断业务状态；无时间字段的节点可能是非适用服务点。
- 排序只认 `actualityTime`，不要用 `estimateTime` / `planTime` 参与里程碑顺序。
