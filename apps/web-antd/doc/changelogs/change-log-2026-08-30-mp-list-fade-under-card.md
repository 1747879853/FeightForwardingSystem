# 监装列表渐变过渡条改到列表、垫在卡片下

## 背景意图

Tab 下沿的延伸空间不应写在 `skew-tabs` 里，而应属于列表：卡片叠在渐变带上面。

## 核心逻辑变更

- 从 `skew-tabs` 去掉渐变条，组件只保留 88rpx 斜切滑块。
- `pages/loading/list` 的 `.list` 顶部 48rpx 露出过渡，底下绝对定位一层 `linear-gradient(180deg, #FDFEFF 0%, #F0F2F8 52.55%)`（高 200rpx、`z-index: 0`），卡片和空状态 `z-index: 1` 压在上面。

## 避坑指南

- 渐变层必须 `pointer-events: none`，否则会挡住卡片点击。
- 不要把这层写进 canvas，列表普通 `view` 即可。
