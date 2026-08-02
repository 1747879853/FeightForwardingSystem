# 海运出口列表：搜索表单改为手动查询

## 背景意图

`/sea-exports` 列表原先 `submitOnChange: true`，修改任一搜索条件约 300ms 后就会自动打列表接口，条件较多时请求频繁、也干扰用户连续改条件。改为点击「查询」再触发；初次进入与从详情/表单返回刷新仍自动查。

## 核心逻辑变更

- 文件：`src/views/sea-export-admin/list.vue`
- `formOptions.submitOnChange`：`true` → `false`
- `handleReset`：清空全部条件（含会计期间）且不查询；不再临时开关 `submitOnChange`
- **仍自动查询的场景：**
  - 初次打开：`onMounted` 写入默认会计期间后 `submitForm` 首查
  - 从表单返回：`useRefreshListOnFormReturn('SeaExportList', handleRefresh)` 在保存后返回时 `gridApi.query()`

## 避坑指南

- `gridApi.query()` 使用「最近提交值」；用户改了条件但未点查询时，分页/排序/分组刷新仍按上次提交条件，属预期。
- 「重置」只清空表单、不查；需再点「查询」才按空条件加载。
