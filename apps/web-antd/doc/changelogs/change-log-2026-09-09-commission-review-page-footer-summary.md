# 提成审核列表底部增加当页合计

## 背景意图

审核人浏览提成审核列表时，需要一眼看到当前页提成金额、底薪、最终应发合计，便于批量审核前快速核对金额规模。

## 核心逻辑变更

- `commission-review/index.vue`：查询结果写入 `currentPageData`，底部 `#footer` 展示当页三项金额合计。
- 合计口径与列一致：`commissionAmount` / `baseSalary` / `finalAmount`，直接数值加总后走 `formatAmount`。
- 样式对齐进项发票列表当页合计（空/有数据等高，避免 `Page` footer 测高跳变）。

## 避坑指南

- 只合计当前页 `items`，不要用全量 `totalCount` 或跨页缓存。
- 空列表仍渲染「当页合计：暂无数据」，保持 footer 高度稳定。
