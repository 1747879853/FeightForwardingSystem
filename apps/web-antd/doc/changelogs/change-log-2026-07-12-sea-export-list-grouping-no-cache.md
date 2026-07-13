---
title: 海运出口列表分组不缓存（每次进入都拉取）并修复首屏默认分组只剩「全部」
date: 2026-07-12
type: Fix
module: 海运出口
page: /sea-exports (SeaExportList)
---

# 背景意图

海运出口列表路由 `SeaExportList` 开启了 `keepAlive`，切走再回到列表标签页时组件不会重新挂载。此前分组统计数据仅在「顶部搜索条件签名变化」时才刷新，导致两个问题：

1. **分组数据被缓存**：从其他页面/标签重新进入列表时，看到的分组 Tab 条数仍是上次的旧数据，未反映最新库存。
2. **首屏默认分组只剩「全部」**：第一次进入网站、且用户持久化过默认分组字段（如「船公司」）时，分组 Tab 只显示「全部」、拉不到分组明细。

根因是首屏存在竞态：分组字段的恢复原先在 `useListGrouping` 自己的 `onMounted` 中异步进行（要 `await` 用户配置 store），它与列表首查（`list.vue` 的 `onMounted → submitForm`）互相竞速。若首查先跑，此时 `enabledField` 尚未恢复，`decorateListParams` 直接 `return`、不会拉取分组；而恢复流程内部自行触发的 `query()` 又无法稳定地补拉分组，最终分组统计为空。

# 核心逻辑变更

## 1）分组恢复改为「状态先行、由列表页统一触发首查」，消除竞态

改动位于通用组合式函数 `apps/web-antd/src/components/list-grouping/use-list-grouping.ts`：

- 移除组合式函数内部自动执行的 `onMounted` 分组恢复逻辑。
- `applyField(value, shouldPersist, skipQuery = false)` 新增 `skipQuery` 参数：为 `true` 时只设置分组字段状态、禁用互斥搜索项，但**不触发列表查询**。
- 新增并导出 `restorePersistedField()`：异步读取持久化的分组字段，仅以 `skipQuery` 方式恢复状态（不查询）。

`apps/web-antd/src/views/sea-export-admin/list.vue` 的 `onMounted` 时序改为确定性顺序：

```
写入会计期间默认值 → await grouping.restorePersistedField() → await submitForm() 首查
```

这样首查时 `enabledField` 已就位，`decorateListParams` 会在同一次查询中把分组数据一并拉取，彻底避免「恢复 vs 首查」竞态。

## 2）分组统计不做缓存，每次重新进入列表都刷新

- `decorateListParams` 中记录最近一次列表查询使用的基础搜索参数 `lastBaseParams`。
- 新增并导出 `refreshGroupData()`：复用 `lastBaseParams` 强制重新拉取分组数据（**不改变当前选中的分组项**，仅刷新统计），未启用分组时为空操作。
- `list.vue` 引入 `onActivated`，每次重新进入（激活）列表页调用 `grouping.refreshGroupData()` 拉取最新分组数据；用 `firstActivate` 标记跳过首次激活（首次激活与 `onMounted` 首查重合），避免重复请求。

# 避坑指南

- **恢复必须在首查之前，且不能自己触发查询**：`restorePersistedField()` 用 `skipQuery: true` 只设状态，首查统一由列表页 `submitForm` 完成。若让恢复自行 `query()`，会与首查竞速并重复请求，正是本次要根除的问题。
- **`refreshGroupData()` 依赖 `lastBaseParams`**：它复用「最近一次列表查询」的搜索参数，因此至少要在一次列表查询之后（`decorateListParams` 已执行）调用才有意义；`onActivated` 首次触发被刻意跳过，正是因为此时 `lastBaseParams` 可能尚未落地。
- **只刷新分组、不动列表数据**：`refreshGroupData()` 不改选中项、不重查列表，符合「分组统计不缓存」的诉求，同时保持列表数据沿用既有 keepAlive 刷新策略（仅表单保存返回时刷新）。
- **该组合式函数目前仅被 `sea-export-admin/list.vue` 使用**：调整对外方法（去掉自动 `onMounted` 恢复、改由 `restorePersistedField` 显式恢复）已同步更新唯一调用方；后续新列表接入时须记得在挂载时机显式调用 `restorePersistedField()`。
