# 运踪里程碑改用 actualityTime 判断已完成

## 背景意图

运踪信息时间线原先用 `isCurrent` 标「进行中」、有 `actualityTime` 标「已完成」。业务要求：只要有实际时间即视为已完成，不再依赖 `isCurrent`。

## 核心逻辑变更

- `yundang-tracking-panel.vue` 的 `getOceanNodeVisual` 移除对 `isCurrent` 的优先分支。
- 节点有 `actualityTime` → 已完成；否则按 `estimateTime` / `planTime` 显示预计或计划。
- 「进行中」状态胶囊不再由海运节点时间线产生。

## 避坑指南

- 列表「运踪状态」文案仍可能用 `isCurrent` 找当前节点（`use-yundang-ocean-track.ts`），与时间线视觉态判定分开，勿混为一谈。
