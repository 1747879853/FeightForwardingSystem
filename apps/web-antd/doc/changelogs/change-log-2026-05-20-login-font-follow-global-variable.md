# 登录页字体跟随全局变量修复

## 背景意图

- 登录页仍显示旧字体，说明仅设置 `body/#app` 字体不足以覆盖登录场景。
- 项目基础样式通过 `font-sans` 依赖 CSS 变量 `--font-family`，需要同步覆盖该变量。

## 核心逻辑变更

- 在 `src/global-font.css` 新增 `:root { --font-family: ... }`。
- 保持 `@font-face` 与 `body/#app` 字体链不变，使登录页与业务页统一到同一字体来源。

## 避坑指南

- 本项目若只改 `font-family` 而不改 `--font-family`，使用 Tailwind `font-sans` 的页面（如登录页）可能不会生效。
- 字体变量应与 `ConfigProvider` 的 `fontFamily` 保持一致，避免组件与页面字体分裂。
