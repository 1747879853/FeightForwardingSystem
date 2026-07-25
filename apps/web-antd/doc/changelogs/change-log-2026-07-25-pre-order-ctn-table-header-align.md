# 业务联系单箱型箱量表格表头与内容列对齐

- 日期：2026-07-25
- 类型：Fix
- 影响页面：`/pre-order/add`、`/pre-order/:id/edit`

## 一、背景意图

「货物与箱型」左侧箱型箱量表在开启 Ant Design `scroll.y` 后，表头与表体拆成两张表，出现列错位、备注右侧大块灰底留白；调列宽 / `scroll.x` / 滚动条槽均无法稳定消除。

## 二、核心逻辑变更

1. `views/pre-order/modules/ctn-table.vue`
   - **去掉 `scroll.y` / `ResizeObserver` 量高**：不再拆表头表体。
   - 外层 `__body` 用 `overflow: auto` 承接纵向滚动；`thead th` 用 `position: sticky` 保持表头可见。
   - 各列（含备注）写死宽度；`table { width:100%; table-layout:fixed }` 铺满容器，多余宽度按列比例分配，右侧不再留空灰底。

## 三、避坑指南

- Ant Design Table 的 `scroll.y` 会拆成表头/表体两张表，滚动条占位与列宽计算极易错位；需要「铺满剩余高度 + 内部滚动」时，优先外层滚动 + sticky 表头。
- 全列写死宽 + `scroll.x` 小于容器时，备注右侧会出现无标题灰底；单表 + `width:100%` + `table-layout:fixed` 可把剩余宽度分给各列。
