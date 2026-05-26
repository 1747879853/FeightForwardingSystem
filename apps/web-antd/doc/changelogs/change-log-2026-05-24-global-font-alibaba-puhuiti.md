# 全局字体由 PingFang SC 切换为阿里巴巴普惠体

## 背景意图

- 项目已引入阿里巴巴普惠体 2.0 本地 TTF 资源，需替换原 PingFang SC WebFont 配置。
- 保持全局样式、CSS 变量与 Ant Design 主题 `fontFamily` 一致。

## 核心逻辑变更

- `src/global-font.css`：`@font-face` 与字体栈改为 `Alibaba PuHuiTi`，按字重映射 `Alibaba_PuHuiTi_2.0_*.ttf`。
- `src/app.vue`：AntD `fontFamily` 首选字体同步为 `Alibaba PuHuiTi`。
- `src/assets/fonts/README.md`：更新字体文件与字重对照表。

## 避坑指南

- TTF 使用 `format('truetype')`，勿沿用 woff2 格式声明。
- 文件名中的数字（35/45/55…）为字重档位，需与 CSS `font-weight` 一一对应，避免粗体回退到系统字体。
