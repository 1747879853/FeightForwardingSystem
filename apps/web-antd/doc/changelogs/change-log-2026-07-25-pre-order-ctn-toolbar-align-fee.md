# 业务联系单箱型箱量工具栏对齐费用区

- 日期：2026-07-25
- 类型：Style
- 影响页面：`/pre-order/add`、`/pre-order/:id/edit`

## 一、背景意图

箱型箱量表上方原先有一条带「箱型箱量」文字与主色背景的标题栏，与下方费用区「纯 icon 增删」的工具栏风格不一致。按产品要求去掉标题文字与背景，与费用工具栏对齐。

## 二、核心逻辑变更

1. `views/pre-order/modules/ctn-table.vue`
   - 去掉 `order-ctn-table__title-bar` / `order-ctn-table__title-text` 及其 scoped 样式。
   - 增删按钮改为与 `fee-table` 相同的 `Space` + `mb-2` 布局，仅保留 `mdi:add-box` / `mdi:close-box` icon 按钮。

## 三、避坑指南

- 「箱型箱量」语义已由外层「货物与箱型」卡片标题覆盖，工具栏无需再写一遍标题。
