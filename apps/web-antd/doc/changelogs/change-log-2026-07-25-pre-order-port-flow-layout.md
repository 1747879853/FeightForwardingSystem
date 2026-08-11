# 业务联系单港口信息对齐海运出口展示

- 日期：2026-07-25
- 类型：Style / Feature
- 影响页面：`/pre-order/add`、`/pre-order/:id/edit`
- 关联页面（受影响的复用方）：`/sea-export/add`、`/sea-export/:id/edit`

## 一、背景意图

业务联系单编辑页的「港口与航线」原来只是 6 列普通下拉（收货地 / 起运港 / 中转港1 / 中转港2 / 目的港 / 交货地），与海运出口的「港口信息」流转卡片视觉差异明显：没有节点卡片、没有流向箭头、没有港口备注、两个中转港各占一列。本次把业务联系单的港口区块完全按海运出口的展示重做，销售在两个页面之间切换时看到同一套结构。

## 二、核心逻辑变更

1. `views/pre-order/form-data.ts`
   - `usePreOrderPortSchema` 重写为与海运出口 `usePortFormSchema` 同构：
     - 5 列节点（收货地 → 起运港 → 中转港 → 目的港 → 交货地），套用海出的 `port-flow-item` / `port-flow-pos--*` / `port-flow-item--last` 样式类，自带流向箭头；
     - 中转港 1/2 共用第 3 列（`port-flow-item--transit`，另一个加 `port-flow-item--hidden`）；
     - 每个节点下方新增 `EnglishUpperTextarea` 备注行（`port-flow-remark`），字段 `receivePortRemark` / `polRemark` / `pot1Remark` / `pot2Remark` / `podRemark` / `deliverPortRemark`；
     - 港口下拉统一复用海出的 `buildPortSelectProps`（`labelKey: 'ediCode'` + `onChange` 透出 `option.raw`）。
   - 新增 `PRE_ORDER_PORT_REMARK_FIELDS`：港口 id 字段 → 备注字段的映射。
2. `views/pre-order/editor.vue`
   - 港口表单 `wrapperClass` 改为 `port-flow-wrap form-controls-small grid-cols-5 gap-x-8`（与海出一致，列间距与 `--port-flow-col-gap: 2rem` 匹配，箭头才落在正确位置）。
   - 新增中转港 1/2 内联 Tab：`applyTransitPortTabSchema` 用 `updateSchema` 切换隐藏类，再把 Tab 按钮 `Teleport` 到当前可见中转港的 `label` 上（复刻海出交互）。
   - 选中港口后自动回填备注：复用 `formatSeaExportPortRemark` + `pickPortSelectOption`，格式为 `PORTNAME, COUNTRYENNAME`（半角 + 英文大写）。
   - 详情回显补齐 6 个备注字段；提交沿用「展开港口表单值」的写法，备注随之进入 DTO。
   - 区块标题由「港口与航线」改为「港口信息」，并加 `pre-order-port-section` 类做 DOM 查询锚点。
3. `views/sea-export-admin/data.ts`
   - `buildPortSelectProps` 由私有改为导出；新增导出 `pickPortSelectOption`、`formatSeaExportPortRemark` （从 `basic-info-form/form.vue` 上移），业务联系单与海运出口共用同一份备注格式化逻辑。
4. `views/sea-export-admin/basic-info-form/form.vue`
   - 删除本地的 `pickPortSelectOption` / `normalizePortRemarkPart` / `formatSeaExportPortRemark`，改为从 `../data` 导入。
   - `refreshPortLabelTargets` 由 `document.querySelector` 改为在自身港口区块（`sectionRefs.port`）内查询。

## 三、避坑指南

- **内嵌场景的 DOM 抢占**：业务联系单「通过」后会在第二个 Tab 内嵌整个海运出口编辑器。两页现在都有 `.port-flow-wrap .port-flow-item--transit` 结构，且业务联系单的 DOM 在前，海出原来的全局 `document.querySelector` 会把自己的中转港 Tab 传送到业务联系单的 label 上。因此海出改为在自身港口 section 内查询，业务联系单则用 `.pre-order-port-section` 前缀限定；后续任何复刻港口流转卡片的页面都必须自带作用域前缀。
- **字段大小写**：业务联系单与海运出口均为 `poT1Id/poT2Id/poT1Remark/poT2Remark`（C# `PoT1Id` 的 camelCase）。早期曾误用 `pot1Id`，会导致保存后回填读不到，已于 2026-08-11 纠正。
- **备注只在「选择港口」时联动**，手工改过的备注不会被覆盖（仅 `onChange` 时写入），与海出行为一致。
