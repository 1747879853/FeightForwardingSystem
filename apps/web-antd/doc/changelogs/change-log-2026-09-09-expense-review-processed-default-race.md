# 费用审核首查漏带「费用审核状态」默认值

## 背景意图

进入 `/audit-approval/expense-review` 时，搜索区「费用审核状态」默认应为「未处理」（`Processed=false`），但有时首查请求未带该参数，结果混入已处理任务，与页面展示的默认筛选项不一致。

## 根因

1. `gridApi.query()` / 分组 `enableField()` 读的是表单「最近提交值」，不是表单当前值。
2. 页面原先依赖表格 `autoLoad` 首查，且挂载后用 `setTimeout` → `enableField` 再查一遍；此时「最近提交值」仍为空，第二次请求漏掉 `Processed=false`。
3. 与海出列表会计期间默认值竞态同类问题。

## 核心逻辑变更

1. **`proxyConfig.autoLoad: false`**：禁止表单默认值落库前的自动首查。
2. **`useListGrouping.prepareField`**：仅设置默认「委托单位」分组状态，不触发 `query`。
3. **`onMounted` → `prepareField` → `submitForm`**：把含 `Processed=false` 的表单值写入最近提交值后统一首查。
4. **`mapParams` 兜底**：默认值写入前的早期查询若 `Processed === undefined`，仍按 `false` 过滤；写入后尊重用户改成「全部」(null) 或清空。
5. **`onActivated`**：keepAlive 重新进入时刷新分组条数（跳过首次激活）。

## 避坑指南

- 程序化开启默认分组后必须 `submitForm`，不能 `enableField`（会立刻 `query` 且未写最近提交值）。
- 验证需硬刷新；Vite HMR 不重跑 `onMounted`。
- 用户选「全部」(`null`) 后不应再被兜底回填为 `false`。
