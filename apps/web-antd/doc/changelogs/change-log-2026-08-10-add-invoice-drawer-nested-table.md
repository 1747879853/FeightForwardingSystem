# 添加开票结算明细抽屉改用 NestedDataTable 并调整布局

## 背景意图

「添加开票结算明细」仍用双层 Ant Table，搜索区「开票申请单号」标签易换行，确认添加与查询挤在一起，且缺少已选数量反馈。

## 核心逻辑变更

- 嵌套表格改为 `NestedDataTable`（外层开票申请、内层费用明细 + 勾选）。
- 搜索标签 `labelWidth` 提到 96，并加 `whitespace-nowrap`，避免「开票申请单号」换行。
- 查询按钮紧跟搜索表单下方靠右；「确认添加」放到 Drawer footer 右下角。
- 表格上方展示对齐付费申请选费弹窗：`已选 N 笔` + 按币别汇总本次结算净额（如 `RMB 1,234.00`）。
- `NestedDataTable` 的 `innerHeaderCell` 增加 `parentRecord`，支持组内全选。

## 避坑指南

- 已存在于本单的开票明细仍禁用勾选（`selectedItemIds`）。
- 银行流水页内嵌的「选择开票申请并创建发票结算」面板未同步改版，勿混用预期。
