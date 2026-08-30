# 监装列表 Tab 与卡片之间补上稿面过渡色条

## 背景意图

[Figma 检索条件](https://www.figma.com/design/6Fp1XCtTc0rfw2hLtZCOCn/Untitled?node-id=28-654) 里 Tab 轨道是 `#e3ecff`、高 114、圆角 20，卡片从 88 处起。原先 Tab 只有 96 且和卡片贴死，看不到中间那段过渡色条。

## 核心逻辑变更

- `skew-tabs` 总高改为 114rpx：上面 88rpx 画斜切白滑块和文案，下面 26rpx 整宽露出 `#e3ecff` 过渡条；四角按稿 20rpx 圆角裁切。
- 列表 `padding-top: 20rpx`，空状态卡片改为四角 28rpx，不再和 Tab 连成一块。

## 避坑指南

- 稿宽 750，114 / 88 / 20 按 1:1 写 rpx。canvas 里滑块底边用 `height * 88/114`，不要画满整高，否则过渡条会被白滑块盖住。
