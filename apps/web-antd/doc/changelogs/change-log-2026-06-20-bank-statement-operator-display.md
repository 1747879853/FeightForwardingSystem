# 银行流水编辑页：操作人 UserSelect 回显数字 ID

## 背景意图

编辑页 `/bank-statement/edit/:id` 右侧「操作人」面板中，`UserSelect` 未展示人员姓名，而是直接显示 `operationId` 数字。

## 核心逻辑变更

1. **根因**（`src/views/bank-statement/form.vue`）
   - `BankStatementAdmin/DetailAsync` 返回的 `bankStatementUsers` 往往不含 `operationName`。
   - 模板在 `selected-items` 中用 `record.operationName || String(record.operationId)` 兜底，导致 Remote Select 直接以数字作为 label 回显。

2. **修复**（`src/views/bank-statement/form.vue`）
   - 详情加载时 `buildOperatorRows` 对 `operationName` 为空的行调用 `GetUserAsync` 补齐姓名。
   - 通过 `toOperatorSelectedItems` 拼接 `{ id, userName }` 传入 `UserSelect` 的 `selected-items`，由 `usePagedSelect.mergeSelectedItems` 完成回显。
   - 不改动 `UserSelect` 组件本身。

## 避坑指南

- **分页 Remote Select 回显**：详情 DTO 未带显示名时，应异步拉用户详情或传 `selectedItems`，不要用 `String(id)` 充当 label。
- **与海运出口干系人一致**：参考 `change-log-2026-05-27-sea-export-order-user-select-label-flash.md`，避免动态 `key` 触发 remount 加剧 ID 闪烁。
