---
title: 空运出口列表搜索：移除未填写开关与明细区间筛选
module: 空运出口
author: auto-doc-sync
last_updated: 2026-08-09
---

# 1. 背景意图 (Background)

**白话解释：** 空运出口列表搜索区不再需要航班/起运地/中转地/目的地/订舱代理的「未填写」开关，也不再需要泡比、件数、重量、长宽高等带 ≥/≤ 的货物明细区间筛选。精简搜索 schema，降低干扰。

# 2. 核心逻辑变更 (Core Logic)

## 2.1 移除「未填写」开关

- 删除 `createEmptySwitchSchema` 及其在 `useGridFormSchema` 中的全部展开（`FlightNoEmpty`、`POLIdEmpty`、`POTIdEmpty`、`PODIdEmpty`、`BookingAgentIdEmpty`）。
- 航班、机场下拉、订舱代理恢复为普通输入/选择，不再与 Empty 开关互斥禁用。
- 分组统计仍保留 `emptyParamKey`：点击分组项「未填写」时仍会追加 `*Empty: true` 查询参数。

## 2.2 移除明细区间筛选

- 删除 `createCtnRangeSchema` 及全部区间字段（`BubbleRatio*`、`CtnPKGS*`、`CtnKGS*`、`CtnLength*`、`CtnWidth*`、`CtnHeight*`、`CtnCBM*`、`CtnVolumeWeight*`、`CtnChargeWeight*`）。
- 接口入参类型仍保留对应可选字段，仅前端不再提供入口。

# 3. 避坑指南 (Blockers)

> [!IMPORTANT]
>
> 1. **分组「未填写」≠ 搜索开关：** 搜索表单已无 Empty 开关，但分组 Tab 点击「未填写」仍走 `emptyParamKey`，勿一并删掉 `list.vue` 里的分组配置。
> 2. **区间筛选已下线：** 文档与文案中勿再描述「货物明细八个区间筛选」；后端若仍接收 Start/End 参数，仅表示兼容，前端不再传。

# 4. 变更日志 (Changelog)

| 日期 | 变更类型 | 业务功能变动 | 代码解析与架构洞察 |
| :-- | :-- | :-- | :-- |
| 2026-08-09 | `Fix` | 搜索区移除五个「未填写」开关与全部 ≥≤ 明细区间查询 | 改动集中在 `air-export-admin/data.ts` 的 `useGridFormSchema`；分组 `emptyParamKey` 保留 |
