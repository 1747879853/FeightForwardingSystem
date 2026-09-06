---
title: 附件预览全屏后内容区铺满视口
date: 2026-09-06
module: shared / attachment-viewer
---

# 背景意图

点「全屏」后弹窗变宽，预览区仍是普通态的 `64vh`，四周留白。Ant Design Vue 4 的 Modal `content` 自带 padding，且 `max-width: calc(100vw - 32px)`；预览 body 又写死高度，flex 链接不上。

# 核心逻辑变更

- 全屏时 `.ant-modal` 改为 `position: absolute; inset: 0`（相对定位时 `inset` 撑不开高度）。
- vc-dialog 把 `.ant-modal-content` 包在无高度的 sentinel `div` 里，必须让这层也 `flex:1; height:100%`，否则 `content { height:100% }` 无效。
- 预览 body / shell 用 `flex: 1 1 0; height: 0` 吃掉标题栏剩余高度；切换全屏时重挂 vue-office。

# 避坑指南

- 全屏样式必须打在 `wrap-class-name` 上（Modal 挂 body），且 `max-width` 要用 `none !important` 才能盖过 css-in-js。
- 不要只改 Modal `width: 100%` / `height: 100%`：`.ant-modal` 默认 `position: relative`，`top+bottom` 不会把它拉满。
- 不要漏掉 `.ant-modal > div:first-child`；高度链在这一层断掉时，容器看起来永远只有内容那么高。
