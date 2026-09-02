---
title: 飞驼港到港船期分组逻辑对照
module: 航线管理
author: auto-doc-sync
last_updated: 2026-09-02
---

# 解析目标

同时打开本机 `/schedule` 与飞驼 `#/schedule/p2p`，用同一航线 CNTAO → SGSIN、ETD 2026-09-02、8 周，核对对方方案卡是怎么归组的，以及和本地前端重建差在哪。

# 核心逻辑梳理

飞驼页面前端 `getScheduleGroups` 只打 `GET /application/schedule/p2p/group`（`weeksOut=8`、`pageSize=200`，直达/中转 `isTransit=0/1` 各一次）。bundle 里没有 `groupName` / `shareCabins` 拼接代码，分组全在服务端。展开一组再带 `displayGroup`，同一接口的 `content` 变成班次。

对方方案对象字段：`groupName`、`routeEtd`（一张卡一个计划星期）、`maxDuration`、标准码头短名、`count`。同一次 `isTransit` 内 `groupName` 不重复，键就是 **直达|中转 + groupName**。星期、码头、航程不拆组。`solutionCode` 在扁平班次上每条都不同，不是分组键。

`groupName` 与本地同一套「共舱 `船公司(航线)` 去重字母序 `/` 拼接，无共舱退回本班承运人+航线」，但航线取共舱 **`displayName`（标准航线）**，本地 `getGroupName` 用原始 `routeCode`。

当天扁平 `/vessel2/v2/schedule` 635 条（VESSEL 616、TRUCK 19，空船名 19，tbn/feeder/to be 6）。按本地规则清洗后 610 条 → 直达 47 / 中转 15。飞驼方案列表直达 46 / 中转 16。对键 59 组相同，差 3 对：

| 差项 | 飞驼 | 本地 | 原因 |
| :-- | :-- | :-- | :-- |
| 中转 `CNC` | 有，8 班卡车空船名 | 无 | 扁平接口有这批 TRUCK；本地丢掉无船名 |
| 直达 `WHL(AA1)` | 列表没有（`displayGroup` 仍能展开） | 有，`WAN HAI 360 / W030` 52 天 | 对方方案列表过滤；同日列表有 `WHL(PM1)`（同船 `W031`） |
| `IAL…KMTC(FEM2)…` / `HMM…ONE(ALX3)` | 标准航线名 | 写成 `FME2` / `AX3` | 共舱 `displayName` vs `routeCode`，不是两组 |

旧文档写「扁平接口没有卡车中转 CNC」不成立，已更正。

方案卡外层一个星期、一个航程：对方接口给的是服务属性（`routeEtd` / `maxDuration`），不是 8 周班次的众数或最大。当场 `CNC(KCS)` 卡片星期一、展开 9 班全是星期五；`IAL(NFS)/…` 卡片航程 9 天，展开班次 9–13 天。

# 文档偏差 / 架构洞察

- 要对齐对方列表，接方案接口最干净。扁平重建做不到 `WHL(AA1)` 那层列表过滤。
- `getGroupName` 若改用 `displayName`（空再退 `routeCode`），拼写差的两张卡会并进对方同名组；中转 CNC、WHL(AA1) 仍对不上。
- 本机当天点胶囊查询 `QueryScheduleAsync` 失败，对照改走飞驼扁平接口按 `data.ts` 规则重建，与方案列表对键。

完整规则见 [方案分组规则](../modules/schedule-query/grouping.md)。
