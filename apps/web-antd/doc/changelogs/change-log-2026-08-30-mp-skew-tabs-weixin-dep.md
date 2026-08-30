# 修复微信把 skew-tabs 当成无依赖文件丢掉

## 背景意图

监装列表接入斜切 Tab 后，微信开发者工具报 `components/skew-tabs.js 已被代码依赖分析忽略`，页面找不到组件。根因是 Vue `import` 被编成 JSON `usingComponents`，而微信「过滤无依赖文件」只认 JS `require`。

## 核心逻辑变更

- 组件挪到 easycom 标准目录 `components/skew-tabs/skew-tabs.vue`，`pages.json` 用 `usingComponents` + easycom 登记，列表页改为 `<skew-tabs>`，不再 `import` 单文件。
- `manifest.json` 与 `project.private.config.json` 关闭 `ignoreDevUnusedFiles` / `ignoreUploadUnusedFiles`。

## 避坑指南

- 重编译 `dev:mp-weixin` 后，若控制台仍提示该错：开发者工具 → 详情 → 本地设置 → 取消「过滤无依赖文件」（本地 `project.private.config.json` 可能覆盖工程配置）。
- 后续本地自定义组件一律放 `components/组件名/组件名.vue`，不要只靠页面里 `import Xxx.vue`。
