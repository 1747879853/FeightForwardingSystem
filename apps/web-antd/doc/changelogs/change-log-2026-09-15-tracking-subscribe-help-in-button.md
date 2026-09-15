---
title: 运踪订阅规则问号并入按钮
date: 2026-09-15
module: other
---

# 背景意图

列表和编辑页「运踪订阅」按钮右侧单独挂问号，和工具栏其它按钮对不齐，看起来像多出来的控件。

# 核心逻辑变更

1. **问号进按钮：** 文案后内嵌问号，悬停仍看订阅规则；点问号 `stop` 不触发订阅。
2. **共享组件：** `TrackingSubscribeHelp`；海出/海进/空出列表与编辑顶栏共用。
3. **禁用仍可看规则：** 问号 `pointer-events: auto`，已订阅禁用按钮时仍能悬停说明。

# 避坑指南

- 不要再在按钮外单独放问号，否则工具栏又会裂成两截。
- 点问号必须 `@click.stop`，否则会误订。
- Tooltip 挂到 `document.body` 必须在 `<script>` 里写函数；模板里的 `document` 会被当成组件属性，进页报 `Cannot read properties of undefined (reading 'body')`。
