# 变更日志：海运出口服务项目 Chevron 节点尺寸紧凑化

> 日期：2026-06-07  
> 范围：`apps/web-antd/src/views/sea-export-admin/form.vue`

---

## 背景意图

服务项目 Chevron 流水线节点（64px 高、16px 字号、220px 最大宽度）相对表单容器偏大，视觉上占用过多垂直空间且多节点时易溢出。需对齐工作台业务列表同类 Chevron 组件的紧凑规格，使节点等分适配容器宽度。

## 核心逻辑变更

- 节点高度 `64px → 40px`，箭头 clip-path 切角 `20px → 12px`，圆角 `16px → 8px`。
- 标签字号 `16px → 12px`，图标 `20px → 14px`，内间距与重叠 margin 同步缩小。
- 移除单节点 `max-width: 220px`，改为 `max-width: 140px`（对齐工作台）；保留 `flex: 1` 等分与 `min-width: 72px` 横向滚动兜底。
- 空态/占位区域最小高度 `64px → 40px`，与流水线高度一致。

## 避坑指南

- 缩小 clip-path 切角时需同步调整 `padding-left/right` 与 `margin-left`，否则箭头衔接处会出现文字被裁切。
- 去掉 220px 上限后节点数较多时会触发 `overflow: auto hidden` 横向滚动，属预期行为；单节点宽度以 140px 为上限。
