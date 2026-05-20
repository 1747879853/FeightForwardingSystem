# 全局字体接入本地 WebFont（PingFangSC-Regular）

## 背景意图

- 仅声明 `font-family` 无法保证客户端具备对应字体文件，非苹果设备上可能回退到其他字体。
- 需要通过 `@font-face` 显式加载本地字体资源，确保跨平台渲染一致性。

## 核心逻辑变更

- 在 `src/global-font.css` 新增 `@font-face`，注册字体族 `PingFangSCWeb` 并指向 `src/assets/fonts/PingFangSC-Regular.woff2`。
- 全局根节点字体链与 AntD `fontFamily` 同步改为以 `PingFangSCWeb` 作为首选字体。
- 新增 `src/assets/fonts/README.md`，固定字体资源放置路径与后续扩展方式。

## 避坑指南

- 若字体文件路径与 `@font-face` 不一致，会直接触发 404 并回退到后备字体。
- 字体文件名大小写需与样式引用一致，避免在 Linux/容器环境出现加载失败。
- 建议优先使用 `woff2` 以降低体积，必要时再补充 `woff` 作为兼容兜底。
