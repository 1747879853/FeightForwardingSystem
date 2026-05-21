# 变更记录：分页下拉已选详情合并后刷新选项

## 背景意图

- 港口下拉在编辑回显时会根据 `modelValue` 拉取不在第一页的港口详情。
- 详情接口返回后虽然已合入 `usePagedSelect` 内部缓存，但 `ApiComponent` 自身持有的 options 未刷新，导致外部查看总 options 仍只有第一页 20 条。

## 核心逻辑变更

- 修改 `apps/web-antd/src/adapter/component/biz-select/use-paged-select.ts`：
  - 为公共分页下拉增加 `optionsVersion` 内部版本号。
  - `mergeSelectedItems` 只有在新增缓存项时才递增版本号，避免重复合并触发多余刷新。
  - 将 `optionsVersion` 纳入返回给 `ApiComponent` 的 `params`，让已选详情合并后自动触发一次 options 同步。

## 避坑指南

- 直接修改 hook 内部 `cache` 不等于更新了 `ApiComponent` 的 `refOptions`，必须让其监听到参数变化或显式刷新。
- 版本号只应在新增选项时递增，否则 `api()` 内部合并已选项可能形成重复请求。
