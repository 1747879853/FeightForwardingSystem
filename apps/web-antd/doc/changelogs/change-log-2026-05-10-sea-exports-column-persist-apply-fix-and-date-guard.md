# sea-exports 列配置已拉取但未应用修复（含日期格式兜底）

## 背景意图

- `sea-exports` 页面在列配置保存后，刷新时虽然能拉到用户配置，但表格仍按默认列渲染。
- 同时控制台出现 `Error formatting date: Invalid date`，干扰排查与观察。

## 核心技术决策 / 逻辑变更

- 修复列配置“拉到但不生效”根因：
  - 文件：`packages/effects/plugins/src/vxe-table/use-vxe-grid.vue`
  - 调整 `normalizeColumns` 中列标识策略：强制 `column.id = uniqueKey`，不再保留运行时可能不稳定的原始 id。
  - 目的：保证保存和加载都使用同一稳定列 key，避免出现“配置记录存在但匹配不到列”的情况。
- 修复日期格式化控制台报错：
  - 文件：`packages/@core/base/shared/src/utils/date.ts`
  - 对 `'' | null | undefined` 直接返回空串；非法日期也直接返回空串，不再抛错并打印 `console.error`。
  - 目的：避免表格日期空值场景下刷屏报错，降低噪音。

## 避坑指南（Gotchas & Constraints）

- 列持久化的 key 必须稳定，不能依赖运行时动态 id，否则会出现“已保存但重载不生效”。
- `visibleColumnKeys` / `columnVisibility` 的 key 与初始化列 key 必须同源，否则配置只能“成功加载”但无法“正确应用”。
- 日期格式化函数是高频路径，面对空值应优先无异常兜底，避免在列表渲染阶段制造大量无效错误日志。
