# 2026-09-06 监装客户公开页顶栏 Logo 行吸顶

## 背景意图

客户往下看箱照时，顶栏 Logo 和「监装信息」会滚出屏幕。分享页没有系统导航，滚远了不知道这是哪家的监装页。

## 核心逻辑变更

- 顶栏 `position: sticky; top: 0`，白底加 `z-index`，内容从下方穿过时 Logo 行仍贴在最上。
- 页面根节点改成满高 `overflow: auto` 自己滚动。全局 `html/body/#app` 是 `height: 100%`，不这样做 sticky 可能粘不到真正的滚动容器。

## 避坑指南

- **不要改成 `position: fixed`。** 顶栏会脱离文档流，主体还要再垫一段高度，窄屏顶栏变高时容易露缝。
- **祖先 `overflow: hidden` 会让 sticky 失效。** 这条路由是 external、无 Layout，滚动必须发生在 `.loading-share` 自己身上。
