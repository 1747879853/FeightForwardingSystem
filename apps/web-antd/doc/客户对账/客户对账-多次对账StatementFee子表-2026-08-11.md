---
title: 允许多次对账（新增 StatementFee 子表）
module: 客户对账（StatementAdmin）
author: auto-doc-sync
last_updated: 2026-08-11
---

# 背景意图

原模型把对账关系挂在 `OrderFee.StatementId` 这个可空外键上，一条费用只能属于一张对账单，无法满足「同一条费用需要多次对账」的业务诉求（例如同一票费用先给客户出一版明细对账单，后续再并入月度汇总对账单）。

本次把关系表拆出来：新增子表 `App_StatementFees`，`Statement` 与 `OrderFee` 变为多对多，同时删除 `OrderFee.StatementId` 字段。

# 核心逻辑变更

## 1. 数据模型

新增实体 `StatementFee`（`App_StatementFees`，`FullAuditedEntity<Guid>` + `IMustHaveTenant`）：

| 字段        | 类型         | 说明                  |
| :---------- | :----------- | :-------------------- |
| Id          | Guid         | 主键                  |
| TenantId    | int          | 租户                  |
| StatementId | Guid         | 客户对账id            |
| OrderFeeId  | Guid         | 业务费用id            |
| SortId      | int          | 排序id 按加入顺序递增 |
| Remark      | string(1024) | 备注                  |

- `Statement.OrderFees`（`List<OrderFee>`）改为 `Statement.StatementFees`（`List<StatementFee>`）。
- `OrderFee` 删除 `StatementId` 字段与 `Statement` 导航，新增 `StatementFees`（`List<StatementFee>`）。
- `CsprojBuilderDbContext` 注册 `DbSet<StatementFee>`，并对 `StatementId`、`OrderFeeId` 各建一个索引。

同一条费用在**同一张**对账单里只能出现一次（`AddAsync` / `AddFeesAsync` 代码校验），但可以同时存在于**多张**对账单。未加数据库唯一索引，避免与 ABP 软删除残留行冲突。

## 2. StatementAdminAppService

| 方法 | 变更 |
| :-- | :-- |
| `AddAsync` | 去掉「费用必须未对账」的过滤条件；插入主表后写入 `StatementFee` 子表，不再回写费用外键 |
| `GetOrderFeeGroupAsync` | 新增 `IncludeStatemented`、`StatementId` 两个入参控制过滤，详见下节 |
| `DeleteAsync` | 删除主表前显式 `DeleteAsync(x => statementIds.Contains(x.StatementId))` 清子表（ABP 软删除不级联） |
| `AddFeesAsync` | 重复校验由「费用已对账」改为「本对账单已包含该费用」；`SortId` 接着当前最大值递增；本位币校验的现存费用改经子表取 |
| `RemoveFeesAsync` | 删子表行代替置空外键；仍保留「对账单下费用清空后自动删除对账单」的行为 |
| `GetPagedListAsync` | 收付类型/开票状态/结算状态筛选由 `m.OrderFees.All(f => ...)` 改为 `m.StatementFees.All(f => f.OrderFee...)`；主提单号与开船日期反查改从 `StatementFee` 出发；币别金额汇总改 join 子表取数 |
| `DetailAsync` | `Include(x => x.OrderFees)` 改为 `Include(x => x.StatementFees).ThenInclude(x => x.OrderFee)`，方法开头按 `SortId` 摊平成费用集合，后续分组、汇总、打印逻辑不变 |

## 3. 选费用接口的过滤口径

`GetOrderFeeGroupInputDto` 新增两个字段：

- `IncludeStatemented`（bool?）：默认 `false`/不传时只返回**从未对账过**的费用，与改造前行为一致；传 `true` 时把已在其他对账单里的费用也返回，用于多次对账。
- `StatementId`（Guid?）：给**已有**对账单加费用时传，用于排除本对账单里已存在的费用；新建对账单时不传。

此外无条件排除**申请修改/申请删除审核中**的费用（`TaskItem.TaskType in (ModifyOrderFee, DeleteOrderFee)` 且 `TaskStatus = Auditing`），不受上述两个开关影响：

```csharp
var pendingTaskFeeIdQuery = _taskItemRepository.GetAll().AsNoTracking()
    .Where(x => (x.TaskType == TaskType.ModifyOrderFee || x.TaskType == TaskType.DeleteOrderFee) && x.TaskStatus == TaskStatus.Auditing)
    .Select(x => x.EntityId);
```

用子查询而非先materialize成id集合，SQL 层走 NOT EXISTS，费用量大时不会把待审费用id全拉到内存。

## 4. 费用侧卡点（全部保留）

`OrderFeeAdminAppService` 原先按 `x.StatementId.HasValue` 判定的卡点，统一改为按 `OrderFeeId` 查 `StatementFee` 是否命中，语义为「该费用存在于任意一张对账单」：

- 删除：已参与对账的费用不可删除
- 申请修改：已参与对账的费用不可申请修改
- 申请删除：已参与对账的费用不可申请删除
- 驳回：已参与对账的费用不可驳回
- **编辑：本次启用**。原先该拦截被注释掉、编辑时静默跳过，现改为直接抛「已参与对账的费用不可编辑」

## 5. 费用返回的对账单信息

`OrderFeeDto` 删除 `StatementId` 与单个对象 `Statement`，改为集合 `Statements`（`List<StatementSimpleDto>`）。涉及 `OrderFeeAdmin/GetPagedListAsync` 与 `ChangeOrderAdmin` 费用详情两处回填，均一次性按费用 id 聚合，不做 N+1 查询。

## 6. 下游模块

- 开票申请 `InvoiceApplicationAdmin/AddByStatementAsync`、付费申请 `PaymentApplicationAdmin/AddByStatementAsync`：捞对账单下费用改走 `StatementFee`。两者本就按费用剩余额度申请，同一条费用被多张对账单包含也不会重复超额。
- 海运出口/海运进口/空运出口复制业务时，新建费用不再需要显式 `StatementId = null`，复制出来的费用天然未对账。

# 数据迁移

迁移文件由开发人员自行生成。生成后必须把存量数据回填 SQL 放在 `DropColumn("StatementId", "App_OrderFees")` **之前**，否则历史对账关系会全部丢失：

```sql
INSERT INTO App_StatementFees (Id, TenantId, StatementId, OrderFeeId, SortId, CreationTime, IsDeleted)
SELECT NEWID(), f.TenantId, f.StatementId, f.Id, 0, GETDATE(), 0
FROM App_OrderFees f
WHERE f.StatementId IS NOT NULL AND f.IsDeleted = 0;
```

# 避坑指南

- **删除对账单必须先删子表**。`AbpDbContext` 会在 `SaveChanges` 前把软删除主表的 `EntityState` 从 `Deleted` 改回 `Modified`，EF 的级联删除届时不会触发，子表一条都删不掉，残留行会让「对账单下费用数」等按子表直查的逻辑读到幽灵数据。
- **不要再用 `OrderFee.StatementId` 判断费用是否已对账**，该字段已删除；一律查 `StatementFee`。
- **`RemoveFeesAsync` 只删本对账单的关联**，同一条费用在其他对账单里的关联不受影响。
- **前端 `statementId` 字段已下线**，改读 `statements` 数组；未对账时返回空数组而非 `null`。
- 已对账费用现在**禁止编辑**，前端应在费用行上按 `statements` 是否为空来置灰编辑入口，避免提交后才报错。
- **选费用列表排除审核中费用的过滤只在 `GetOrderFeeGroupAsync` 上。** `AddAsync` / `AddFeesAsync` 目前没有同样的校验，直接按 id 提交仍能把审核中的费用挂进对账单。若后续出现「对账单里有已被删除的费用」这类问题，优先在这两个写接口补同样的拦截。
