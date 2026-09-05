---
title: 付费申请审核费用明细默认收起
module: 审核审批
author: auto-doc-sync
last_updated: 2026-09-05
---

# 1. 背景意图 (Background)

审核时费用明细默认全部展开，票多时下方表格很长，干扰先看合计和附件。改为默认收起，需要时再展开业务组。

# 2. 核心逻辑变更 (Core Logic)

`detail-panel.vue` 加载详情后不再把 `orderGroups` 的 key 写入 `expandedGroupKeys`，切单时也清空展开状态。

# 3. 避坑指南 (Pitfalls)

只改付费申请审核页，付款申请新增/编辑页费用明细仍默认展开。
