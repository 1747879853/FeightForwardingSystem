---
title: 海运出口对接云当订阅状态字段（列表列 + 编辑页状态联动）
date: 2026-07-11
type: Feature
scope: apps/web-antd
module: 海运出口 / 运踪订阅
---

# 背景意图

海运出口列表（`GetPagedListAsync`）与详情（`DetailAsync`）接口新增两个随 `SeaExportDto` 一并返回的运踪订阅状态字段：

- `isYundangSubscribed`：是否已发起过云当海运运单订阅（存在订阅记录即为 `true`）。
- `isYundangSubscribeSuccess`：当前订阅记录是否订阅成功（对应订阅表 `isSuccess`）。

这两个字段不是独立接口，用于前端控制「订阅 / 重新订阅」入口的展示与禁用。本次将其对接到列表与编辑页。

# 核心逻辑变更

1. **类型层**：`api/sea-export/sea-export-admin.ts` 的 `SeaExportDto` 增加 `isYundangSubscribed?`、`isYundangSubscribeSuccess?`。
2. **状态推导 helper**：`views/sea-export-admin/use-yundang-ocean-subscribe.ts` 新增：
   - `getYundangSubscribeStatus(row)` → `'none' | 'failed' | 'success'`（组合两字段推导：无记录→none；有记录未成功→failed；有记录且成功→success）。
   - `getYundangSubscribeStatusMeta(status)` → `{ color, label }`（default/error/success，文案取 i18n）。
3. **列表**（`list.vue` + `data.ts`）：新增「运踪订阅」状态列，用 `Tag` 通过 slot `yundangSubscribeStatus` 渲染三态（未订阅/失败/成功）；订阅动作完成后调用 `gridApi.query()` 刷新以拿到最新状态。
4. **编辑页**（`basic-info-form/form.vue`）：
   - `loadEditData` 回填 `isYundangSubscribed / isYundangSubscribeSuccess` 到本地 ref。
   - 顶栏：**仅**在已发起过订阅时展示状态 `Tag`（失败/成功）；未订阅不展示 Tag，靠按钮「运踪订阅」表达；按钮文案在 `none→运踪订阅`、`failed→重新订阅` 间切换；`success` 时禁用并给出「已成功订阅」Tooltip。
   - 订阅完成后 `await loadEditData()` 刷新状态。
5. **i18n**：`seaExport.yundang` 新增 `resubscribe`、`alreadySubscribed`、`statusColumn`、`status.{notSubscribed,failed,success}`（zh-CN / en-US）。

# 避坑指南

- 状态是「两字段组合」而非单字段，务必用 `getYundangSubscribeStatus` 统一推导，避免只看单个布尔值。
- 「已发起订阅 ≠ 订阅成功」：失败重试场景会出现 `subscribed=true` 且 `success=false`，此时应显示「重新订阅」而非禁用。
- 列表 toolbar 订阅按钮为批量操作，不随选中行切换文案；单条文案联动只在编辑页。
- 重新订阅（`ResubscribeOceanBillAsync`）与查看动态（`GetOceanPushInfoAsync`）前端 API 尚未落地，本次仅复用既有批量订阅接口做失败重试。
- 订阅/重订成功后必须刷新列表或详情，否则拿不到最新的两个字段。
