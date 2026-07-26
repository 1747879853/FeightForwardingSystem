# 2026-07-26 业务联系单品名多选高度对齐海运出口

## 背景意图

`/pre-order/add`（及编辑页）「货物与箱型」标题栏内联「品名」选中后文字被裁切，高度与「货物类型」不一致。

## 核心逻辑变更

1. **根因**：海运出口对内联货物类型/品名走了 `mapSchemaWithSmallSize`（`size: 'small'`），Ant Design 小尺寸多选 tag 才能塞进共用 CSS 的 24px selector；业务联系单内联 schema 漏了 `size: 'small'`，用了默认尺寸 tag，被裁切。
2. **修复**：在 `usePreOrderCargoTypeInlineSchema` 的货物类型、品名 `componentProps` 补 `size: 'small'`，与海运出口一致。不改共用 `form.css`。

## 避坑指南

- 标题栏内联控件对齐海出时，除样式类外还要带上 `size: 'small'`（或复用 `mapSchemaWithSmallSize`），只抄 CSS 不够。
