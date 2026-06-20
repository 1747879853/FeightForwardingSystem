# 银行流水列表：操作人列显示数字 ID

## 背景意图

列表页 `/bank-statement` 的「操作人」列直接展示 `operationId`（如 `18`、`5`），而接口 `GetPagedListAsync` 返回的 `bankStatementUsers[].operationName` 多为 `null`，与编辑页已修复的姓名回显不一致。

## 核心逻辑变更

1. **根因**（`src/views/bank-statement/data.ts`）
   - `formatOperators` 在 `operationName` 为空时用 `String(operationId)` 兜底，导致列表展示数字 ID。

2. **修复**
   - 新增 `src/views/bank-statement/utils.ts`，抽取 `resolveOperatorName`、`enrichBankStatementListItems`（页内去重调用 `GetUserAsync`）。
   - `list.vue` 在分页查询返回前补齐 `bankStatementUsers[].operationName`。
   - `data.ts` 仅拼接已有 `operationName`，无名称时显示 `-`，不再回退 ID。
   - `form.vue` 复用同一工具函数，避免重复实现。

## 避坑指南

- **列表与编辑页一致**：`DetailAsync` / `GetPagedListAsync` 的操作人 DTO 均可能缺 `operationName`，前端需统一按 `operationId` 异步拉用户详情。
- **性能**：列表 enrichment 对当前页 `operationId` 去重后再请求，避免重复 `GetUserAsync`。
