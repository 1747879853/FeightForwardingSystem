---
title: 更改单顶部订单信息展开过渡并修复高度自适应费用表
module: 海运出口
author: auto-doc-sync
last_updated: 2026-09-09
---

# 1. 背景意图 (Background)

更改单页顶部订单信息区域展开/收起时，会改变页面可用高度；若高度链路在过渡期被内容驱动，就会导致费用 Handsontable 把页面撑出视口，进而把底部利润汇总顶下去。期望效果是：费用表始终占用“屏幕剩余高度”，多余内容在表内滚动。

# 2. 核心逻辑变更 (Core Logic)

- 顶部订单信息展开/收起改为 CSS 动画（使用 `grid-template-rows` 0fr/1fr + `opacity`），避免 `v-if`/DOM 瞬切造成的高度抖动。
- 展开/收起后对费用表执行二次 `remasureTable`（延时与过渡同步），确保 Handsontable 以实际可视高度重新计算 `settings.height`。
- 更改单页使用 `height-offset="58"`（嵌套 `Page auto-content-height` 场景），并在必要的 flex 节点上加 `overflow: hidden`，防止整页纵向滚动回退。

# 3. 避坑指南 (Pitfalls)

- 费用表高度不能直接依赖动画开始瞬间的测量值；必须在过渡结束后重测（否则可能测到偏小高度，表现为多余空白或利润栏被顶出）。
- 过渡期间费用表仍在同一 flex 高度链路中，必要时要配合父容器 `min-height: 0` / `overflow: hidden`，让高度计算走 flex 分配而不是内容撑开。
