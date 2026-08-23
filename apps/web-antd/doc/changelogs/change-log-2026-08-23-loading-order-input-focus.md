# 2026-08-23 监装输入框恢复聚焦蓝边

## 背景意图

按 Figma 把监装控件默认边框写成 `#e4e8ef` 后，选择器盖过了 Ant Design 的 hover/focus，点中输入框边框不再变蓝。

## 核心逻辑变更

- 默认态仍用稿面灰边。
- 可编辑 Input / Select / DatePicker / InputNumber / 详细说明在 hover 用 `#4096ff`、focus 用 `#1677ff` 并补 2px 外圈。
- 主单只读格、禁用控件不套蓝色。

## 避坑指南

- 不要再给这些控件写无状态 `border-color` 且不排除 `:focus` / `-focused`，否则会再次盖掉主色。
