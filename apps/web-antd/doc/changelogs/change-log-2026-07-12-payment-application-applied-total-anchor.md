# 付费申请列表申请合计改为可见锚点列（可拖动/显隐/持久化）

## 背景意图

列表「申请合计」各币别列最初通过列配置面板顶部 Checkbox 总开关控制显隐，随后尝试用「0 宽隐藏锚点列」代理，但该方案与 Vxe 原生布局/拖拽/持久化冲突，导致：取消勾选后仍渲染、相邻「申请人」列无法调宽、拖动排序不生效。

本次将锚点重构为**真实可见列**：由一个稳定字段 `appliedTotal` 承载「首个币别」的申请合计，在列配置面板显示为「申请合计」（唯一开关），表头通过插槽显示「{首个币别}申请合计」；其余币别作为跟随列，显隐/顺序跟随锚点。这样锚点即普通列，可拖动、可调宽、可显隐，且走 Vxe 原生持久化。

## 核心逻辑变更

1. `data.ts`
   - `APPLIED_TOTAL_ANCHOR_FIELD = 'appliedTotal'`：可见锚点列，`slots.header = 'appliedTotalAnchorHeader'`，`params.anchorHeader` 存动态表头文案。
   - `buildAppliedTotalAnchorColumn` / `buildAppliedTotalFollowerColumns`：锚点承载首个币别，其余币别为跟随列（面板隐藏）。
   - `insertAppliedTotalGroup`：将申请合计组默认插入在「应收总额」(`totalReceivePrice`) 之后。
   - `buildColumns`：首次渲染，锚点+跟随列在默认位置。
   - `buildColumnsWithRuntime`：以运行时列（`grid.getFullColumns()`）为唯一数据源，保留静态列与锚点列的显隐/固定/列宽/顺序，按锚点当前位置重新挂接跟随列。
   - `isAppliedTotalChildField`：识别跟随列，供面板 `visibleMethod` 隐藏。
2. `list.vue`
   - `customConfig.visibleMethod` 隐藏各币别跟随列，面板仅保留「申请合计」锚点。
   - `rebuildAppliedTotalColumns`（读运行时列重建，防重入）、`rebuildDefaultColumns`（恢复默认）。
   - `gridEvents`：`custom`（过滤 cancel/close/open；reset 走默认重建，其余走运行时重建）、`customReset`、`columnDropEnd` 触发重建；`watch(tableData)` 翻页重建。
   - 模板新增 `#appliedTotalAnchorHeader` 插槽显示动态表头。

## 避坑指南

- 读运行时列必须用复数 `grid.getFullColumns()`，`getFullColumn()`（单数）返回空会导致锚点显隐始终判为 true。
- 不要在 `customChange`（面板交互中途）触发重建，会覆盖用户暂存勾选、使「确认」失效；仅在 `custom` 提交后重建。
- 锚点须为真实可见列，勿用 `display:none`/`width:0`，否则破坏相邻列布局、调宽与拖拽。
- 跟随列在面板隐藏、不可单独配置，显隐/顺序一律跟随锚点。
