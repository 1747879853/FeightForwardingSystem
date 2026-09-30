---
title: 即时运价
module: 航线管理
author: auto-doc-sync
last_updated: 2026-09-30
---

# 1. 业务背景说明 (Background)

**白话解释：** 业务订舱前需要知道某条航线当下各船司的即时运价。本页选起运港、目的港和箱型后，同步查询三方接口返回的 Spot 运价，按船司/船名/航次合并成卡片展示，并可查看费用明细。

> [!WARNING] 页面上**不得出现第三方供应商名称**。提示语、空态、错误提示一律使用中立表述「三方接口」。

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/spot-query` |
| 路由名称 | `SpotFreightQuery` |
| 页面组件 | `src/views/spot-query/list.vue` |
| 权限口径 | `Admin.ExternalApi.Use`（第三方接口 > 使用） |
| 后端接口 | `POST /services/app/RongETongAdmin/SpotQueryAsync` |
| 前端超时 | `180_000` ms（后端最长等 120 秒） |
| 关键源码 | `src/router/routes/modules/freight-rate.ts`<br/>`src/views/spot-query/list.vue`<br/>`src/views/spot-query/data.ts`<br/>`src/views/spot-query/modules/fee-detail-drawer.vue`<br/>`src/api/rong-e-tong/rong-e-tong-admin.ts` |
| 契约文档 | `doc/外部API/荣E通模块接口文档.md` 第 5 节 |

# 2. 功能与操作说明 (Features & Operations)

- **查询条件：** 起运港 / 目的港（`PortSelect`，value=Id）+ 箱型多选（`CtnSelect`）+「查询运价」。两端运输类型由后端固定按堆场（CY）查，前端不传。港口须维护 EDI 代码，否则整次请求 ABP 报错。
- **长等待：** 查询中 Spin 提示「正在查询运价，最长约 2 分钟…」，按钮 loading/disabled，防止重复提交。失败箱型**不自动重试**（再查会重新扣三方次数）。
- **结果合并：** 接口按箱型返回；前端按 `carrierCode + vessel + innerVoyno + etd` 合并为卡片，卡片内展示各箱型海运费与 Total。
- **排序：** 运价最低 / 最早开船 / 航程最短；当前排序最优卡打角标。
- **失败箱型：** `status=2` 的箱型用 Warning Alert 展示 `errorMessage`，其他箱型照常出卡。
- **复用：** `isReused=true` 时根据 `creationTime` 提示「xx 分钟前的运价」。
- **费用明细：** 抽屉展示费用分组、Spot 费用、滞箱/滞港/堆存、途经港口。

# 3. 验收要点

- 多箱型可查出运价并在卡片上分箱型展示
- 2 分钟内前端不超时打断；有加载提示；查询中不可重复提交
- 单箱型失败只提示该箱型，其他箱型正常
- 复用结果能看出多久前的运价
