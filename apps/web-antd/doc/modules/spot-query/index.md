---
title: 即时运价
module: 航线管理
author: auto-doc-sync
last_updated: 2026-09-30
---

# 1. 业务背景说明 (Background)

**白话解释：** 业务订舱前需要知道某条航线当下各船司的即时运价。本页选起运港、目的港、两端运输类型和箱型后，同步查询三方接口返回的 Spot 运价，按船司/船名/航次合并成卡片展示，并可查看费用明细。

> [!WARNING] 页面上**不得出现第三方供应商名称**。提示语、空态、错误提示一律使用中立表述「三方接口」。

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/spot-query` |
| 路由名称 | `SpotFreightQuery` |
| 页面组件 | `src/views/spot-query/list.vue` |
| 权限口径 | `Admin.ExternalApi.Use`（第三方接口 > 使用） |
| 后端接口 | `POST /services/app/RongETongAdmin/SpotQueryAsync` |
| 前端超时 | `180_000` ms（后端最长等 120 秒） |
| 关键源码 | `src/router/routes/modules/freight-rate.ts`<br/>`src/views/spot-query/list.vue`<br/>`src/views/spot-query/data.ts`<br/>`src/views/spot-query/supported-edi-codes.ts`<br/>`src/views/spot-query/modules/fee-detail-drawer.vue`<br/>`src/api/rong-e-tong/rong-e-tong-admin.ts` |
| 契约文档 | `doc/外部API/荣E通模块接口文档.md` 第 5 节 |

# 2. 功能与操作说明 (Features & Operations)

- **查询条件：** 起运港 / 目的港（`PortSelect`，value=Id）+ 起运/目的港运输类型（`CY` 堆场 / `SD` 门点，必填）+ 箱型多选（`CtnSelect`）+「查询运价」。
- **五字码白名单（前端写死）：** 无五字码查询接口。选港后用港口 `ediCode`（去空格、忽略大小写）在 `supported-edi-codes.ts`（911 个）中校验；任一端不在名单 → 提示「港口不支持」，**不调用** `SpotQueryAsync`。
- **运输类型：** 入参必填 `polServiceType`、`podServiceType`（仅 `CY`/`SD`）。未选则不调接口。后端会落库；1 小时内复用时运输类型不同会重新查。
- **长等待：** 查询中 Spin 提示「正在查询运价，最长约 2 分钟…」，按钮 loading/disabled，防止重复提交。失败箱型**不自动重试**。
- **结果合并：** 接口按箱型返回；前端按 `carrierCode + vessel + innerVoyno + etd` 合并为卡片，卡片内展示各箱型海运费与 Total；运输条款展示当前所选 `POL-POD` 类型。
- **排序：** 运价最低 / 最早开船 / 航程最短；当前排序最优卡打角标。
- **失败箱型：** `status=2` 的箱型用 Warning Alert 展示 `errorMessage`，其他箱型照常出卡。
- **复用：** `isReused=true` 时根据 `creationTime` 提示「xx 分钟前的运价」。
- **费用明细：** 只读抽屉。顶部摘要卡（航线、箱型/船司/船名航次、有效期、海运费与总费用），下方分区卡片展示费用分组、即期费用、滞箱/滞港/堆存、途经港口。费用分组标题按接口英文名映射为中文（如 Origin charges → 起运港费用、Freight charges → 海运费、Destination charges → 目的港费用），未收录名称原样显示。色调与查询页同一套主色浅底，无第二层滚动。

# 3. 验收要点

- [ ] 五字码不在写死名单里时，提示「港口不支持」，网络里没有 `SpotQueryAsync`
- [ ] 没选起运港或目的港运输类型时，不调 `SpotQueryAsync`
- [ ] 两端都选了 `CY` 或 `SD`，且五字码都在名单里，才调 `SpotQueryAsync`，入参带 `polServiceType`、`podServiceType`
- [ ] 多箱型可查出运价并在卡片上分箱型展示
- [ ] 2 分钟内前端不超时打断；有加载提示；查询中不可重复提交
- [ ] 单箱型失败只提示该箱型，其他箱型正常
- [ ] 复用结果能看出多久前的运价

# 4. 变更与解析日志

| 日期 | 变更类型 | 说明 |
| :-- | :-- | :-- |
| 2026-09-30 | `Fix` | TAPD #1001026：五字码前端白名单；运输类型 CY/SD 必填并传入查询。详见 [变更记录](../../changelogs/change-log-2026-09-30-spot-query-edi-service-type.md)。 |
| 2026-09-30 | `Feature` | 新增即时运价查询页。 |
