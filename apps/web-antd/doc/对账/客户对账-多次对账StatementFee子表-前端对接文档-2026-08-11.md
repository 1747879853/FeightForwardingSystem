# 客户对账-多次对账StatementFee子表-前端对接文档-2026-08-11

## 1. 背景意图

对账关系由「费用上挂一个对账单id」改为独立子表，**一条费用可以同时属于多张对账单**（允许多次对账）。因此费用上的 `statementId` 字段下线，改为 `statements` 数组；选费用接口新增两个过滤开关。

## 2. 破坏性变更（必改）

| 位置 | 原字段 | 新字段 | 说明 |
| :-- | :-- | :-- | :-- |
| `OrderFeeDto` | `statementId`（Guid?） | 已删除 | 不再返回 |
| `OrderFeeDto` | `statement`（对象） | `statements`（数组） | 未对账时为 `[]`，不是 `null` |

判断「费用是否已对账」由 `statementId != null` 改为 `statements.length > 0`。

影响接口（凡返回 `OrderFeeDto` 的均受影响，以下为实际回填 `statements` 的两处）：

- `GET /api/services/app/OrderFeeAdmin/GetPagedListAsync`
- `GET /api/services/app/ChangeOrderAdmin/DetailAsync`（`orderFees[]`）

### 2.1 `StatementSimpleDto`

| JSON           | 类型   | 说明     |
| :------------- | :----- | :------- |
| `id`           | Guid   | 对账单id |
| `statementNum` | string | 对账单号 |

数组按 `statementNum` 升序返回。

## 3. 选费用接口新增入参

| 项   | 值                                                       |
| :--- | :------------------------------------------------------- |
| 方法 | `GET`                                                    |
| 地址 | `/api/services/app/StatementAdmin/GetOrderFeeGroupAsync` |
| 权限 | `Admin.Statement.Get` + `Admin.OrderFee.Get`             |
| 返回 | `PagedList<TransportOrderDto>`                           |

`GetOrderFeeGroupInputDto` 新增两个字段，其余入参不变：

| JSON | 类型 | 必填 | 说明 |
| :-- | :-- | :-- | :-- |
| `includeStatemented` | bool? | 否 | 不传/`false`：只返回从未对账过的费用（与改造前一致）；`true`：把已在其他对账单里的费用也返回，用于多次对账 |
| `statementId` | Guid? | 否 | 给已有对账单加费用时传，用于排除本对账单已包含的费用；新建对账单时不传 |

另有一条**无条件生效、不受上述开关影响**的过滤：存在审核中的申请修改或申请删除任务的费用一律不返回。因为审核通过后费用金额会变、或费用直接被删，此时若已挂进对账单会造成金额失真或留下指向已删费用的明细。审核有结论后该费用会自动重新出现在列表里，前端无需处理，但如果用户反馈「某条费用在费用列表看得到、在对账选费用里找不到」，优先排查是不是卡在这个状态。

调用场景对照：

| 场景 | `includeStatemented` | `statementId` |
| :-- | :-- | :-- |
| 新建对账单选费用（只要没对过账的） | 不传 | 不传 |
| 新建对账单选费用（允许把已对账费用再对一次） | `true` | 不传 |
| 已有对账单加费用（只要没对过账的） | 不传 | 当前对账单id |
| 已有对账单加费用（允许把已对账费用再加进来） | `true` | 当前对账单id |

## 4. 行为变更（无接口签名变化）

| 接口 | 变更 |
| :-- | :-- |
| `StatementAdmin/AddAsync` | 不再校验「费用必须未对账」；同一次提交里费用id不可重复 |
| `StatementAdmin/AddFeesAsync` | 重复校验语义改为「本对账单已包含该费用」，报错文案 `费用输入错误 本对账单已包含该费用` |
| `StatementAdmin/RemoveFeesAsync` | 只解除**本对账单**的关联，该费用在其他对账单里的关联不受影响；本单费用清空后仍会自动删除对账单 |
| `StatementAdmin/DeleteAsync` | 只删本对账单及其明细，不影响费用在其他对账单里的关联 |
| `OrderFeeAdmin/EditAsync` | **新增拦截**：已参与对账的费用不可编辑，原先是静默跳过，现在直接报错 `已参与对账的费用不可编辑` |

其余「已参与对账的费用不可删除 / 不可申请修改 / 不可申请删除 / 不可驳回」四条卡点行为不变，判定口径为「该费用存在于任意一张对账单」。

## 5. 前端适配清单

- [ ] 全局替换 `orderFee.statementId` 判断，改用 `orderFee.statements`（数组，空数组表示未对账）
- [ ] 费用行展示对账单号处改为遍历 `statements[].statementNum`，可能有多个
- [ ] 已对账费用的编辑入口需置灰（`statements.length > 0`），否则提交才会报错
- [ ] 对账单「加费用」弹窗调用 `GetOrderFeeGroupAsync` 时传 `statementId`，避免把本单已有费用再列出来
- [ ] 如需支持多次对账，在选费用弹窗提供「包含已对账费用」勾选项，勾选后传 `includeStatemented=true`
