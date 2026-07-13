---
title: 海运出口编辑页新增「运踪」Tab + 运踪详情去除航段 Tab
date: 2026-07-11
type: Feature
scope: apps/web-antd
module: 海运出口 / 运踪
---

# 背景意图

1. 运踪详情弹窗中「航段」Tab 展示的船名/航次/POL/POD 与顶部基础信息（Descriptions）重复，信息冗余，予以删除。
2. 编辑页此前只能通过「查看运踪」按钮弹窗查看运踪，希望在编辑工作台内以 Tab 形式直接查看运踪信息，减少弹窗跳转。

# 核心逻辑变更

1. **抽取运踪展示面板 `modules/yundang-tracking-panel.vue`**：
   - 将原 `yundang-tracking-modal.vue` 的运踪展示逻辑（四态渲染、`GetOceanPushInfoAsync` 拉取、`waiting_push` 轮询、里程碑/集装箱时间轴、苹果风样式）整体抽出为可复用面板组件。
   - 面板由 `seaExportId` prop 驱动，`watch(immediate)` 拉取推送详情，`onBeforeUnmount` 停止轮询。
   - 新增 `resolveStateFromSubscription` prop：无订阅状态字段场景（编辑页 Tab）下，从 `pushInfo.subscription` 推导四态与状态文案；弹窗场景仍沿用传入的 `isYundangSubscribed / isYundangSubscribeSuccess`。
2. **删除航段 Tab（任务 1）**：面板中移除 `carriages` TabPane 及其 `Table`、列定义、`carriageRows` 等逻辑；`Tabs` 仅保留「里程碑」「集装箱」。
3. **`yundang-tracking-modal.vue` 瘦身**：只保留弹窗标题与 payload 装配，内部渲染 `<YundangTrackingPanel>`，`list.vue` / `form.vue` 的「查看运踪」调用方式不变。
4. **编辑页新增「运踪」Tab（任务 2）**：`editor.vue` 的 `TabKey` / `VALID_TAB_KEYS` / `tabs` 新增 `tracking`（标签复用 `seaExport.yundang.viewTracking`「查看运踪」），激活时渲染 `<YundangTrackingPanel :sea-export-id="editId" resolve-state-from-subscription />`。

# 避坑指南

- **状态四态双通道**：弹窗依赖列表/详情行的订阅布尔字段；编辑页 Tab 无这些字段，须显式传 `resolve-state-from-subscription`，否则会误判为「未订阅」。
- **航段信息已被基础信息覆盖**：删除航段 Tab 后，船名/航次/POL/POD 仅在顶部 Descriptions 展示，勿再恢复该 Tab。
- **轮询与卸载**：面板在 `waiting_push` 态每 30s 轮询、最多 20 次；Tab 切走会卸载面板并停止轮询，切回重新拉取，无需 KeepAlive。
- 复用面板时其余运踪相关 i18n key 未变动。
