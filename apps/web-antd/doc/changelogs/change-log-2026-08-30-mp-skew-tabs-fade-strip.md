# 监装列表 Tab 下沿改为渐变过渡条

## 背景意图

选中 Tab 和卡片之间不要再叠卡片、也不要整块浅蓝切断。只要从 Tab 底下伸出一条渐变带：`linear-gradient(180deg, #FDFEFF 0%, #F0F2F8 52.55%)`。

## 核心逻辑变更

- `skew-tabs` 分成 Tab 行（88rpx canvas 滑块）和下沿 `48rpx` 渐变条。
- 列表去掉 `margin-top: -26rpx`，卡片接在渐变条下面。

## 避坑指南

- 微信小程序 `linear-gradient` 写在普通 `view` 上即可，不必画进 canvas。
- 渐变条不要盖在 canvas 里，否则又会被原生层和滑块抢层。
