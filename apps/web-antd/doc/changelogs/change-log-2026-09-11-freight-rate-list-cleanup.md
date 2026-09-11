# 运价列表页代码清理与结构规范化

## 背景意图

`list.vue` 长期堆叠调试日志、重复弹窗实例与未接线处理器，结构松散，复制入口实际打不开可用表单。

## 核心逻辑变更

- 删除未使用导入与死代码：`FormModal`（与 SyncUpdate 同组件重复）、`AddCtnModal`、`BatchEditModal`（从未 `open`）、`onActionClick`/`onEdit`/`onAddCtn`、无用 store/权限临时变量、注释掉的模板块。
- `useColumns` 去掉从未使用的 `onActionClick` 参数；附加费名称/Tooltip 下沉到 `data.ts`，枚举复用模块级缓存。
- 「复制」改为 `edit-form` 的 `copyId` 预填新增；工具栏「更新」与菜单「批量更改」命名厘清（Handsontable 编辑 vs 同步字段弹窗）。
- 港口单元格空值与可选链修正；去掉调试 `console.log`。

## 避坑指南

- ~~`batch-edit-modal.vue` / `add-ctn-modal.vue` 文件仍保留~~：已于 `change-log-2026-09-11-freight-rate-modules-cleanup-rename.md` 删除。
- 字段权限仍只对 `alwaysMasked` 整列隐藏。
