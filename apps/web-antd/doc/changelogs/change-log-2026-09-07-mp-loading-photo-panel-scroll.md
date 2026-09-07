---
title: 监装处理弹层滚动不再穿透详情页
module: 小程序 / 监装师傅端
author: auto-doc-sync
last_updated: 2026-09-07
---

# 1. 背景意图 (Background)

附件类型较多时，监装处理底部弹层内上下滚动会带动背后详情页一起滚（滚动穿透）。

# 2. 核心逻辑变更 (Core Logic)

- 遮罩 `@touchmove.stop.prevent`，面板 `@touchmove.stop`，挡住背后页面。
- 面板固定 `height: 78vh`，`scroll-view` 用 `flex:1` + `height:0`，给微信确定高度，内容在弹层内滚。

# 3. 避坑指南 (Pitfalls)

- 微信 `scroll-view` 只有 max-height、没有确定高度时，内部滚不动，触摸容易落到页面上。
- 不要在整个面板上 `prevent` 死触摸，否则内部 `scroll-view` 也可能滚不动；遮罩 prevent、面板 stop 即可。
