---
title: 海运进口箱型箱量支持批量新增
date: 2026-09-13
module: sea-imports
---

# 背景意图

海运出口已能按箱型填数量一次生成多行集装箱；进口「箱型箱量」仍只能点「+」逐条加空行，多柜录入成本高。进口新建/编辑共用同一张箱型表，需对齐出口交互。

# 核心逻辑变更

1. **批量新增 Popover：** `sea-import-admin/modules/order-ctn-table.vue` 标题栏增加「批量新增」。打开时分页拉取全部启用箱型（`status=0`），不按 `isDefault` 裁剪；顶部按箱型名本地搜索。
2. **一行一柜：** 确认后按各箱型数量展开行，预填 `ctnCodeId` / `ctnCodeName`；若货物区已选总包装，新行带出 `codePackageId`（及缓存名称）。
3. **上限与单条添加：** 单箱型最多 99、单次合计最多 200；原「+」空行仍保留。
4. **文案：** 补齐 `zh-CN` / `en-US` 的 `seaImport.import.batchAddCtn*`。

# 避坑指南

- 箱型主键是雪花 ID，生成行时原样透传，禁止 `Number(id)`。
- 搜索只过滤展示，确认时仍按全部已填数量汇总，避免搜完丢数量。
- 弹层列表走 `CtnCodeAdmin/GetPagedListAsync`，禁用箱型（`status=1`）不展示。
- 进口箱表仍在 `seaImport.orderCtns`，并保留规格/型号/净重列；不要误接到出口 `transportOrder.orderCtns`。
