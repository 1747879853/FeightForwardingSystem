# 斜切 Tab 去掉原生 canvas，检索抽屉才能盖住

## 背景意图

检索抽屉无论 `z-index`、`root-portal` 还是卸 canvas，都压不住微信 `canvas type="2d"`。这块经常不走同层渲染，CSS 改不了它的显示层级。

## 核心逻辑变更

- `skew-tabs` 改成普通 `view` 画未选中底、选中滑块和两侧圆弧，文案也用 `text`。
- 滑块用 `transform` 过渡，不再走 canvas 动画。
- 检索抽屉回到页面里的 `fixed` 遮罩（`z-index: 10000`），Tab 已在同一渲染层，可以被盖住。

## 避坑指南

- 小程序里不要用 canvas 做会和弹层重叠的装饰。`root-portal` 只相当于 `position: fixed`，盖不住原生 canvas。
