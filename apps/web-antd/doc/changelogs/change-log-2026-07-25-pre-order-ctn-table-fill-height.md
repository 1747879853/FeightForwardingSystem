# 业务联系单箱型箱量表格铺满剩余高度并内部滚动

- 日期：2026-07-25
- 类型：Style
- 影响页面：`/pre-order/add`、`/pre-order/:id/edit`

## 一、背景意图

「货物与箱型」左侧箱型表随行数把费用区不断顶下去。期望：表格占满基础信息与费用卡片之间的剩余视口高度，行数超出时在表体内滚动，费用区始终贴在下方可见。

## 二、核心逻辑变更

1. `views/pre-order/editor.vue`
   - 基础 Tab 建立高度传递链：`pre-order-editor-page` → Spin → `pre-order-basic-page` → `main-layout` → `center-column` 均为 `height:100% / flex:1 / min-height:0`。
   - 「货物与箱型」section（`pre-order-cargo-section`）`flex:1`，费用 section（`pre-order-fee-section`）`flex-shrink:0`，货物卡片吃掉剩余高度。
   - 卡片 body / `cargo-main-layout` / 左侧列改为 flex 列并 `overflow:hidden`，把高度交给箱型表。
2. `views/pre-order/modules/ctn-table.vue`
   - 根节点与 `__body` 用 flex 铺满父级；`ResizeObserver` 量测 body 区域后设置 `Table` 的 `scroll.y`（扣除表头高度），行多时表体内滚动。

## 三、避坑指南

- 高度链任意一层缺 `min-height:0` 或 `overflow:hidden`，子级 `height:100%` 会失效，表格无法算出可用高度。
- `scroll.y` 必须是表体高度而非整表高度；量测时优先读 `.ant-table-header`，回退 `.ant-table-thead`。
- 样式仅挂在 `pre-order-*` 类上，避免污染共用的海运出口 `form.css`。
