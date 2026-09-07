---
title: 付费申请附件卡片铺满右侧剩余高度
module: 费用管理
author: auto-doc-sync
last_updated: 2026-09-08
---

# 1. 背景意图 (Background)

新增/编辑页右侧附件卡片原先写死 `200px`。左侧结算单位、发票、结算币别变高后，右栏被撑开但附件卡不跟着长，下方留白。

# 2. 核心逻辑变更 (Core Logic)

- `.right-column` 与左侧网格行 `stretch` 对齐。
- 审核流程卡仍固定 `296px`；附件卡改为 `flex: 1`，最低 `200px`，吃掉右栏剩余高度。
- 分组小卡随附件区变高拉伸，文件列表超出时在卡内滚动。

# 3. 避坑指南 (Pitfalls)

- 不要再给 `.attachment-card` 写死 `height`/`flex-basis: 200px`，否则左栏撑高后右下角又会空一截。
- 宽屏两列才有「铺满剩余」；`max-width: 1200px` 时右栏改成审核流程与附件并排，互相对齐高度即可。
