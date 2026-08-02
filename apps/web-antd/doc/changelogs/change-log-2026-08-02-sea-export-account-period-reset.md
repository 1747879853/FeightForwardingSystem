# 海运出口列表重置清空会计期间且不自动查询

## 背景意图

- TAPD #0603：会计期间默认当月保留；点「重置」后会计期间应清空，且列表不要自动刷新，需用户再点查询。

## 核心逻辑变更

- `sea-export-admin/data.ts`：去掉 `AccountDateRange` 的 `defaultValue`，避免重置回到当月；首屏默认当月仍由 `list.vue` `onMounted` → `applyDefaultAccountDate` 写入。
- `sea-export-admin/list.vue`：自定义 `handleReset`——清空条件（含会计期间），重置期间临时关闭 `submitOnChange`（约 350ms），避免表单值变化触发自动查询。

## 避坑指南

- `submitOnChange: true` 时，任何表单值变化（含重置）约 300ms 后会 `validateAndSubmitForm`；重置必须先关再开，且等待时长需覆盖 debounce。
- `setValues({ AccountDateRange: undefined })` 需传 `filterFields: false`，否则 merge 可能把 `undefined` 盖回旧值。
