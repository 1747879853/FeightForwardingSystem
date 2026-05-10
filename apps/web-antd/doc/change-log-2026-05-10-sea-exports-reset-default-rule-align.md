# sea-exports 恢复默认规则对齐修复

## 背景意图

- 用户明确“恢复默认”产品语义：
  - 列全显示；
  - 顺序按初始传入列配置；
  - 取消全部固定列。

## 核心技术决策 / 逻辑变更

- 修改文件：`packages/effects/plugins/src/vxe-table/use-vxe-grid.vue`
- 新增 `buildResetDefaultColumns`，在 `customReset` 流程中统一回放：
  - 基于 `originalColumns`（初始传入列顺序）克隆；
  - 叶子列全部设置 `visible = true`；
  - 叶子列全部设置 `fixed = undefined`。
- `resetColumnConfig` 改为使用该结果回写表格列配置，确保恢复默认行为与产品定义一致。

## 避坑指南（Gotchas & Constraints）

- 恢复默认不应直接等同“恢复初始显隐/固定状态”，而应遵循明确的产品规则。
- 顺序来源仍应锚定初始传入列数组，避免因运行时拖拽状态污染“默认顺序”。
