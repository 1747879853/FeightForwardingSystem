---
title: 运踪里程碑与集装箱轨迹取消前端排序，保持后端返回顺序
date: 2026-07-13
type: Fix
scope: apps/web-antd
module: 海运出口 / 运踪
---

# 背景意图

里程碑 `oceanNodes` 与集装箱 `statuses` 此前在前端按时间字段重排，与后端已编排好的业务顺序不一致；需完全信任接口返回顺序展示。

# 核心逻辑变更

1. **里程碑**：`oceanNodes` 直接使用 `shipment.oceanNodes`，移除按 `actualityTime` 的 `.sort()`。
2. **集装箱轨迹**：`container.statuses` 直接渲染，移除 `sortContainerStatuses`（原按 `eventTime` 升序）；辅助函数重命名为 `getContainerStatusesWithVisual`。
3. **不变**：里程碑节点状态样式仍由 `isCurrent` / 时间字段驱动；集装箱轨迹仅 `isEstimate` 展示「预计」样式，不做当前高亮。

# 避坑指南

- 里程碑与集装箱轨迹顺序均由后端 `GetOceanPushInfoAsync` 保证；前端勿再对 `oceanNodes` / `statuses` 做时间排序。
- 若顺序异常，应排查后端推送/落库顺序，而非在前端补排序。
