---
title: 附件预览全屏后内容区铺满视口
date: 2026-09-06
module: shared / attachment-viewer
---

# 背景意图

点「全屏」后弹窗变宽，预览区仍是普通态的 `64vh`，四周留白。Ant Design Vue 4 的 Modal `content` 自带 padding，且 `max-width: calc(100vw - 32px)`；预览 body 又写死高度，flex 链接不上。

# 核心逻辑变更

- 全屏时 Modal / content / body 用 `inset:0; height:100%` 铺满 wrap，并去掉 content padding。
- 预览壳 `flex:1; min-height:0`，图片 `max-height:100%`。
- 切换全屏时重挂 vue-office，避免仍按 64vh 量过的尺寸渲染。

# 避坑指南

- 全屏样式必须打在 `wrap-class-name` 上（Modal 挂 body），且 `max-width` 要用 `none !important` 才能盖过 css-in-js。
- 不要只改 Modal `width: 100%` 却保留 `.attachment-viewer-body { height: 64vh }`。
