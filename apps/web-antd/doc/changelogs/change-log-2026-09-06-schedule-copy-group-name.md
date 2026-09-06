---
title: 船期查询点击方案名称复制失败时回退 execCommand
date: 2026-09-06
module: schedule-query
---

# 背景意图

`/#/schedule` 点共舱方案名称时，只走 `navigator.clipboard.writeText`。HTTP、无剪贴板权限或页面失焦会抛错，直接提示「复制失败，请手动选择方案名称」。

# 核心逻辑变更

- 抽出 `copyTextToClipboard`：先试 Clipboard API，失败或缺能力时用隐藏 textarea + `execCommand('copy')`。
- 方案名称点击复制改为走该辅助函数；两种方式都失败才提示手动选择。

# 避坑指南

- Clipboard API 在非安全上下文（如 `http://192.168.x.x`）通常不可用，不能只看 `navigator.clipboard` 是否存在；`writeText` 存在也可能 `NotAllowedError`。
- 失败时必须再试 `execCommand`，不要在 `writeText` 的 `catch` 里直接 toast。
