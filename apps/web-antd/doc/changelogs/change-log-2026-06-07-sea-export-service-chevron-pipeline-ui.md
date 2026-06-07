# 变更日志：海运出口服务项目 Chevron 流水线 UI

> 日期：2026-06-07  
> 范围：`apps/web-antd/src/views/sea-export-admin/form.vue`

---

## 背景意图

将海运出口表单「服务项目」区域从圆点勾选流水线，替换为参考物流工作进度页的 Chevron 箭头步骤条样式，提升视觉层次与状态辨识度，同时保留原有勾选、任务状态与「完成服务」交互。

## 核心逻辑变更

- 容器改为 `service-chevron-flow`：`flex` + `overflow-hidden` + `rounded-xl`，节点等宽铺满。
- 每个节点使用 `clip-path` 实现箭头衔接（`chevron-step`），首尾节点圆角处理。
- 三态配色对齐参考稿：
  - `pending`（未勾选）：灰底 `#f2f2f2` + `mdi:schedule`
  - `active`（已勾选待处理）：蓝底 `#d1e9ff` + 旋转 `mdi:progress-clock`
  - `done`（已处理）：绿底 `#a8e6cf` + `mdi:check-circle`
- 悬浮提示改用 Ant Design `Tooltip`（避免 `overflow-hidden` 裁切），展示状态文案与「完成服务」按钮。
- 点击节点仍走 `handleServiceTypeNodeToggle`，业务逻辑未变。

## 避坑指南

- Chevron 容器必须 `overflow-hidden` 才能形成圆角外框，自定义 CSS tooltip 会被裁切，应使用 Portal 类组件（如 `Tooltip`）。
- `Tooltip` 默认包裹 `span` 会破坏 flex 等分，需对 `.service-chevron-flow > span` 补 `display:flex; flex:1`。
