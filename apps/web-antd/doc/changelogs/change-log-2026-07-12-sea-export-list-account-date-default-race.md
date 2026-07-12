# 海运出口列表会计期间默认当月首查兜底

## 背景意图

列表已支持会计期间月份筛选，并计划进入页面默认按当月过滤。仅靠 schema `defaultValue` 或 `setValues` 不够：`gridApi.query()` 使用「最近提交值」而非表单当前值；分组恢复等挂载期逻辑还可能在默认值写入前抢先触发查询，导致首屏请求漏掉 `AccountDateStart` / `AccountDateEnd`。

## 核心逻辑变更

1. **关闭 `autoLoad`**：避免表格在表单默认值落库前自动首查。
2. **挂载后 `setValues` + `submitForm`**：写入当月 `AccountDateRange` 后走提交链路，把默认期间写入「最近提交值」，保证首查及后续分页/排序带上条件。
3. **`normalizeQuery` 兜底**：用 `accountDateDefaultApplied` 标记；默认值写入前的早期查询若会计期间为空，仍按当月整月区间过滤；写入后完全尊重表单（可清空/改月）。
4. **整月区间**：起取 `startOf('month')`，止取 `endOf('month')`，对接后端 `AccountDateStart`（`>=`）/ `AccountDateEnd`（`<=`）。

## 避坑指南

- 程序化写入搜索默认值后，必须 `submitForm`（或等价写入最近提交值），不能只 `setValues` + `gridApi.query()`。
- Vite HMR 不会重跑 `onMounted`；验证默认会计期间需整页刷新（硬刷新）。
- 用户清空会计期间后不应再被兜底回填；仅在 `accountDateDefaultApplied === false` 时兜底。
- 分组恢复会调用 `gridApi.query()`，与默认值写入存在竞态，靠 `normalizeQuery` 兜底兜住早期请求。
