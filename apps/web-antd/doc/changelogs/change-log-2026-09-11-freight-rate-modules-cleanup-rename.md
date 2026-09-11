# 运价 modules 删除未引用组件并按功能重命名

## 背景意图

`freight-rate/modules` 中并存多套未接线弹窗与误导性文件名（如 `form.vue` 实际是批量更改、`batch-add-modal-handsontable.vue` 才是线上批量新增），增加维护成本。

## 核心逻辑变更

**删除（`list.vue` / 其它 src 均无引用）：**

- `add-ctn-modal.vue`
- `batch-edit-modal.vue`
- `batch-add-modal.vue`（旧 Vxe 批量新增）
- `sync-update-form.vue`（未接线备份；线上批量更改此前是 `form.vue`）

**重命名：**

| 原文件名 | 新文件名 | 实际用途 |
| --- | --- | --- |
| `form.vue` | `sync-update-form.vue` | 列表「批量更改」同步字段弹窗 |
| `batch-add-modal-handsontable.vue` | `batch-add-modal.vue` | Handsontable 批量新增 / 更新 |
| `edit-form.vue` | `freight-rate-form.vue` | 单条新增 / 编辑 / 复制 |
| `column-config-modal.vue` | `batch-add-column-config-modal.vue` | 仅批量表列配置 |

`list.vue` 与 `batch-add-modal.vue` 内导入已同步；业务逻辑未改。

## 避坑指南

- 历史 changelog 中可能仍写旧文件名，以本归档与 `modules/freight-rate/index.md` 为准。
- 保留：`batch-add-table-core.vue`、`ctn-editable-cell.vue`、`freight-rate-ai-upload-modal.vue`、`composables/*`。
