# FeeLock 模块活文档

## 模块定位

- 模块名称：费用锁定管理。
- 业务作用：对委托单及更改单费用进行批量锁定/解锁，控制费用可编辑性，保障结算阶段数据稳定。
- 路由入口：`/fee-management/fee-lock`
- 权限：`Admin.OrderFee.Lock`

## 页面与代码位置

- 页面：`apps/web-antd/src/views/fee-management/fee-lock/fee-lock-list.vue`
- 数据结构：`apps/web-antd/src/views/fee-management/fee-lock/fee-lock-data.ts`
- API：`apps/web-antd/src/api/sea-export/fee-lock-admin.ts`

## 核心业务对象

- 运输单锁费对象：`TransportOrderFeeLockDto`
- 批量操作入参：`TransportOrderFeeLockInput`
- 树形节点结构：
  - 父节点：运输单（委托）
  - 子节点：更改单（可选）

## 查询与筛选逻辑

- 支持按锁定状态、会计期间、开船日期、关键字、委托单位、业务类型等筛选。
- 日期区间在前端统一转换 ISO 字符串后传入后端：
  - `AccountDateRange` -> `AccountDateStart` / `AccountDateEnd`
  - `BizDateRange` -> `ETDStart` / `ETDEnd`

## 批量锁定/解锁流程

1. 用户在树表勾选委托或更改单记录。
2. 前端去重生成 `{ transportOrderId, changeOrderId? }` 集合。
3. 弹出确认框展示将操作的记录数。
4. 调用批量接口：
   - 锁定：`TransportOrderAdmin/FeeLockAsync`
   - 解锁：`TransportOrderAdmin/FeeUnLockAsync`
5. 操作成功后刷新列表。

## 业务影响

- 锁费后，相关费用录入和修改操作应受限（具体限制以后端校验为准）。
- 锁费状态在海运出口列表、编辑页只读区、费用模块中应保持一致展示。
- 更改单与主单可独立呈现锁费信息，测试时需要覆盖父子节点组合场景。

## 测试建议

- 树结构选择：仅选父、仅选子、父子混选、重复选择去重。
- 状态回归：锁定后刷新仍正确，解锁后可恢复编辑能力。
- 条件筛选：时间区间与关键字组合过滤准确。
- 权限验证：无 `Admin.OrderFee.Lock` 权限用户不可见或不可操作。

## 注意事项

- API 命名在 `TransportOrderAdmin` 下，表示锁费是运输单维度控制而非费用逐条控制。
- `isBusinessLocking` 与 `feeLocked` 含义不同，需求评审与测试用例需区分。
