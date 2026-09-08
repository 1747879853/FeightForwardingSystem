---
title: 列表数据变更后同步刷新分组统计
date: 2026-09-08
type: Fix
module: 共享能力 / 列表分组
page: 海出/海进/空出/业务联系单/提成/银行流水/进项发票/费用审核/提成审核
---

# 背景意图

接入 `useListGrouping` 的列表页，分组 Tab 条数原先只在两类时机刷新：

1. 顶部搜索条件签名变化（`decorateListParams` 内调用 `refreshGroups`）
2. keepAlive 列表重新进入（`onActivated` → `refreshGroupData()`）

删除、复制返回、审核通过/驳回、进项发票拉取成功等**数据变更**只会重查列表，不重拉 `GetGroupedListAsync`。例如删掉一行后，当前分组 Tab 仍显示旧条数。

根因不在 composable：`refreshGroupData()` 早已导出，且未启用分组时是空操作。缺的是各列表在「刷新列表」路径上显式调用它。

# 核心逻辑变更

不改 `use-list-grouping.ts`。各列表在刷新表格后追加 `grouping.refreshGroupData()`，复用最近一次列表查询的 `lastBaseParams`，**不改变当前选中的分组项**。

| 页面 | 调用点 |
| :-- | :-- |
| 海运出口 / 海运进口 / 空运出口 / 业务联系单 / 销售提成 / 操作提成 | `handleRefresh`（工具栏刷新、删除成功、表单返回刷新等共用） |
| 银行流水 | `handleRefresh`；删除成功由直接 `gridApi.query()` 改为走 `handleRefresh()` |
| 进项发票 | `handlePullSuccess`（拉取成功后） |
| 费用审核 | 审核成功路径 `gridApi.reload()` 之后 |
| 提成审核 | `reloadGrid`（`gridApi.reload()` 之后） |

# 避坑指南

- **不要改 composable 去「每次 query 都刷分组」**：点击分组 Tab 本身就会 `query()`，若在 `decorateListParams` 无条件刷新，会在切 Tab 时多打一次分组接口，且搜索条件没变。
- **必须走已有的 `refreshGroupData()`**：它读 `lastBaseParams`，数据变更不改搜索条件，因此安全；未开分组直接 return，不会多请求。
- **删除成功不要只 `gridApi.query()`**：银行流水原先删除成功只重查列表，分组条数仍过期；要与工具栏刷新走同一条 `handleRefresh`。
- **`refreshGroupData()` 依赖至少一次列表查询**：`lastBaseParams` 在 `decorateListParams` 落地后才有意义。本批调用都发生在已有列表查询之后，与 `onActivated` 跳过首次激活是同一约束。
