# 添加费用抽屉搜索区布局与申请页内边距优化

## 背景意图

付费申请新建/编辑页外层 `Page` 与表单容器重复 padding 导致留白过大；添加费用抽屉搜索条件需更紧凑的五列布局，并将查询/重置按钮放在币别条件同一行右侧。

## 核心逻辑变更

- `payment-application/form.vue`：移除 `.payment-app-form` 的 `padding: 12px`，仅保留 `Page` 默认 `p-4`。
- `add-fee-modal/index.vue`：
  - 搜索表单 `labelWidth: 64`、`grid-cols-5`。
  - 启用 `showDefaultActions`，`actionWrapperClass: col-span-2 col-start-4 justify-end` 使查询/重置紧跟币别右对齐。
  - 保留条件变更节流自动搜索；打开抽屉且已有结算单位时自动拉取列表。
- `add-fee-modal/data.ts`：业务日期 `RangePicker` 设置 `col-span-2`。

## 避坑指南

- 查询/重置使用 Vben Form 内置 `FormActions`，勿在表单外再叠一层按钮行，否则会破坏五列网格对齐。
- 重置时若已有费用导致结算单位锁定，需保留 `SettlementId` 并重新查询。
