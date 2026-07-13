# 付费申请添加费用父级全选跳过禁选行

## 背景意图

添加费用抽屉中，已加入当前申请单的费用行 Checkbox 禁选，但点击业务行父级全选仍会把禁选费用写入 `selectionMap`，导致禁选行显示为已勾选，行为与单条禁选不一致。

## 核心逻辑变更

1. 新增 `getSelectableGroupFees`：组内仅统计非 `selectedFeeIds` 费用。
2. `isGroupChecked` / `isGroupIndeterminate` 仅基于可选费用计算。
3. `toggleGroup` 全选/取消时只增删可选费用，不再把禁选费用加入选择集。
4. 组内全部费用均已禁选时，父级 Checkbox 禁用。
5. `toggleFee` 对禁选费用直接 return，防止程序路径误选。

## 避坑指南

- 父级全选状态不要对 `getGroupFees` 全量做 `every`，必须排除 `disabledFeeIds`。
- 取消全选时也不要保留禁选 ID 在 `selectionMap` 中。
