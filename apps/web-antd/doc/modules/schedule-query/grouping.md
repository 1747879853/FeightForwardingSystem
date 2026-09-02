---
title: 船期查询方案分组规则
module: 航线管理
author: auto-doc-sync
last_updated: 2026-09-02
---

# 船期查询方案分组规则

页面 `/schedule`。权威实现：`src/views/schedule-query/data.ts`（`groupSchedules` / `getGroupName` / `getScheduleGroupKey`），单测 `data.test.ts`。查询仍走 `QueryScheduleAsync`，**没有**港到港方案分组接口；方案卡由扁平班次在前端重建。

对照产品（飞驼控制塔港到港页）的列表走 `/application/schedule/p2p/group`，返回的已经是方案。两边规则对齐的是「一张卡代表一条共舱服务」，不是同一接口。

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
        └─ 方案列表按星期一→星期日，同日再按 groupName 英文字母序
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
| 星期 | 分组排序仍用众数 `departureDay`。卡片文案列出组内全部 `routeEtd` 短写（周一、周三），按周一→周日排，不拆组 |
| 直达/中转 · N 班 | 组的 `isTransit` + 去重后班次数；Tag 在共舱名左侧 |
| N 天 / N-M 天 | 组内 `min(totalDuration ?? transitTime)`-`max(...)`；相同则只显示一个数。「航程最短」排序用最小值 |
| 码头 | 标准化短名拼成 `起运 → 目的`；缺一侧只显示有值的那头，两端都空则不占位 |
| 最近离港 / 截关 | 组内最早 ETD、最早 `cyCutoff`，卡片用 `MM-DD`；截关有钟点时再下一行时间 |
| 主标题 | 该组 `groupName`；点击复制。中转不再在折叠卡上写「经 xx」 |
| 班次表 | 原生 `table`；船名+航次同一列；计划离到港/截关拆成日期+时间两行；延误写「延误 N 天」。零点不显示时间 |

可同时展开多组对照。查询后不自动展开、不清空二次筛选。

默认方案排序：星期一 → 星期日，同日按 `groupName`。筛选区可改成最早/最晚离港、航程最短。

## 6. 二次筛选（先滤班次再重新分组）

| 条件 | 匹配 |
| :-- | :-- |
| 直达 / 中转 Tab | `item.isTransit` |
| 船公司 | 本班 `carrierCd` 或任一共舱 `carrier`（不含 SCAC，避免 NSS/NSSC 双选项） |
| 起运/目的码头 | 只比 `*TerminalCn` |
| 关键词 | 船名、航次、航线、港口、`groupName`、中转港、共舱船公司等拼成大写串后包含匹配 |

码头筛选项也只来自标准化短名，空码头不进下拉。

## 7. 与飞驼方案列表的已知差异

总数可以对齐到同一量级；直达/中转计数不必逐张相等。青岛 CNTAO → 新加坡 SGSIN、ETD 2026-09-01、8 周曾对照：

|      | 飞驼方案列表 | 本地重建 |
| :--- | :----------- | :------- |
| 直达 | 46           | 47       |
| 中转 | 16           | 15       |
| 合计 | 62           | 62       |

差在两张卡，不是把同一批班次算进了错误的直达/中转：

1. **飞驼多一张中转 `CNC`：** 8 条全是卡车、船名航次为空。扁平船期接口没有这批陆运；前端清洗也会丢掉无船名。本地直达里另有一组海船 `CNC`（约 5 班），飞驼直达同样有，两边对齐。缺的是**另外那组空船名卡车中转**。
2. **本地多一张直达 `WHL(AA1)`：** 万海 AA1，船 `WAN HAI 360` / 航次 `W030`，航程 52 天。扁平接口有这条，本地就编成方案卡。飞驼**方案列表那 46 张卡里没有 `WHL(AA1)`**——不是底层没有这条船，是他们的方案接口没把这组做成列表上的一张卡。

其余方案名一一对应。个别航线代码拼写以扁平接口为准（如 `AX3` / `ALX3`、`FME2` / `FEM2`），卡片星期取众数，可能和飞驼方案上的 `routeEtd` 差一天。

组内班次数也可以更多：飞驼方案接口还会再滤一层，本地是「清洗后有的班次都进组」。

要对齐中转 16，需要接方案接口，或允许无船名/TRUCK 进组（方案卡会出现空船名，和「点船名看定位」冲突）。`WHL(AA1)` 是否展示取决于对方方案接口的过滤，扁平重建复现不了。

## 8. 源码入口

| 步骤 | 函数 |
| :-- | :-- |
| 清洗 | `isUsableScheduleItem` / `sanitizeScheduleItems` |
| 共舱串 | `getGroupName` / `formatCarrierRoute` / `uniqueCarrierRoutes` |
| 分组键 | `getScheduleGroupKey` |
| 卡片展示 | `groupSchedules`、`formatGroupWeekdays`、`pickGroupWeekday`、`pickGroupTerminal`、`dedupeByVesselVoyage`、`formatDurationFigure`、`formatTerminalPath`、`formatDelayLabel` |
| 筛选 | `filterSchedules` |
| 查询与展示 | `src/views/schedule-query/list.vue` |

跑单测：`npx vitest run src/views/schedule-query/data.test.ts --mode development`（必须带 `--mode development`，否则 vitest 加载品牌 Loading 图失败）。
