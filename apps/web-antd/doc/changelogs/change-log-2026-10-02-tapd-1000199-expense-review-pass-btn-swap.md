# TAPD #1000199 应收应付审核：审核全部 / 审核选中换位

## 背景意图

费用审核明细操作区 DropdownButton 主按钮为「审核全部」、下拉为「审核选中」，与顶部任务列表工具栏（主按钮「审核选中」）不一致；按缺陷要求对调位置。

## 核心逻辑变更

- 明细区主按钮改为「审核选中」（点击走 `selectPass`）
- 下拉首项改为「审核全部」（`key="all"` → `allPass`），应收/应付通过仍在下拉中

## 涉及文件

- `views/audit-approval/expense-all/modules/detail.vue`
