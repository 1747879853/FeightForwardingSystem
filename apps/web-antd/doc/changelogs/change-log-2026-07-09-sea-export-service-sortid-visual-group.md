# 海运出口服务项目按 sortId 视觉分组

**修改时间：** 2026-07-09

## 背景意图

服务流水线已支持同 `sortId` 为同一优先级组并行推进，但顶栏 Chevron 与配置弹窗仍按扁平列表逐条渲染，相同 `sortId` 的服务在视觉上未形成明确分组，不利于识别同优先级服务块。

## 核心逻辑变更

1. 新增 `groupServiceTypeNodesBySortId`：将服务节点按 `sortId` 升序分组，组内再按 `serviceType` 排序。
2. 顶栏流水线改为遍历 `checkedServiceTypeNodeGroups`，同组节点包在 `service-chevron-flow__group` 内紧密排列，组与组之间留出间距；首尾 Chevron 圆角仍按全局首尾节点计算。
3. 「配置服务项目」弹窗改为按 `sortId` 分组展示，同组 Checkbox 置于浅色卡片容器中。

## 避坑指南

- 流水线状态推进逻辑（`getServicePipelineActiveSortId`）无需改动，仍按 `sortId` 组判断活跃优先级。
- 提交 `serviceTypes` 顺序继续沿用 `serviceTypeNodes` 的 `sortId` 排序，分组仅影响展示。
