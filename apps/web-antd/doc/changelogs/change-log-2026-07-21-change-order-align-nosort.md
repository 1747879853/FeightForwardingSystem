# 更改单：去冗余标题、费用表禁用排序、表格与表单对齐

## 背景意图

更改单编辑区标题「更改单」与选择器语义重复；费用表列头排序对更改单录入无必要；表格因内层 `px-1` 比顶部表单多出约 4px 边距，视觉不对齐。

## 核心逻辑变更

1. 去掉编辑区 eyebrow「更改单」文案。
2. `mode=changeOrder` 时：`sortConfig.enabled=false`，且列定义统一 `sortable: false`（主单费用表不受影响）。
3. 更改单模式去掉费用表内层 `px-1`，与标题栏/基本信息表单统一左右 `16px` 边距。

## 避坑指南

- 仅更改单模式关排序；主单应收应付表仍可排序。
- 对齐依赖 `.editor-header` / `.change-order-basic-form` / `.fee-tables` / `.profit-summary` 同为水平 `16px`，勿再给费用表套额外水平 padding。
