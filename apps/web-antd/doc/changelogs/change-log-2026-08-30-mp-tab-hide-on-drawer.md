# 筛选抽屉打开时隐藏 Tab canvas，避免盖住抽屉

## 背景意图

微信 `canvas type="2d"` 走原生层，CSS `z-index` 压不住。打开「检索条件」抽屉时，分段 Tab 会穿到抽屉上面。

## 核心逻辑变更

- `skew-tabs` 增加 `hidden`：为 true 时 `v-if` 卸掉 canvas，关掉抽屉再挂回去并重新 init。
- 监装列表把 `searchVisible` 传给 `:hidden`。

## 避坑指南

- 不能只靠提高 `wd-popup` 的 `z-index`，原生 canvas 仍会穿层。
- 必须 `v-if` 卸节点，`v-show` / `visibility` 去不掉原生层。
