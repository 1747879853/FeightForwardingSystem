---
title: 海出更改单费用表对齐应收应付 Handsontable
module: 海运出口
author: auto-doc-sync
last_updated: 2026-09-09
---

# 1. 背景意图 (Background)

海运出口「应收应付」费用表已切到 Handsontable（Excel 式录入、上下分栏）。更改单 Tab 仍用旧 VXE 表，列、工具栏和编辑体验不一致。需要让更改单费用表复用同一套表格组件，并保留更改单自己的整包保存、锁定只读。

# 2. 核心逻辑变更 (Core Logic)

## 2.1 页面

- `changeOrder/index.vue` 改引 `order-fee-table-handsontable.vue`。
- 应收/应付改为上下分栏（可拖拽，比例记在 `change-order-fee-rec-pay-split`），不再用页签切换。
- 保存仍走更改单 `EditAsync`；费用行经 `getSanitizedFees()` 还原下拉 ID 后再提交，避免 Handsontable 展示用的 label 被写回接口。

## 2.2 表格组件（`mode=changeOrder`）

- 隐藏费用表「保存」「设为完结」「AI 识别」；Ctrl+S 交给更改单页整包保存。
- 打印按更改单 id 取数（`isChangeOrderPrint`）。
- 锁定时整表 `readOnly`，工具栏新增/删除/引入禁用。
- 批量引入仍提示「暂不支持更改单」；下拉里的收付互生可继续用。
- 挂载时等下拉源就绪再拉费用；新建草稿 `getTableDate('')` 会清空更改单 id，避免残留上一张单的费用。

# 3. 避坑指南 (Pitfalls)

- 更改单费用不要走 `OrderFeeAdmin` 的表格保存；只点费用表按钮不会落库。
- Handsontable 单元格里是 label，保存必须走 `sanitizeOrderFee` / `*_value`。
- 表格在 `display:none` 时测高为 0，所以改成上下同时展示，不要再用 `v-show` 页签藏表。
- 海进/空出更改单仍用旧 VXE 表，本次只改海出。
