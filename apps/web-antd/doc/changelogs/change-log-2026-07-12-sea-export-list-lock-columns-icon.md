# 海运出口列表费用/业务锁定列改显图标

## 背景意图

列表「费用锁定」「业务锁定」原先用 `CellTag` 展示「已锁定/未锁定」文案，列宽占用大、扫读成本高。业务只需一眼区分锁定与否，改为图标即可。

同次一并保证会计期间筛选进入列表时默认当月，且首查真正带上该条件（避免 `autoLoad` 抢跑导致漏默认值）。

## 核心逻辑变更

1. **列渲染**：`data.ts` 中 `transportOrder.feeLocked` / `transportOrder.isBusinessLocking` 由 `CellTag` 改为 slot（`feeLocked` / `businessLocked`），居中、列宽约 90。
2. **图标语义**：`list.vue` 锁定显示红色 `LockKeyhole`，未锁定显示灰色 `LockKeyholeOpen`；`@vben/icons` 新增导出 `LockKeyholeOpen`。
3. **清理**：删除仅服务于上述 Tag 的 `getBooleanTagOptions`。
4. **会计期间默认**：`proxyConfig.autoLoad: false`；`onMounted` 写入当月 `AccountDateRange` 后通过 `formApi.submitForm()` 触发首查，保证分页/排序沿用「最近提交值」中的默认期间。

## 避坑指南

- 勿再对这两列复用布尔 `CellTag` 文案；筛选区仍可用是/否下拉，与列表展示解耦。
- 首查必须走 `submitForm` 而非裸 `gridApi.query()`，否则默认会计期间不会写入最近提交值，后续分页会丢条件。
- `LockKeyholeOpen` 需在 `packages/@core/base/icons/src/lucide.ts` 导出后页面才能从 `@vben/icons` 引用。
