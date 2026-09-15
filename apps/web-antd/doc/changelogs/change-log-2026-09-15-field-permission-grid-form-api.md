---
title: 列表字段权限不再在挂载前调用空 formApi
date: 2026-09-15
module: other
---

# 背景意图

`usePermissionGrid` 的 `immediate` watch 直接调用 `gridApi.formApi.setState`。`VxeGridApi.formApi` 要等表格 `onMounted` 才挂上，setup 阶段是空对象，海出/海进/空出等列表一进页就报 `setState is not a function`。

# 核心逻辑变更

1. **挂载前不碰空 formApi：** `formApi.setState?.(...)`，未挂载时跳过。
2. **筛选 schema 改写网格状态：** 同步 `setState({ formOptions: { schema } })`，表格内部对 `formOptions` 的 watch 会在真实 form 就绪后生效。
3. **初始 options 先过滤一遍：** 规则缓存已在时，首屏筛选项不再等二次 watch。

# 避坑指南

- 不要在 `useVbenVxeGrid` 返回后立刻访问 `formApi` 的实例方法；`formApi` 初始值是 `{}`。
- 列表筛选项显隐应改 `formOptions.schema`，不要假定 setup 阶段就能 `formApi.setState`。
- 表格挂载后的查询/重置仍走真实 `formApi`，本轮只修权限包装层。
