# 列表搜索默认值首查漏带：付费审批 / 业务联系单审核 / 提成发放 / 运价

## 背景意图

与费用审核页同类：搜索区有 `defaultValue`，但依赖表格默认 `autoLoad`，未把条件写入「最近提交值」。首查偶发还能带上；翻页、排序、刷新、切航线 Tab（运价）再查会丢掉默认筛选。

## 涉及页面

| 页面                                      | 默认筛选                      |
| :---------------------------------------- | :---------------------------- |
| `/audit-approval/payment-review`          | `TaskStatus=审核中`（值为 0） |
| `/audit-approval/pre-order-review`        | `MyStatus=审核中`（值为 0）   |
| `/settlement-management/commission-grant` | `status=审核通过`             |
| `/freight-rate`                           | `isValid=[已生效,未生效]`     |

## 核心逻辑变更

四页统一：

1. **`proxyConfig.autoLoad: false`**
2. **`onMounted` → `formApi.submitForm()`** 写入最近提交值并首查
3. **`mapParams` 兜底**：默认值写入前若目标字段 `=== undefined` 再补默认；用户清空后不再回填
4. **枚举值为 0 的字段**（`TaskStatus` / `MyStatus`）只能用 `=== undefined` 判断，不可当 falsy 丢掉

运价页在既有 `onMounted` 末尾追加 `submitForm`（切航线仍走 `gridApi.query`，依赖最近提交值）。

## 避坑指南

- 与 `change-log-2026-09-09-expense-review-processed-default-race.md` 同一套路；有分组时另需 `prepareField` / `restorePersistedField` 后再 `submitForm`。
- 验证需硬刷新；HMR 不重跑 `onMounted`。
