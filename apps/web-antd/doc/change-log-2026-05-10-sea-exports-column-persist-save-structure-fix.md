# sea-exports 列配置保存结构修复（全量显隐）

## 背景意图

- 调试日志显示远端配置可加载，但 `setting` 仅包含单列（例如仅一个 `visibleColumnKeys` 与一个 `columnVisibility`）。
- 结果是刷新后无法还原真实的列显隐状态，表现为“看起来还是不生效”。

## 核心技术决策 / 逻辑变更

- 修复文件：`packages/effects/plugins/src/vxe-table/use-vxe-grid.vue`
- 修复保存采集逻辑 `collectColumnConfigFromGrid`：
  - 运行时列仅用于提取“当前可见列顺序”。
  - 显隐映射改为基于“全量稳定列集合”生成，确保 `columnVisibility` 对所有列都有布尔值。
  - 避免再次出现“只保存可见列，未保存隐藏列 false”的结构性缺陷。
- 增强加载兼容逻辑：
  - 对历史“紧凑型全 true 可见映射”配置，缺失键时按 `visibleColumnKeys` 判定显隐，提升旧数据兼容性。

## 避坑指南（Gotchas & Constraints）

- 列持久化配置必须同时表达“顺序”和“全量显隐”，仅保存可见列会导致刷新时无法还原隐藏状态。
- 保存结构修复后，建议用户再次保存一次列配置，覆盖历史不完整记录。
