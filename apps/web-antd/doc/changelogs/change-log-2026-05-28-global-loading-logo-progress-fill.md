# 全局与路由切换 Loading 改为 Logo 进度条填充动画

## 背景意图

- 替换 Vben 默认旋转/跳动加载，首屏与路由切换均使用品牌 `logo-text.png` 与「从左到右填充」动效。

## 核心逻辑变更

- 新增 `apps/web-antd/loading.html`：双层 Logo + `clip-path` 进度填充动画；Logo 置于白/深色卡片内，避免 PNG 黑底与页面背景融为一体。
- `vite.config.mts`：`sync-loading-logo` 将 Logo 内联为 data URI，并同步 `public/logo-text.png`。
- `main.ts`：应用就绪后至少展示 800ms，并等待双帧 rAF 再卸载，避免初始化过快导致“看不到动画”。
- 注入脚本记录 `window.__APP_LOADING_START__` 供最短展示时长计算。
- `LogoProgressSpinner` + `RouteContentSpinner`：通过 `BasicLayout` 的 `#content-overlay` 插槽替换路由切换时的 `VbenSpinner`。
- `@vben/layouts`：`BasicLayout` 开放 `content-overlay` 插槽，并导出 `useContentSpinner`。

## 避坑指南

- `logo-text.png` 为黑底 PNG：暗色主题下若不用卡片衬底，Logo 区域会与 `#0d0d10` 背景几乎不可见。
- 修改 `vite.config.mts` 或 `loading.html` 后请**重启** `pnpm dev`，否则可能仍使用旧模板。
