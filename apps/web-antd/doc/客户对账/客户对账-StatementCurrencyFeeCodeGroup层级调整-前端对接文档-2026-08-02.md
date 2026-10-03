# 客户对账-StatementCurrencyFeeCodeGroup层级调整-前端对接文档-2026-08-02

路由前缀：`/api/services/app/StatementAdmin`  
权限：`Admin.Statement.Get`

---

## 1. 详情 — `GET /api/services/app/StatementAdmin/DetailAsync`

### 入参

| 字段     | JSON      | 类型  | 必填 | 说明                      |
| :------- | :-------- | :---- | :--- | :------------------------ |
| 对账单id | `id`      | Guid  | 是   | 对账单主键                |
| 是否打印 | `isPrint` | bool? | 否   | `true` 时填充打印扩展字段 |

### 出参层级调整

| 变更 | 原路径 | 新路径 | 类型 | 说明 |
| :-- | :-- | :-- | :-- | :-- |
| 移动 | `statementCurrencyFeeCodeGroup`（根级） | `orderFeeGroups[].statementCurrencyFeeCodeGroup` | `StatementCurrencyFeeCodeDto[]` | 仅 `isPrint=true` 有值；按**当前业务组内费用**按币别+费用代码汇总 |

### `StatementCurrencyFeeCodeDto` 字段

| 字段 | JSON | 类型 | 说明 |
| :-- | :-- | :-- | :-- |
| 币别 | `currency` | `CurrencySimpleDto` | 币别简要 |
| 应收合计 | `receiveAmount` | decimal | 本组收方金额合计 |
| 应付合计 | `payAmount` | decimal | 本组付方金额合计 |
| 应收-应付 | `balanceAmount` | decimal | `receiveAmount - payAmount`（只读计算） |
| 费用代码 | `feeCode` | `FeeCodeSimpleDto` | 费用代码简要 |

---

## 2. 前端适配清单

- [ ] 打印/预览读取路径改为 `orderFeeGroups[].statementCurrencyFeeCodeGroup`
- [ ] 删除对根级 `statementCurrencyFeeCodeGroup` 的依赖
- [ ] FastReport 模板字段绑定同步改到 `OrderFeeGroups` 子级
