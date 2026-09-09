---
title: 海运进口更改单对齐海运出口 Handsontable 与页签保存
module: 海运进口
author: auto-doc-sync
last_updated: 2026-09-10
---

# 1. 背景意图 (Background)

海运进口更改单此前仍是旧布局：左侧常驻更改单表 + 上下两张 VXE 费用表，保存时把应收与应付一起塞进 `EditAsync`。后端一次只能一种收付类型，且交互与海运出口新版不一致。需要把样式与交互完全对齐海出：顶部订单信息通栏、更改单选择器/历史抽屉、Handsontable 费用表、页签一次只展示并保存一侧、底部利润汇总，以及剩余视口高度与展开过渡。

# 2. 核心逻辑变更 (Core Logic)

- 以海出 `sea-export-admin/changeOrder/index.vue` 为底，改造成海进页：`seaImportAdapter`、海进 `ChangeOrderAdmin` / `SeaImportAdmin` API、海进口订单信息字段与 i18n。
- 费用表改用 `order-fee-table-handsontable.vue`，`mode='changeOrder'`；应收/应付页签 `v-show`，保存只提交当前 `paySide`。
- 删除已不再引用的旧 `table.vue`（VXE 更改单列表）。
- 布局：`height-offset=58`、Spin/flex 高度链、订单信息展开过渡与过渡后 `remasureTable`，与海出一致。

# 3. 避坑指南 (Pitfalls)

- 勿再把应收+应付混进同一次 `EditAsync`；另一侧需切页签再保存。
- 订单信息字段取自 `seaImportAdapter.getDisplayValue`，港口展示备注口径与应收应付页一致。
- Handsontable 组件内部类型仍引用海出 `OrderFeeAdminApi` 类型声明，运行时走适配器 API，海进费用结构兼容即可。
