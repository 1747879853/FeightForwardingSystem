# 空运出口起飞日期列头排序高亮

## 背景意图

空运出口列表默认按起飞日期倒序，但列头升降序箭头经常不亮。用户再点「起飞日期」排序，箭头仍然没有高亮。请求其实已按 `TransportOrder.ETD` 排，只是表头状态被冲掉或同步错了。

## 核心逻辑变更

- 点击列头后不再 `clearSort()` 再 `sort()`。远程排序下 `clearSort()` 会再打一枪空 `sorts`，会话被当成「取消排序」清掉，默认排序列（起飞日期）看起来就像点了没高亮。
- 统一用 `setSort(..., false)` 只改列头箭头，不触发二次查询。
- 字段权限异步换列后，按当前 `sortConfig.defaultSort` 补回箭头。空运出口、海运进出口等权限包装列表都会受益。

## 避坑指南

- `defaultSort` 必须写前端列字段 `transportOrder.etd`。写成 `TransportOrder.ETD` 时 `pascalToCamel` 会变成 `transportOrder.eTD`，VXE 对不上列，箭头永远不亮。
- 后端排序仍走 `AIR_EXPORT_SORT_FIELD_MAP` → `TransportOrder.ETD`，不要把后端路径写进列 `field`。
- 程序里同步表头排序不要调用 `clearSort()`；只允许用户再次点击已激活箭头时由 VXE 自己 clear。
