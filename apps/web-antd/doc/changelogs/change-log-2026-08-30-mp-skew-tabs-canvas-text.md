# 监装列表斜切 Tab 文案改在 Canvas 上绘制

## 背景意图

斜切滑块能画出来，但「新派 / 进行中 / 已完成」看不见。微信 `canvas type="2d"` 常走原生层，会盖住普通 `view` 文字，CSS `z-index` 无效。

## 核心逻辑变更

- `skew-tabs` 在画完底座和滑块后，用 `fillText` 把分段文案画到同一块 canvas 上。
- 上面的 `view` 只做点击热区，`<text>` 透明，避免和 canvas 字叠两层。

## 避坑指南

- 微信里不要指望把文字 `z-index` 叠在 `type="2d"` canvas 上面；要显示的字画进 canvas，或改用 `cover-view`。
- 自定义组件里即使不用 canvas，文本也应用 `<text>` 包起来，裸写在 `view` 里有时不渲染。
- canvas 字号用 px（约 13/14），不要写 rpx；中文用 `sans-serif` 即可落到系统字体。
