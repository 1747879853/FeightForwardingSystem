---
title: 付费申请审核费用明细最后一行被裁切
module: 审核审批
author: auto-doc-sync
last_updated: 2026-09-05
---

# 1. 背景意图 (Background)

审核页费用明细展开后，最后一条费用行被表格横向滚动条和固定 300px 高度裁掉，滚到底也看不全。

# 2. 核心逻辑变更 (Core Logic)

详情面板费用明细改用与付费申请表单相同的 `NestedDataTable`（`fill-height`），占满卡片剩余高度内部滚动；底部合计栏不再参与压缩。

# 3. 避坑指南 (Pitfalls)

不要再给审核费用表加 Ant Table 的 `scroll.y` 固定像素。嵌套展开行在固定高度 + `overflow: hidden` 下，最后一行会被横向滚动条挡住。
