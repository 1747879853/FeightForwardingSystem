# 运价 modules 下 Vue 文件统一为 kebab-case

## 背景意图

`views/freight-rate/modules` 内混用 PascalCase、camelCase 与错误拼写文件名，与项目 views 层 kebab-case 约定不一致。

## 核心逻辑变更

重命名（仅文件名，组件逻辑不变）：

| 原文件名                           | 新文件名                           |
| ---------------------------------- | ---------------------------------- |
| `BatchAddTableCore.vue`            | `batch-add-table-core.vue`         |
| `ColumnConfigModal.vue`            | `column-config-modal.vue`          |
| `editForm.vue`                     | `edit-form.vue`                    |
| `batch-add-modal-handsantable.vue` | `batch-add-modal-handsontable.vue` |

同步更新 `list.vue` 与批量新增弹窗内的 import 路径。

## 避坑指南

- 模板中仍可用 PascalCase 标签（如 `<BatchAddTableCore>`），与文件名 kebab-case 不冲突
- 历史文档若仍写旧路径，以当前 `modules/*.vue` 为准
