# NestedDataTable 展开列固定 32px

## 背景意图

- 付款申请外层费用明细在宽容器下，展开列被撑到约 37px，与「添加费用」抽屉中的 32px 不一致。

## 核心逻辑变更

- `src/components/nested-data-table/nested-data-table.vue`：
  - 外层表保持 `width: 100%` + `table-layout: fixed`。
  - **最后一列的 `<col>` 不写死宽度**，专门吸收剩余空间。
  - 展开列继续 `width/min-width/max-width: 32px`。
  - 内外层表样式拆分（`__outer` / `__inner`），避免互相覆盖。

## 避坑指南

- `table-layout: fixed` 且表宽 `100%`、**每一列都有固定宽**时，多余宽度会按比例摊到所有列；此时给展开列加 `max-width: 32px` **无效**。
- 正确做法是留一列（通常最后一列）不设 `<col>` 宽度，或不要把表强制拉满到大于列宽之和。
