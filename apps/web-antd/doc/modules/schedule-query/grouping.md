---
title: 船期查询方案分组规则
module: 航线管理
author: auto-doc-sync
last_updated: 2026-09-02
---

# 船期查询方案分组规则

页面 `/schedule`。权威实现：`src/views/schedule-query/data.ts`（`groupSchedules` / `getGroupName` / `getScheduleGroupKey`），单测 `data.test.ts`。查询仍走 `QueryScheduleAsync`，**没有**港到港方案分组接口；方案卡由扁平班次在前端重建。

对照产品（飞驼控制塔港到港页）的列表走 `/application/schedule/p2p/group`，**前端 bundle 里没有拼 `groupName` 的逻辑**，分组全在对方服务端。两边对齐的是「一张卡代表一条共舱服务」，不是同一接口。

## 1. 处理流水线

```text
QueryScheduleAsync（pageNum=1, pageSize=9999）
        │  后端转第三方时 pageSize 上限 1000
        ▼
   扁平班次 items
        │
        ├─ 清洗 sanitizeScheduleItems
        │     丢掉：无船名、船名 feeder、含 to be、含 tbn（大小写不敏感）
        │
        ├─ 分组 getScheduleGroupKey
        │     键 = 直达|中转 + groupName
        │
        ├─ 组内去重 船名$航次（保留更早 ETD）
        │     组内按 ETD 升序
        │
        └─ 方案列表按星期一→星期日，同日再按最近离港，平票才按 groupName
```

二次筛选（直达/中转 Tab、船公司、标准码头、关键词、排序）只作用于这次已拉取的 `allItems`，不再请求接口。

## 2. 什么算同一张方案（分组键）

**进键（相同则合并）：**

| 组成 | 取值 | 说明 |
| :-- | :-- | :-- |
| 直达 / 中转 | `item.isTransit` 为真 → `transit`，否则 `direct` | 直达 `CNC` 与中转 `CNC` 是两张卡 |
| `groupName` | 见下一节 | 共舱服务身份 |

比较时两者都做 trim + 大写。

**不进键（相同服务仍合并）：**

| 字段 | 卡片上怎么用 |
| :-- | :-- |
| `routeEtd` / 实际 ETD 推出来的星期 | 只展示，取组内**众数**；平票取星期一→星期日更靠前的 |
| `totalDuration` / `transitTime` | 卡片展示组内**最大值** |
| 起运/目的码头 | 只用标准化短名 `*TerminalCn` 的众数；原文不拆组；全空显示 — |
| 中转港路径 `transits` | 不拆组；详情抽屉才展示 |

第一版工作台曾把星期、航程、码头、中转港都放进键，同一服务会拆成几十张「1 个班次」的卡。现行规则禁止再把这些放进键。

## 3. `groupName` 怎么拼

令牌格式：有航线代码 → `船公司(航线)`，例如 `ONE(NPI)`；没有航线 → 只写船公司，例如 `RCL`、`CMA`。

1. **`shareCabins` 非空：** 只用共舱数组里的 `carrier` + `routeCode`，**不要**再并入本班次的 `carrierCd(routeCode)`。班次上的航线代码经常和共舱里的本线代码不一致，并进去会拼出 `ONE(PS3)/ONE(NPI)` 这种脏串，把本该一组的班次拆开。
2. **没有共舱：** 退回本班次 `carrierCd` + `routeCode`。
3. 空串丢掉；大小写不敏感去重，保留第一次出现的大小写。
4. 按英文字母序 `localeCompare(..., 'en')` 后用 `/` 拼接。

例子：

| 班次 | 共舱 | `groupName` |
| :-- | :-- | :-- |
| ONE / NPI | JINJIANG(NWX)、KMTC(NWX)、MSK(FI3)、ONE(NPI) | `JINJIANG(NWX)/KMTC(NWX)/MSK(FI3)/ONE(NPI)` |
| ONE / SPS | （空） | `ONE(SPS)` |
| RCL / （空） | （空） | `RCL` |
| CNC / KCS | （空） | `CNC(KCS)` |

共舱列表不全的班次会得到更短的 `groupName`，无法与完整共舱串合并，会多出一组。这是扁平接口重建的固有缺口。

## 4. 清洗与去重

**进组前丢掉：**

- `vessel` 为空或纯空白
- 船名（小写后）等于 `feeder`
- 船名包含 `to be` 或 `tbn`

飞驼展开方案后也会丢掉这三类。无船名的卡车班次（`transportMode=TRUCK`）因此不会出现在本地方案里。

**组内去重：** `normalize(船名)$normalize(航次)`。同一键保留 ETD 更早的一条（无 ETD 再看 `staticEtd`）。去重后再按 ETD 升序，供班次表展示。

## 5. 方案卡展示（不影响是否同组）

| 卡片位置 | 算法 |
| :-- | :-- |
| 星期 | 卡片只写众数 `departureDay`（周一），与「按周班」排序键相同；组内其它班期不写在折叠卡上，不拆组 |
| 直达/中转 · N 班 | 组的 `isTransit` + 去重后班次数；Tag 在共舱名左侧 |
| N 天 / N-M 天 | 组内 `min(totalDuration ?? transitTime)`-`max(...)`；相同则只显示一个数。「航程最短」排序用最小值 |
| 码头 | 标准化短名拼成 `起运 → 目的`；缺一侧只显示有值的那头，两端都空则不占位 |
| 最近离港 / 截关 | 组内最早 ETD、最早 `cyCutoff`，卡片用 `MM-DD`；截关有钟点时与日期同一行 |
| 主标题 | 该组 `groupName`；点击复制。中转不再在折叠卡上写「经 xx」 |
| 班次表 | 原生 `table`；船名、航次分列，船名旁 i 悬停看 MMSI/IMO/呼号等标识；计划离到港仍拆成日期+时间两行；截关时间一行（`YYYY-MM-DD HH:mm`）；延误写「延误 N 天」。零点不显示时间 |

可同时展开多组对照。查询后不自动展开、不清空二次筛选。

默认方案排序：星期一 → 星期日，同日按最近离港，平票再按 `groupName`。筛选区可改成最早/最晚离港、航程最短。

## 6. 二次筛选（先滤班次再重新分组）

| 条件 | 匹配 |
| :-- | :-- |
| 直达 / 中转 Tab | `item.isTransit` |
| 船公司 | 本班 `carrierCd` 或任一共舱 `carrier`（不含 SCAC，避免 NSS/NSSC 双选项） |
| 起运/目的码头 | 只比 `*TerminalCn` |
| 关键词 | 船名、航次、航线、港口、`groupName`、中转港、共舱船公司等拼成大写串后包含匹配 |

码头筛选项也只来自标准化短名，空码头不进下拉。

## 7. 飞驼港到港页实际怎么分组

对方页面 `#/schedule/p2p` 不拿扁平班次自己归组。前端 `getScheduleGroups` 打：

```text
GET /application/schedule/p2p/group
  polCode / podCode / etd
  weeksOut=8
  pageNum=1  pageSize=200
  isTransit=0 | 1     ← 直达、中转各打一次
  displayGroup=可选   ← 展开某一张卡时带上，content 变成班次
```

返回已经是方案：`groupName`、`routeEtd`（一张卡一个计划星期）、`maxDuration`、标准码头短名、`count`。同一次 `isTransit` 里 `groupName` **不重复**，所以对方的键也是 **直达|中转 + groupName**；星期、码头、航程只是卡片属性。

卡片外层那个星期、那个航程，是方案接口给的**服务说明书**（这条共舱计划周几开、对外标几天），不是把 8 周班次再汇总。展开后班次经常对不上卡片：`CNC(KCS)` 卡片 `MON`、9 班全是 `FRI`；`CMA(IEX)/…` 卡片 `SUN`、班次全是 `MON`；航程字段名叫 `maxDuration`，也不等于组内 `totalDuration` 的最大（`IAL(NFS)/…` 卡片 9 天，展开班次 9–13 天）。本地没有这套方案属性，只能从班次反推，所以卡片会列出全部星期、航程写成最短–最长。

`groupName` 拼法与本地几乎同一套，但航线代码取共舱里的 **`displayName`（标准航线）**，没有才退回 `routeCode`。本地 `getGroupName` 用的是原始 `routeCode`，所以会出现同一组两种拼写：`KMTC(FEM2)` vs `KMTC(FME2)`、`ONE(ALX3)` vs `ONE(AX3)`。这不是拆组，是令牌字母不同。

展开班次走同一接口加 `displayGroup`。扁平 `/vessel2/v2/schedule` 是另一条线（本仓库 `QueryScheduleAsync` 转的就是它）；`solutionCode` 每条班次都不同，对方不用它当分组键。

## 8. 与飞驼方案列表的已知差异

总数可以对齐到同一量级；直达/中转计数不必逐张相等。青岛 CNTAO → 新加坡 SGSIN、8 周，ETD 2026-09-01 与 2026-09-02 两次对照口径相同：

|      | 飞驼方案列表 | 本地重建 |
| :--- | :----------- | :------- |
| 直达 | 46           | 47       |
| 中转 | 16           | 15       |
| 合计 | 62           | 62       |

2026-09-02 当场用扁平 635 条按本地规则重建，与方案列表对键：59 组完全相同，剩下 3 对不是「算错直达/中转」：

1. **飞驼多一张中转 `CNC`：** 8 条全是卡车、船名航次为空。扁平接口**有这批**（当天 19 条 TRUCK 全是空船名），本地 `isUsableScheduleItem` 丢掉无船名所以没卡。本地直达另有海船 `CNC`，飞驼直达同样有。
2. **本地多一张直达 `WHL(AA1)`：** 万海 AA1，船 `WAN HAI 360` / 航次 `W030`，航程 52 天。扁平有；对方列表 46 张卡里没有，但 `displayGroup=WHL(AA1)` 仍能展开到这条。同日列表上另有 `WHL(PM1)`（同船 `W031`，也是 52 天）。这是对方方案列表的过滤，扁平重建复现不了。
3. **航线代码标准名：** `IAL(CI5)/KMTC(FEM2)/WHL(CI5)` 与 `HMM(NW3)/HPL(TPM)/ONE(ALX3)` 在飞驼列表上；本地因用原始 `routeCode` 写成 `FME2` / `AX3`。共舱对象上 `displayName` 已经是标准写法。

卡片星期飞驼用方案上的单个 `routeEtd`，本地也只写众数一个星期（不再列组内全部班期），可能差一天。组内班次数也可以更多：对方展开后还会再滤，本地是清洗后有的都进组。

要对齐中转 16，需要接方案接口，或允许无船名/TRUCK 进组（方案卡会出现空船名，和「点船名看定位」冲突）。`groupName` 若改用 `displayName`，那两张「拼写不同」的卡会并进对方同名组。

## 9. 源码入口

| 步骤 | 函数 |
| :-- | :-- |
| 清洗 | `isUsableScheduleItem` / `sanitizeScheduleItems` |
| 共舱串 | `getGroupName` / `formatCarrierRoute` / `uniqueCarrierRoutes` |
| 分组键 | `getScheduleGroupKey` |
| 卡片展示 | `groupSchedules`、`formatGroupWeekdays`、`pickGroupWeekday`、`pickGroupTerminal`、`dedupeByVesselVoyage`、`formatDurationFigure`、`formatTerminalPath`、`formatDelayLabel`、`getVesselHoverFields` |
| 筛选 | `filterSchedules` |
| 查询与展示 | `src/views/schedule-query/list.vue` |

跑单测：`npx vitest run src/views/schedule-query/data.test.ts --mode development`（必须带 `--mode development`，否则 vitest 加载品牌 Loading 图失败）。
