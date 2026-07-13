---
title: 运踪里程碑取消前端排序，保持后端返回顺序
date: 2026-07-13
type: Fix
scope: apps/web-antd
module: 海运出口 / 运踪
---

# 背景意图

里程碑 `oceanNodes` 此前在前端按 `actualityTime` 升序重排，与后端已编排好的业务顺序不一致；需完全信任接口返回的节点顺序展示。

# 核心逻辑变更

1. **`yundang-tracking-panel.vue`**：`oceanNodes` 直接使用 `shipment.oceanNodes`，移除按 `actualityTime` 的 `.sort()`。
2. **不变**：节点状态样式（进行中/已完成/预计/计划中）与展示时间逻辑保持原样；集装箱轨迹仍按 `eventTime` 升序（本次未改）。

# 避坑指南

- 里程碑顺序由后端 `GetOceanPushInfoAsync` 保证；前端勿再对 `oceanNodes` 做时间排序。
- 若顺序异常，应排查后端推送/落库顺序，而非在前端补排序。
