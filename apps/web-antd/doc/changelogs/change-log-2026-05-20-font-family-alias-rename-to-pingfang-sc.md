# 全局字体别名统一为 PingFang SC

## 背景意图

- 现网配置使用 `PingFangSCWeb` 作为自定义别名，不符合期望的字体名称表达。
- 需要将全局样式与组件主题统一为 `PingFang SC`，减少认知成本并保持配置一致。

## 核心逻辑变更

- `src/global-font.css` 中 `@font-face` 的 `font-family` 由 `PingFangSCWeb` 调整为 `PingFang SC`。
- `:root --font-family` 与 `body/#app` 字体链移除 `PingFangSCWeb`，统一以 `PingFang SC` 开头。
- `src/app.vue` 中 AntD `fontFamily` 同步改为 `PingFang SC` 字体链。

## 避坑指南

- `@font-face` 名称调整后，所有引用链路需一起替换，否则会出现部分区域仍走回退字体。
- 同名覆盖系统字体时，请确保 `woff2` 文件有效，避免误以为已生效但实际走本机系统字体。
