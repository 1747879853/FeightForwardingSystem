---
title: 应收应付费用选中后直接创建付费申请
module: 付费申请
author: auto-doc-sync
last_updated: 2026-08-28
---

# 1. 背景意图 (Background)

海运/空运出口、海运进口应收应付页勾选费用后，需一键进入付费申请新增并预填明细，避免在添加费用抽屉里重新检索。

后端 2026-08-27 已在 `GetOrderFeeGroupAsync` 增加 `OrderFeeIds` 筛选，不新增按 ids 生成申请的接口；创建仍走 `AddAsync`。

# 2. 核心逻辑变更 (Core Logic)

## 2.1 应收应付页入口（海出 / 海进 / 空出）

- 三处 `orderFee/index.vue` 顶部增加「创建付费申请」按钮。
- **权限**：`Admin.PaymentApplication.Add`，无权限不显示按钮。
- **跳转前前端校验**（`open-from-order-fees.ts`）：
  - 至少勾选一条已保存费用；
  - 组合费用状态为审核通过(2)或部分结算(3)；
  - 申请修改(6)/申请删除(7)拦截并给出专项提示；
  - 状态解析优先 `combinedFeeStatus`，缺失时回退 `feeStatus`（与表格展示 `combinedFeeStatus ?? feeStatus` 一致），并通过待审任务兜底识别申请修改/删除；
  - 同一结算对象、至少一条应付（`paySide === 1`）。
- **跳转前先回捞**：调用 `GetOrderFeeGroupAsync`（`OrderFeeIds` + `PageSize=100000`）；0 条则不跳转并提示。
- 通过后跳转 `/fee-management/payment-application/add?orderFeeIds=...`；按钮 loading 期间禁用重复点击。

## 2.2 付费申请新增页预填

- 解析 `query.orderFeeIds`，再次调用 `GetOrderFeeGroupAsync` 回捞并映射明细；
- `appliedAmount` 默认取 `unRqstPaymentAmount`；
- 有 `orderFeeIds` 时跳过自动打开添加费用抽屉；
- 部分不可申请时 warning；全部不可申请则留在应收应付页（跳转前已拦）。

## 2.3 共用模块

| 文件 | 职责 |
| :-- | :-- |
| `add-fee-modal/data.ts` | `buildSelectedFeeItemFromGroupFee`、`flattenPayAppFeeGroupsToSelectedItems` |
| `open-from-order-fees.ts` | 状态解析、校验、导航 |
| `prefill-from-order-fee-ids.ts` | 按 id 回捞与提示 |
| `payment-application-admin.ts` | `GetOrderFeeGroupParams.OrderFeeIds` |

# 3. 避坑指南 (Pitfalls)

- 返回条数可能少于传入 id 数（未审核、无额度、待审任务等），以接口为准。
- **申请修改/删除在审时**：库表 `FeeStatus` 仍为 `Passed(2)`，页面 `combinedFeeStatus` 为 6/7；前端以组合状态 + 待审任务判断，后端 `GetOrderFeeGroupAsync` 另排除待审任务。
- **勿混选应收未审费用**：校验对勾选的全部费用生效，建议只勾应付且状态为审核通过/部分结算。
- **结算完毕(4)** 不算可申请状态，即使曾经审核通过。
- 多结算对象不可同单申请，须前端先拦。
- `OrderFeeIds` GET 须 `paramsSerializer: 'repeat'`（已有）。
- 空运进口暂无应收应付页，未接入入口。

# 4. 测试文档

- 仓库内：`doc/test-prd/2026-08-28-order-fee-create-payment-application-test.md`
- TAPD Wiki：见提交说明中的链接

# 5. 变更日志 (Changelog)

| 日期 | 变更类型 | 业务功能变动 | 代码解析与架构洞察 |
| :-- | :-- | :-- | :-- |
| 2026-08-28 | Feature | 应收应付勾选费用一键创建付费申请并预填明细 | 复用 GetOrderFeeGroupAsync+OrderFeeIds；状态以 combinedFeeStatus 为准并兼容 feeStatus 回退 |
| 2026-08-28 | Fix | 修复审核通过仍被前端误拦；按钮增加 Add 权限 | 表格展示与校验口径对齐；申请修改仍通过 combinedFeeStatus=6 或待审任务识别 |
