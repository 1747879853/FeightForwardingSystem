# 海运出口/进口箱型选择改为从 option 取名称

- 日期：2026-07-25
- 类型：Perf
- 影响页面：`/sea-exports/:id/edit`、`/sea-exports/add`、海运进口对应编辑页
- 关联组件：`order-ctn-table`、`CtnSelect`

## 一、背景意图

海出/海进箱型箱量表选中箱型后，只写了 `ctnCodeId`，未写 `ctnCodeName`。`watch(dataSource)` 触发的 `syncCtnNameMap` 发现缺名称，就会再打一次 `CtnCodeAdmin/DetailAsync`——仅为底部汇总文案（如 `20GP*2`）取名。下拉 option 已有名称，多余。

## 二、核心逻辑变更

1. `sea-export-admin/modules/order-ctn-table.vue`、`sea-import-admin/modules/order-ctn-table.vue`
   - `CtnSelect` 改听 `@change(value, option)`，新增 `handleCtnCodeChange`：同步写入 `ctnCodeId` + `ctnCodeName`（来自 `option.raw.ctnName` / `option.label`），并更新本地 `ctnNameById`。
   - 雪花 ID 原样透传，禁止 `Number()`。
2. `syncCtnNameMap` 保留：仅兜底「详情回显有 id、无名称」场景；选中路径因已有 `ctnCodeName` 直接 continue。

## 三、避坑指南

- 汇总栏依赖 `ctnCodeName` / `ctnNameById`；若 option 未命中，名称可能短暂为空，汇总显示 `-`，不会报错。
- 勿再对箱型选择只绑 `@update:model-value` 写 id；必须同时落名称，否则 `syncCtnNameMap` 会继续打详情。
