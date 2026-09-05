---
title: 付费申请审核三栏可拖动改大小
module: 审核审批
author: auto-doc-sync
last_updated: 2026-09-05
---

# 1. 背景意图 (Background)

列表、右侧合计/附件、下方费用明细三块大小写死，费用行多时只能内部滚动。希望间隙可拖，按审核习惯自己拉大某一块。

# 2. 核心逻辑变更 (Core Logic)

`detail-panel.vue` 用与费用审核详情相同的分隔条：左右改右侧栏像素宽，上下改上下高度比例。松手写入 `localStorage` 键 `payment-review-layout-split`，并 `resize` 通知列表重算高度。上下限制 22%–78%，右侧栏最窄 240px、且给列表至少留 360px。

# 3. 避坑指南 (Pitfalls)

不要再用 CSS `gap` 当可点热区，热区必须是独立的 `drag-handle`。拖动中给 layout 加 `is-resizing` 关掉子表 pointer-events，否则鼠标划过 VXE 表格会丢拖拽。
