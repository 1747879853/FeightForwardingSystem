---
title: 空运出口列表搜索：未填写开关宽度与移除明细区间筛选
module: 空运出口
author: auto-doc-sync
last_updated: 2026-08-09
---

# 1. 背景意图 (Background)

**白话解释：** 空运出口列表搜索区里，航班/起运地/中转地/目的地/订舱代理的「未填写」Switch 被表格搜索表单默认的 `w-full` 拉满整列，视觉错乱。同时产品不再需要泡比、件数、重量、长宽高、体积、体积重、计费重等带 ≥/≤ 的货物明细区间筛选，从搜索 schema 中移除。

# 2. 核心逻辑变更 (Core Logic)

## 2.1 「未填写」Switch 宽度

- `createEmptySwitchSchema` 的 `componentProps` 增加 `class: 'w-auto'`，覆盖 Vxe 表格搜索表单 `commonConfig.componentProps.class: 'w-full'`，Switch 保持自身宽度。

## 2.2 移除明细区间筛选

- 删除 `createCtnRangeSchema` 辅助函数及其在 `useGridFormSchema` 中的全部展开（`BubbleRatio*`、`CtnPKGS*`、`CtnKGS*`、`CtnLength*`、`CtnWidth*`、`CtnHeight*`、`CtnCBM*`、`CtnVolumeWeight*`、`CtnChargeWeight*`）。
- 接口入参类型仍保留对应可选字段，仅前端不再提供入口。

# 3. 避坑指南 (Blockers)

> [!IMPORTANT]
>
> 1. **表格搜索表单默认全宽：** `use-vxe-grid` 的 `commonConfig.componentProps.class` 为 `w-full`；Switch / Rate 等定宽控件需在 schema 里显式 `w-auto` 覆盖。
> 2. **区间筛选已下线：** 文档与文案中勿再描述「货物明细八个区间筛选」；后端若仍接收 Start/End 参数，仅表示兼容，前端不再传。

# 4. 变更日志 (Changelog)

| 日期 | 变更类型 | 业务功能变动 | 代码解析与架构洞察 |
| :-- | :-- | :-- | :-- |
| 2026-08-09 | `Fix` | 「未填写」Switch 不再铺满列宽；移除泡比/件数/重量等 ≥≤ 明细区间查询 | 改动集中在 `air-export-admin/data.ts` 的 `useGridFormSchema` |
