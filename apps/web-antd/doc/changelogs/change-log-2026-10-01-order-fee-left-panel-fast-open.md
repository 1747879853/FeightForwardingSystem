# 费用录入左侧订单信息首屏加速

## 背景

进入费用录入 Tab 时，左侧「订单信息」卡片要等很久才有内容。

## 原因

1. 左侧 `displayList` 依赖 `formValues` / `to`，原先只在 `getDetail` 返回后赋值；编辑页已通过 `latestDetail`（`savedDetail`）持有完整详情，首屏未复用。
2. 同帧挂载应收/应付双 Handsontable，主线程被表格初始化占用，即使数据已到也可能迟迟画不出左侧。
3. `pageLoading` 初始为 `false` 且几乎从不置 `true`，无缓存时也没有明确加载态。

## 改动

- `OrderFeePage`：`watch(latestDetail, { immediate: true })` 立刻填充左侧；无缓存时才对 `getDetail` 转圈，有缓存则后台刷新。
- 首帧 `nextTick` 后再 `v-if` 挂载双费用表，让订单信息先绘制。

## 影响范围

海运出口 / 海运进口 / 空运出口费用录入（共用 `OrderFeePage`）。
