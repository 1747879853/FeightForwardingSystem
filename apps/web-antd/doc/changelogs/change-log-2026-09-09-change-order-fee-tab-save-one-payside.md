---
title: 更改单费用页签一次只展示并保存一侧
module: 海运出口
author: auto-doc-sync
last_updated: 2026-09-09
---

# 1. 背景意图 (Background)

`ChangeOrderAdmin/EditAsync` 一次只能保存一种收付类型（混传报「一次只能保存一种收付类型的费用」，空列表报「更改单费用不能为空」）。更改单费用表应回到原来的应收/应付页签：一次只显示一侧，保存也只提交当前页签。

# 2. 核心逻辑变更 (Core Logic)

- 去掉上下分栏，恢复 `v-show` 页签；工具栏左侧切应收/应付。
- 「保存更改单」只带当前页签费用（`paySide` 0 或 1），过滤未填费用代码的空行。
- 切页签后调用 `remasureTable`，避免 Handsontable 在 `display:none` 时高度为 0。

# 3. 避坑指南 (Pitfalls)

- 另一侧费用不会随这次保存落库，需要切过去再保存。
- 新建更改单至少要有当前侧一条有效费用，否则后端拒绝空 `orderFees`。
- 保存成功后刷新两侧表，让新建行拿到服务端 id，避免再次保存被当成新行。
