# 海出/海进/空出列表「新增」「复制」按钮图标与文字垂直对齐

## 背景意图

- 列表工具栏「新增」「复制」使用 `@vben/icons` 的 lucide 图标放入 Ant Design Vue `Button` 的 `#icon` 插槽。
- 渲染结果为裸 `<svg>`，不带 `.anticon`，拿不到 antd 的 `vertical-align: -0.125em` 与图标间距规则；按钮本身又是 `inline-block`，导致图标相对文字偏高。

## 核心逻辑变更

- `sea-export-admin/list.vue`、`sea-import-admin/list.vue`、`air-export-admin/list.vue` 的「新增」「复制」按钮 class 增加 `inline-flex items-center gap-1`。
- 用 flex 垂直居中对齐图标与文字，并用 `gap-1` 补上图标与文案间距。

## 避坑指南

- 纯 lucide / 裸 svg 进 `#icon` 时，不要指望 antd 的 `.anticon` 基线与间距；优先在按钮上用 `inline-flex items-center`。
- 「复制」在 `loading` 时 antd 会换成自带 `.anticon` 加载图标，其自带 margin 可能与 `gap-1` 叠加，按钮宽度可能瞬时多几像素。
