# vxe 列表排序箭头方向修复

## 背景意图

用户点击列头降序箭头时期望直接降序排序并高亮下箭头，但实际请求为升序且上箭头高亮，属于全站分页列表远程排序的交互缺陷。

## 核心逻辑变更

- `paged-list-query.ts` 新增 `applySortClick`：根据 vxe `proxySortList` 中的目标 `order`（`asc`/`desc`）更新会话排序，而非对新列固定追加升序。
- `resolveEffectiveSortList` 在检测到列头点击时，以 `sessionList`（为空时回退 `defaultList`）为基准调用 `applySortClick`。
- 再次点击已激活箭头时 vxe 会 `clearSort` 并传空 `sorts`，须清空 session 而非回退旧会话。
- 远程排序强制 `allowClear: true`，与 vxe 箭头取消行为对齐。

## 避坑指南

1. 排序状态以 vxe 传入的 `params.sorts` 为准，勿在页面层自行 toggle。
2. 有 `defaultSort` 的列表在未写入 session 前，点击其他列应基于默认排序链叠加，而非从空列表开始。
