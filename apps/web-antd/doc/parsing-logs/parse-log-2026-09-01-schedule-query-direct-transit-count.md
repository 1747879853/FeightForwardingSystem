---
title: 船期查询直达/中转组数与飞驼差 1 的原因
module: 航线管理
author: auto-doc-sync
last_updated: 2026-09-01
---

# 解析目标

同一条件 CNTAO → SGSIN、ETD 2026-09-01、weeksOut=8，本地方案卡直达 47 / 中转 15，飞驼港到港页直达 46 / 中转 16。总数都是 62。核对具体差在哪一组。

# 核心逻辑梳理

两边不是同一接口。飞驼列表走 `/application/schedule/p2p/group`（已分组）；本地走 `QueryScheduleAsync` → `/vessel2/v2/schedule` 扁平班次，前端按 `isTransit + groupName` 重建。

| 差项 | 飞驼 | 本地 | 原因 |
| :-- | :-- | :-- | :-- |
| 中转 `CNC` | 有，8 班 | 无 | 8 条全是 `transportMode=TRUCK`、船名航次为空。扁平船期接口不返回这批陆运中转；前端 `isUsableScheduleItem` 也会丢掉无船名。 |
| 直达 `WHL(AA1)` | 方案列表没有 | 有，1 班 `WAN HAI 360 / W030`，航程 52 天 | 扁平接口有这条船期。飞驼方案列表未挂出该组（用 `displayGroup=WHL(AA1)` 仍能搜到该船）。 |

其余方案名一一对应（个别航线代码拼写不同，如 `AX3`/`ALX3`、`FME2`/`FEM2`），不影响直达/中转计数。

# 文档偏差 / 架构洞察

- 不是分组键算错把 CNC 算进直达。本地直达也有一组 `CNC`（5 班海船），飞驼直达同样有 `CNC`；缺的是**另一组中转 CNC（卡车）**。
- 要对齐中转 16，需要接方案接口或允许无船名/TRUCK 班次进组，船期卡上会出现空船名，不适合当前「点船名看 AIS」的交互。
- `WHL(AA1)` 是否展示取决于对方方案接口的过滤，扁平班次重建无法复现那一层。
