# 切页不再控制 Tab canvas

## 背景意图

切底栏、进出详情时卸掉或延后挂 canvas，Tab 会闪、纯色底和真滑块来回切。产品要求切页不要再动 canvas。

## 核心逻辑变更

- 去掉 `onHide` 卸载、`onShow` 延时挂载、进详情时的 `leaving`。
- canvas 进页就画。只有打开检索抽屉才 `hidden` 卸掉，关掉再挂回。

## 避坑指南

- 微信 2d canvas 切页仍可能短暂浮层，不要用卸节点来换闪动。
