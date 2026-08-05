# 变更记录：分页下拉已选项注入策略与搜索防抖

## 背景意图

- 业务表单常用精简 `selectedItems`（如仅 `id` + `portName`）做关闭态回显，但公共 `usePagedSelect` 会把已选项永久注入候选列表：关键词搜索无关项时已选项仍固定出现，且残缺字段会覆盖接口返回的完整 option，导致下拉两行展示缺 EDI/国家/中文名。
- `PortSelect` 只要收到带 id 的 `selectedItems` 就记入 `loadedSelectedIds`，阻断了详情补全。
- 关键词搜索每次按键都立即触发接口，请求过密。

## 核心技术决策/逻辑变更

- 修改 `apps/web-antd/src/adapter/component/biz-select/use-paged-select.ts`：
  - **有关键词时**：不把 `pinnedCache` / `selectedItems` 注入返回列表；搜索结果命中已选 id 时用完整数据升级 pin。
  - **无关键词 / 下拉关闭**：继续 pin + 合并，保证关闭态 label 回显。
  - **merge**：新增 `completeValues` 与 `mergeSelectedItems(items, { complete })`；分页/详情完整数据不可被精简回显项降级。
  - `pinnedCache` key 统一为 `String(value)`，去掉对 ID 的 `Number()` 回退查找。
  - 新增 `searchDebounce`（默认 300ms）：输入框即时回显，实际改关键词发请求防抖；关闭下拉与组件卸载时取消挂起定时器。
- 修改 `apps/web-antd/src/adapter/component/biz-select/port-select.vue`：
  - `isDisplayComplete`：字段不齐时不标记已加载，仍走 `getPortCodeDetail`，并以 `{ complete: true }` 合并。
  - `line1`/`line2` 用 `filter(Boolean).join(...)`，避免残缺数据出现 `/QINGDAO`、`/` 之类文案。

## 避坑指南（Gotchas & Constraints)

- `selectedItems` 只保证关闭态 label；下拉两行完整展示依赖分页接口或详情补全，不要假设精简回显对象等于完整 option。
- 搜索态已选项不在候选列表中时，关闭态 label 依赖 ant-design-vue `vc-select` 的 value→label 缓存，以及 pin 在清空关键词后的恢复。
- 其他 biz-select 若也用精简 `selectedItems` 且存在「阻断详情」逻辑，需按 `PortSelect` 同样判断字段齐全后再写入 `loadedSelectedIds`，详情合并传 `{ complete: true }`。
- `searchDebounce: 0` 可关闭防抖；连续输入时勿在业务层再套一层防抖，避免双重延迟。
