# 业务联系单箱型选择改为从 option 取名称

- 日期：2026-07-25
- 类型：Perf
- 影响页面：`/pre-order/add`、`/pre-order/:id/edit`
- 关联组件：`CtnSelect`

## 一、背景意图

选箱型后原本会再调一次 `getCtnCodeDetail`，只为拿到 `ctnName` 给费用「单位」联动用。下拉 option 里已有名称，多打详情接口多余。

## 二、核心逻辑变更

1. `adapter/component/biz-select/ctn-select.vue`
   - `mapCtnToOption` 增加 `raw`（完整箱型 DTO）。
   - `handleChange` 从当前 options 匹配选中项，额外 `emit('change', value, option)`。
2. `views/pre-order/modules/ctn-table.vue`
   - 监听 `@change`，用 `option.raw.ctnName` / `option.label` 写 `ctnCodeName`，去掉选中时的详情请求。
   - 回显传 `selected-items`，避免 `CtnSelect` 内部 `ensureSelectedLoaded` 再拉详情。
   - 详情回显 watch 仅从嵌套 `ctnCode.ctnName` 补名称，不再请求接口。
3. 第二轮修复：`ensureSelectedLoaded` 改为缓存优先（用户反馈选中仍会触发详情）
   - `use-paged-select.ts` 对外暴露 `findCachedOption`（查分页缓存 + pinned 缓存，兼容 number/string 键）。
   - `ctn-select.vue` 的 `ensureSelectedLoaded` 先查 `findCachedOption`，命中即跳过 `getCtnCodeDetail`；详情请求只剩「编辑回显且父级未提供任何名称」这一种兜底场景。
   - `ctn-select.vue` 补传 `selectedValuesRef: modelValue`，下拉关闭重置缓存时已选 option 会被 pin 住，不再被清空。
4. 第三轮修复：选中仍触发 `DetailAsync?Id=雪花ID` 的根因
   - 请求层 `json-bigint storeAsString` 后箱型 id 是 **string**；`ctn-table` 原先 `Number(value)` 既丢精度，又让 Select 内部 string→number 抖动，表格 cell 重挂载后 `loadedSelectedIds`/分页缓存全空，兜底详情被再次触发。
   - `handleChange` 改为先 `pinSelectedFromOptions` + `mergeSelectedItems(raw)` 再改值；`ensureSelectedLoaded` 增加 getOptions 判断与 `nextTick` 二次确认。
   - `ctnSelectedItems` 只要有 id 就回传（不再要求已有名称），重挂载时即可标记已加载、跳过详情。
   - `handleCtnChange` 保留原始 id（string/number），禁止 `Number()`。

## 三、避坑指南

- 费用单位匹配依赖 `ctnCodeName`；若 option 未命中（极端情况），名称会为空，费用侧退回手填，不会报错。
- 其他页面若也要箱型名，优先听 `CtnSelect` 的 `change` 第二参，不要再调详情。
