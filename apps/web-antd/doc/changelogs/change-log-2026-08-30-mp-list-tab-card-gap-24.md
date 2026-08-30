# 监装列表 Tab 与卡片间距改为 24rpx

## 背景意图

Tab 和第一张内容卡片之间原先空了 48rpx，按要求收到 24rpx。

## 核心逻辑变更

- `pages/loading/list` 的 `.list` 将 `padding-top` 从 48rpx 改为 24rpx。渐变层仍垫在卡片下，高度不变。

## 避坑指南

- 间距只由列表 `padding-top` 控制，不要再给第一张卡片加 `margin-top`。
