# 2026-07-13 运踪面板新增「查看轨迹地图」入口（复用全局弹窗）

## 背景意图

在 2026-07-13 已落地的「全局货物轨迹弹窗」（iframe 内嵌 trackingeyes）基础上，业务需要在运踪信息（海运出口编辑页运踪 Tab）与运踪详情弹窗中，直接一键查看该票货的轨迹地图。两处均复用 `YundangTrackingPanel`，故入口只需加在该共享面板即可同时生效。

## 核心逻辑变更

- **`yundang-tracking-panel.vue`**：
  - 新增可选 prop `mblNo`（订阅号/提单号），供调用方显式传入。
  - 新增派生逻辑 `mapReferenceNo`：优先取 `props.mblNo`，否则从推送详情派生 `subscription.referenceNo → shipment.blNo → shipment.referenceNo → shipment.bkgNo`。因面板始终会拉取 `getOceanPushInfo`，无需上游额外传参也能拿到订阅号。
  - 头部操作区在「刷新」左侧新增「查看轨迹地图」按钮（`ph:map-trifold` 图标）：有订阅号时点击调用 `useTrackingMap().open({ mblNo })`；无订阅号时置灰并 `Tooltip` 提示。
- **i18n**（`seaExport.json` zh-CN/en-US）：`seaExport.yundang.tracking` 下新增 `viewMap`、`viewMapEmpty`。

## 覆盖入口

- 运踪信息：海运出口编辑页「运踪」Tab（`editor.vue` → `YundangTrackingPanel resolve-state-from-subscription`）。
- 运踪详情弹窗：海运出口列表点击运踪状态列打开的 `yundang-tracking-modal.vue`。

## 避坑指南

- **订阅号以实际订阅记录为准**：优先用 `subscription.referenceNo`（真正订阅到 trackingeyes 的号），比订单 `mblNum` 更贴合地图查询，避免号不一致查不到轨迹。
- **加载前禁用**：`pushInfo` 未加载完成时 `mapReferenceNo` 为空，按钮置灰属预期；数据回来后自动可用。
- **企业编号/地址仍在 env**：本次仅新增入口，地图地址与企业编号继续由全局弹窗读 `VITE_GLOB_TRACKING_*`，组件层不出现原始 URL 与 100514。
