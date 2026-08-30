# 监装列表 Tab canvas 切页延后挂载

## 背景意图

从底栏其他页切到监装时，2d canvas 会立刻画出来并浮在上一页上。离开时若不卸掉，也会留在别的页上。

## 核心逻辑变更

- `onHide` 立刻 `v-if` 卸掉 canvas。
- `onShow` 约 180ms 后再挂回。先铺一层 `#e3ecff` 纯色底；canvas 在屏外画完第一帧再盖上去。
- 关检索抽屉仍立刻挂回，不再额外延时。

## 避坑指南

- 自定义组件里要用 `onHide` / `onShow`（`@dcloudio/uni-app`），不要只在 `onMounted` 里建 canvas。
- 延时未到就切走时要清 timer，否则会在隐藏页上把原生层画出来。
