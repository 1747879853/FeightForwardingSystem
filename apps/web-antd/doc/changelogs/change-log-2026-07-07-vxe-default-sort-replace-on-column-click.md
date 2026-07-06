# 修复 defaultSort 下列头排序叠加默认字段

## 背景意图

海运出口等配置了 `defaultSort: 'CreationTime DESC'` 的列表，用户点击「委托单位」等列排序时，请求参数变为 `CreationTime DESC, TransportOrder.Client.Name DESC`，创建时间始终占首位，导致用户感知的列排序「失效」。业务期望：首次点击非默认列应完全替换默认排序；已有用户排序会话后仍支持多列叠加。

## 核心逻辑变更

- 在 `resolveEffectiveSortList`（`src/utils/paged-list-query.ts`）中，当 `sessionList` 为空且存在 `defaultSort` 时，检测 vxe proxy 相对 `defaultList` **新增的字段**；若存在则仅保留最新新增列的排序并写入 session，不再以 `defaultList` 为基底做 `applySortClick` 追加。
- 用户显式点击/切换 `defaultSort` 所含列（如创建时间）时，仍走原有 `applySortClick(defaultList, …)` 分支；取消全部排序后仍回退 `defaultSort`。

## 避坑指南

1. **vxe 多列 proxy**：`defaultSort` 激活时点击其他列，proxy 常同时携带默认列与新列；须按「相对 default 新增字段」识别点击列，不能直接用 `findClickedSortField([], proxy)`（会先命中默认列）。
2. **多列叠加时机**：仅当 session 已有用户排序后再点第三列才叠加；从默认态直接点非默认列不会保留 `CreationTime`。
3. **无 defaultSort 列表**：逻辑不变，首次点击仍只产生单列排序。
