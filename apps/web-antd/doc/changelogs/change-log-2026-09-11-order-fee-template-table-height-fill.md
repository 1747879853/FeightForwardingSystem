# 自动费用模板明细表小屏高度裁切

## 背景意图

新建/编辑页费用明细 Handsontable 在小分辨率下滚到底仍看不到全部行（如 10 行只见约 5 行）；标题行也偏高，挤占明细可视高度。

## 核心逻辑变更

- `edit.vue`：去掉明细区 `clamp(280px, 100vh - 380px, …)` 估算高度；页面改为 `overflow-hidden` + `height:100%` flex 链，明细吃剩余空间并由表格 ResizeObserver 测真实可视高。
- 基础信息区加 `max-height` 自滚，避免表单把明细区挤没。
- `order-fee-template-table.vue`：动态高度初始 0、测量阈值对齐费用录入；KeepAlive 激活时重测。
- 小屏（`max-height:900px` / `max-width:1280px`）：标题行单行紧凑（藏副标题、缩 padding/图标），分区头 hint 隐藏，页边距收紧，把高度让给明细表。

## 避坑指南

- 勿再用 `100vh` 减固定偏移估明细高度：小屏上会大于 flex 剩余空间，父级 `overflow:hidden` 裁切底部，HOT 仍按偏大高度滚，滚到底也看不到末行。
- Handsontable 高度必须等于**可见**容器高，不能等于被祖先裁切后仍存在的布局高。
- 标题行勿用 `flex-wrap`：窄屏换行会再占一整行高度。
