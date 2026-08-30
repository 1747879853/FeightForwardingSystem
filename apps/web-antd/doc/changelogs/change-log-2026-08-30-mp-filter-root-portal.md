# 检索抽屉改用页面级 root-portal 盖住 Tab canvas

## 背景意图

卸掉 canvas 不是改层级。微信 2d canvas 是原生层，普通 `z-index` 和套在组件里的 `wd-popup root-portal` 都压不住。

## 核心逻辑变更

- 筛选取消 `hidden` 卸 canvas，Tab 始终绘制。
- 抽屉改为页面上的原生 `<root-portal>`，遮罩 `z-index: 10000`，这是微信用来盖原生组件的顶层节点。
- Tab / canvas 的 `z-index` 降到 0，同层渲染时也排在抽屉下面。

## 避坑指南

- `root-portal` 必须写在页面里，不要再套进 `wd-popup` 自定义组件，否则盖不住 canvas。
- 抽屉要点 `@tap.stop`，否则点表单会关掉遮罩。
