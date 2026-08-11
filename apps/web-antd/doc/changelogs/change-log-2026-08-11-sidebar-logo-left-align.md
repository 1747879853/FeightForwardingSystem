---
title: 侧边栏折叠态 Logo 取消水平居中改为靠左
date: 2026-08-11
module: shared
---

# 背景意图

侧边栏折叠且仍显示标题时，Logo 使用 `mx-auto` 水平居中，左侧会出现多余空白；需改为靠左对齐，保留左右 padding。

# 核心逻辑变更

`packages/effects/layouts/src/basic/layout.vue` 的 `logoClass`：

- `collapsedShowTitle && sidebarCollapsed` 时由 `mx-auto` 改为 `mr-auto`
- Logo 组件本身仍使用 `px-3`，左右内边距不变

# 避坑指南

- 仅影响「折叠侧边栏且 `collapsedShowTitle`」场景；混合导航等其它布局不受影响
- 勿把 `logo.png` 等品牌资源改动混进同一次提交
