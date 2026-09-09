# 付费结算编辑页结构整理

## 背景意图

`payment-settlement/form.vue` 近 1600 行，逻辑、调试日志、重复 watch 与死代码缠在一起，难维护。按「正确性 → 清理 → 拆分」整理一版。

## 核心逻辑变更

1. **Watch / 回填**：`isHydrating` 期间跳过结算对象/币别/组织的副作用，避免详情回填清空对方银行；合并重复的 `settlementId` watch。
2. **错误提示**：接口失败不再二次 `message.error`（走 request 拦截器）；批量删除改为 `Modal.confirm.onOk` 直接执行。
3. **死代码清理**：删除空壳函数、未用 import/ref、调试 `console.log`；抽出 `mapApplicationsToCurrencyItems`。
4. **拆 composable**：
   - `use-form-state` / `use-bank-options` / `use-load-detail` / `use-form-effects` / `use-submit`
5. **校验**：保存要求至少一行申请明细；成功操作标记 `PaymentSettlementList` 刷新。

## 避坑指南

- 详情赋值前必须 `isHydrating=true`，银行选项加载完成并写回选中值后再置 false。
- catch 里不要再弹 `message.error`，避免与拦截器双提示。
