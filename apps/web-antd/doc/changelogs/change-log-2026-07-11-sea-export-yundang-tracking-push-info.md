---
title: 海运出口运踪状态列与运踪详情弹窗（GetOceanPushInfoAsync）
date: 2026-07-11
type: Feature
scope: apps/web-antd
module: 海运出口 / 运踪订阅
---

# 背景意图

对接 `YundangAdmin/GetOceanPushInfoAsync`：列表展示每票最新运踪状态并可点击查看详情；编辑页顶栏增加「查看运踪」入口。与既有「运踪订阅」列/按钮分工：订阅控制写入，本接口只读聚合订阅记录与运单动态。

# 核心逻辑变更

1. **API**：`api/yundang/yundang-admin.ts` 补充 `YundangOceanPushInfoDto` 及子表类型，`getOceanPushInfo(seaExportId)` GET 查询。
2. **共享逻辑**：`use-yundang-ocean-track.ts` 提供四态 `resolveYundangViewState`、列表文案 `getYundangTrackStatusLabel`、弹窗 `useYundangOceanTrack`。
3. **弹窗**：`modules/yundang-tracking-modal.vue` 展示订阅概要、运单航程、里程碑时间轴、航段表、集装箱 Tab + 箱轨迹；`waiting_push` 态 30s 轮询最多 20 次。
4. **列表**：`data.ts` 新增「运踪状态」列；有 `Admin.ExternalApi.Get` 权限时 Tag 可点击打开弹窗；`SeaExportDto` 预留可选 `yundangTrackStatus`（后端列表填充时优先展示）。
5. **编辑页**：`form.vue` 顶栏新增「查看运踪」按钮（`Admin.ExternalApi.Get`）。
6. **i18n**：`seaExport.yundang` 扩展 `trackStatusColumn`、`viewTracking`、`trackStatus.*`、`tracking.*`（zh-CN / en-US）。

# 避坑指南

- 列表「运踪订阅」与「运踪状态」为两列：前者看订阅结果，后者看动态/等待态；勿合并。
- 订阅成功 ≠ 立即有 `shipment`：`waiting_push` 为正常态，弹窗内轮询而非当接口异常。
- 查询动态权限为 `Admin.ExternalApi.Get`，与订阅 `Admin.ExternalApi.Use` 不同。
- 列表未返回 `yundangTrackStatus` 时，成功订阅票默认展示「等待推送」，点开弹窗后可见完整动态。
