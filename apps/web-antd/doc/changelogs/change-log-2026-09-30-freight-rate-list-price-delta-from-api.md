# TAPD #1000196：运价列表箱型涨跌改读列表接口 costDelta / sugDelta

## 背景意图

运价列表箱型成本、指导价右上角涨跌角标，原先列表查完后按航线再打多次 `GetPagedListAsync` 补历史并在前端算差额。后端已在列表箱型上返回 `costDelta`、`sugDelta`，前端只消费字段。

- [TAPD #1000196](https://www.tapd.cn/61580498/prong/stories/view/1161580498001000196)

## 核心逻辑变更

- 去掉 `list.vue` → `afterFetch` 中的 `enrichFreightListPriceChanges` 补拉。
- 角标读 `items[].seFreiPriceCtns[].costDelta` / `sugDelta`；`null` / `0` 不展示；正数涨红、负数跌绿。
- 删除前端按航线找上一条、算差额的逻辑；保留批量新增用的 `fetchLatestRouteHistory`。
- 详情接口不返回有效差额，详情页本就无角标组件。

## 避坑指南

- 不要再按船公司+港口组合循环调用 `GetPagedListAsync`。
- 批量编辑页涨跌同样读箱型上的 `costDelta` / `sugDelta`，不要再挂 `_priceChange` 映射。

## 关键文件清单

| 文件 | 变更 |
| --- | --- |
| `api/sea-export/freight-rate-admin.ts` | `SeFreiPriceCtnOutDto` 增加 `costDelta` / `sugDelta` |
| `views/freight-rate/list.vue` | 去掉 enrich 补拉 |
| `views/freight-rate/modules/ctn-editable-cell.vue` | 角标读箱型字段 |
| `views/freight-rate/freight-price-change.ts` | 仅保留 `normalizePriceDelta` + 批量新增历史拉取 |
| `views/freight-rate/modules/composables/useBatchAddColumns.ts` | Handsontable 涨跌读箱型字段 |
| `views/freight-rate/batch-add-page.vue` | 去掉 `_priceChange` 透传 |
