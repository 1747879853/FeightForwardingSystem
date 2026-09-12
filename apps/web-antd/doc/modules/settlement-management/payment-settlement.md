# 付费结算（模块实现说明）

> 原 `src/views/settlement-management/payment-settlement/README.md` 已迁至此。  
> 编辑页业务卡点见：[付费结算编辑](./payment-settlement-id-edit.md)。

## 功能概述

付费结算用于对已审核通过的付费申请做结算，支持列表筛选、新建/编辑、锁定/解锁与删除。

## 主要功能

### 分页列表查询

- 支持按结算单号、结算对象、结算币别、我司银行、结算时间范围、主提单号、创建人等条件筛选
- 展示结算单号、结算状态、结算时间、付款方式、锁定状态、结算对象、结算币别、结算金额合计等
- 支持分页与自定义列

### 新建 / 编辑

- 新 Tab 打开表单；维护结算时间、付款方式、结算对象、结算币别、双方银行、手续费、备注
- 添加申请明细（右侧抽屉选付费申请）；上传附件
- 未锁定可编辑主表与明细；当前实现按「付费申请 + 原币」扁平行对接 `*ByCurrencyAsync`（详见编辑页文档）

### 结算单操作

- 查看 / 编辑 / 删除（未锁定）
- 锁定后不可编辑删除；可解锁

### 状态

录入中(0) → 审核中(1) → 已驳回(2) / 审核通过(3) → 部分结算(4) / 已结算(5)

## 代码结构

```
src/views/settlement-management/payment-settlement/
├── list.vue
├── form.vue
├── data.ts / form-data.ts
└── add-application-drawer/
```

## API

- `#/api/sea-export/payment-settlement-admin`：分页、增删改、详情、锁定/解锁（及 ByCurrency 系列）
- `#/api/settlement-management/payment-application-admin`：可结算付费申请列表

## 路由

- 列表：`/settlement-management/payment-settlement`
- 新建：`/settlement-management/payment-settlement/add`
- 编辑：`/settlement-management/payment-settlement/edit/:id`（以路由模块为准）

## 权限

| 能力        | 权限码                                    |
| :---------- | :---------------------------------------- |
| 查看        | `Admin.PaymentSettlement.Get`             |
| 新增        | `Admin.PaymentSettlement.Add`             |
| 编辑        | `Admin.PaymentSettlement.Edit`            |
| 删除        | `Admin.PaymentSettlement.Delete`          |
| 锁定 / 解锁 | `Admin.PaymentSettlement.Lock` / `Unlock` |

## 注意事项

1. 已锁定不可编辑、删除
2. 删除会连带附件，并回滚关联 OrderFee / PaymentApplication 等状态（以后端为准）
3. 新建须先选结算对象与结算币别再加明细
4. 时间展示到分钟（`YYYY-MM-DD HH:mm`）

## Changelog

| 日期 | 说明 |
| :-- | :-- |
| 2026-09-12 | 从 `src/views/.../README.md` 迁入 `doc/modules/settlement-management/` |
