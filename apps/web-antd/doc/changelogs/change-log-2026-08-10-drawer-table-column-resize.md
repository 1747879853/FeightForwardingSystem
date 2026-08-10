# 申请/结算抽屉表格支持拖拽调列宽

## 背景意图

TAPD #0629：开票申请、付费申请、发票开出、收费结算、付费结算等抽屉内表格列宽固定，主提单号等长字段看不全，需支持表头拖拽调宽。

## 核心逻辑变更

- `NestedDataTable` 默认开启 `resizable`：表头右侧手柄拖拽，内外层列宽写入响应式 map 并驱动 `colgroup`。
- 新增 `utils/table-column-resize.ts`：`enableAntTableColumnResize` / `useAntTableColumnResize`，给 Ant Design `Table` 抽屉挂手柄；抽屉打开期间用 MutationObserver 覆盖展开行内嵌表。
- 收费核销选费/选开票申请抽屉、发票开出选申请抽屉接入公共工具。
- 删除开票选费抽屉、付费结算选申请抽屉内无效的本地 `enableColumnResize`（原先只找 `.ant-table-wrapper`，对 NestedDataTable 无效）。

## 避坑指南

- NestedDataTable 最后一列默认不写死宽度（吸收剩余空间）；用户拖过该列后才固定为拖拽宽度。
- Ant Table 手柄幂等：已有 `.column-resizer` 不重复挂载；选择列/展开列跳过。
- 勿再在各抽屉复制 DOM 拖拽逻辑；NestedDataTable 场景依赖组件内置，Ant Table 场景用 `useAntTableColumnResize`。
