# 检索抽屉改为本地组件，避开微信过滤 wot-design

## 背景意图

列表改回 `wd-popup` 后，微信报 `node-modules/wot-design-uni/components/wd-popup/wd-popup.js 已被代码依赖分析忽略`，首页也注册失败。easycom 只写进 JSON，分析器不认 JS `require`。

## 核心逻辑变更

- 新增本地 `components/search-drawer/search-drawer`：右侧遮罩 + 面板，`v-model` 与原来一致。
- 列表不再引用 `wd-popup`。`pages.json` 用 easycom / `usingComponents` 登记，和 `skew-tabs` 同一套。

## 避坑指南

- `node-modules` 里的 wot 组件也会被「过滤无依赖文件」丢掉，不要把会进主包启动的弹层放在 `wd-popup` 上。
- 关掉过滤开关仍可能被开发者工具本地设置覆盖，本地组件最稳。
