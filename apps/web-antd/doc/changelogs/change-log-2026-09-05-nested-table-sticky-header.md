---
title: 费用明细滚动时表头吸顶
module: 审核审批
author: auto-doc-sync
last_updated: 2026-09-05
---

# 1. 背景意图 (Background)

审核页费用明细改成内部滚动后，列名跟着内容一起滚走，对列时要反复滚回顶部。希望纵滚时外层表头留在顶部。

# 2. 核心逻辑变更 (Core Logic)

`NestedDataTable` 外层 `thead th` 改为相对 `__scroll` 容器 `position: sticky; top: 0`，并补回表头底边框、提高 z-index，避免行内容盖住列名。

# 3. 避坑指南 (Pitfalls)

吸顶加在共用组件上，付费申请编辑页等所有 `NestedDataTable` 同步生效。不要给 `__scroll` 再包一层 `overflow`，否则 sticky 会失效。展开后的费用子表表头仍随该组一起滚动（子表外包了横向滚动）。
