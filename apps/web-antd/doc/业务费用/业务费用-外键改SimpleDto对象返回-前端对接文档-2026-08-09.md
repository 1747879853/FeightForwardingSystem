# 业务费用/客户对账-外键改SimpleDto对象返回-前端对接文档-2026-08-09

## 1. 背景意图

接口详情/列表返回关联外键禁止平铺名称字段，统一以 SimpleDto 对象返回；仅保留创建人昵称 `creatorUserName` 平铺。

本次范围：

1. **客户对账** `StatementDto` / `StatementCurrencyDto` 头字段对象化
2. **业务费用** `OrderFeeDto`（及 `OrderFeeAndTaskDto`）外键平铺字段全局删除并对象化；所有嵌套返回 `OrderFeeDto` 的接口一并受影响

---

## 2. 核心逻辑变更（后端）

1. `StatementDto`：删除 `ClientName`/`ClientCode`，新增 `Client`（`ClientSimpleDto`）；保留 `CreatorUserName`；`OrgBankAccount` 仍为对象。
2. `StatementCurrencyDto`：删除 `CurrencyCode`/`CurrencyCnName`/`CurrencyEnName`，新增 `Currency`（`CurrencySimpleDto`）；保留 `CurrencyId`/`CurrencySortId`。
3. `OrderFeeDto`：删除 `FeeCodeName`/`FeeCodeCode`/`CurrencyName`/`CurrencyCode`/`SettlementName`/`SettlementCode`；填充 `FeeCode`/`Currency`/`Settlement` 对象。
4. 新增 `OrderFeeSimpleDtoMapper`；所有返回 `OrderFeeDto`/`OrderFeeAndTaskDto` 的 AppService 已改造。
5. `OrderFeeEditDto` 修改前快照平铺字段保留（申请修改对比展示用）。
6. 打印占位符：对账单客户改 `Client.FullName/Name`；费用结算对象改 `Settlement.FullName/Name`。
7. 打印专用 `StatementCurrencyFeeCodeDto` 仍保持平铺（FastReport）。

---

## 3. 客户对账 StatementAdmin

路由前缀：`/api/services/app/StatementAdmin`  
权限：`Admin.Statement.Get`

### 3.1 详情 — `GET StatementAdmin/DetailAsync`

#### 入参

| 字段     | JSON      | 类型  | 必填 | 说明                      |
| :------- | :-------- | :---- | :--- | :------------------------ |
| 对账单id | `id`      | Guid  | 是   | 对账单主键                |
| 是否打印 | `isPrint` | bool? | 否   | `true` 时填充打印扩展字段 |

#### 出参变更（`StatementDto`）

| 变更 | 原字段 | 新字段 | 类型 | 说明 |
| :-- | :-- | :-- | :-- | :-- |
| 删除 | `clientName` / `clientCode` | — | — | 不再返回平铺客户名/代码 |
| 新增 | — | `client` | `ClientSimpleDto` | 客户简要对象（`id/name/code/fullName` 等） |
| 保留 | `creatorUserName` | `creatorUserName` | string | 创建人昵称，仍平铺 |
| 保留 | `orgBankAccount` | `orgBankAccount` | `OrgBankAccountSimpleDto` | 我司银行对象 |

#### `StatementCurrencyDto`（`statementCurrencyGroup` / `statementCurrencyGroupSummary`）

| 变更 | 原字段 | 新字段 | 类型 | 说明 |
| :-- | :-- | :-- | :-- | :-- |
| 删除 | `currencyCode` / `currencyCnName` / `currencyEnName` | — | — | 不再平铺 |
| 新增 | — | `currency` | `CurrencySimpleDto` | `code/cnName/enName/defaultRate` |
| 保留 | `currencyId` / `currencySortId` | 同左 | long/int | 分组与排序 |

#### `orderFeeGroups[].orderFees[]`

见第 4 节 `OrderFeeDto` 字段变更。

### 3.2 列表 — `GET StatementAdmin/GetPagedListAsync`

与详情共享 `StatementDto`：`client`、`statementCurrencyGroup[].currency` 结构同上；`creatorUserName` 仍平铺。

### 3.3 未对账费用分组 — `GET StatementAdmin/GetOrderFeeGroupAsync`

业务下费用 `OrderFeeDto[]`，字段变更见第 4 节。

### 3.4 对账前端适配清单

- [ ] 对账单头：`client.name` / `client.code` / `client.fullName`
- [ ] 币别汇总：`currency.code` / `currency.cnName`
- [ ] 费用行：`feeCode` / `currency` / `settlement`
- [ ] 创建人仍用 `creatorUserName`
- [ ] 打印模板客户字段改为 `Client.Name`/`Client.FullName`

---

## 4. 业务费用 OrderFeeDto（全局）

### 4.1 删除字段（勿再读取）

| 原 JSON 字段     | 原类型 | 原含义         |
| :--------------- | :----- | :------------- |
| `feeCodeName`    | string | 费用代码中文名 |
| `feeCodeCode`    | string | 费用代码 Code  |
| `currencyName`   | string | 币别中文名     |
| `currencyCode`   | string | 币别 Code      |
| `settlementName` | string | 结算对象名称   |
| `settlementCode` | string | 结算对象代码   |

### 4.2 新增/使用字段

| JSON 字段         | 类型                | 说明                               |
| :---------------- | :------------------ | :--------------------------------- |
| `feeCode`         | `FeeCodeSimpleDto`  | 替代 feeCodeName/feeCodeCode       |
| `currency`        | `CurrencySimpleDto` | 替代 currencyName/currencyCode     |
| `settlement`      | `ClientSimpleDto`   | 替代 settlementName/settlementCode |
| `creatorUserName` | string              | **仍平铺**，创建人昵称             |

主键 Id 不变：`feeCodeId` / `currencyId` / `settlementId` 仍返回。

### 4.3 SimpleDto 常用字段

**FeeCodeSimpleDto**

| JSON                              | 类型    | 说明                       |
| :-------------------------------- | :------ | :------------------------- |
| `id`                              | long    | 费用代码Id                 |
| `code`                            | string  | 费用代码（原 feeCodeCode） |
| `cnName`                          | string  | 中文名（原 feeCodeName）   |
| `enName`                          | string  | 英文名                     |
| `currencyId`                      | long    | 默认币别Id                 |
| `defaultUnit` / `defaultUnitName` | string  | 默认计费标准               |
| `isConfidential`                  | bool    | 是否机密                   |
| `isInvoiceProhibit`               | bool    | 禁开发票                   |
| `taxRate`                         | decimal | 默认税率                   |

**CurrencySimpleDto**

| JSON          | 类型    | 说明                        |
| :------------ | :------ | :-------------------------- |
| `code`        | string  | 币别代码（原 currencyCode） |
| `cnName`      | string  | 中文名（原 currencyName）   |
| `enName`      | string  | 英文名                      |
| `defaultRate` | decimal | 默认汇率                    |

**ClientSimpleDto（settlement / client）**

| JSON       | 类型   | 说明   |
| :--------- | :----- | :----- |
| `id`       | Guid   | 客户Id |
| `name`     | string | 简称   |
| `code`     | string | 代码   |
| `fullName` | string | 全称   |
| `enName`   | string | 英文名 |

### 4.4 字段映射速查

| 旧写法                 | 新写法                   |
| :--------------------- | :----------------------- |
| `fee.feeCodeName`      | `fee.feeCode?.cnName`    |
| `fee.feeCodeCode`      | `fee.feeCode?.code`      |
| `fee.currencyName`     | `fee.currency?.cnName`   |
| `fee.currencyCode`     | `fee.currency?.code`     |
| `fee.settlementName`   | `fee.settlement?.name`   |
| `fee.settlementCode`   | `fee.settlement?.code`   |
| `statement.clientName` | `statement.client?.name` |
| `statement.clientCode` | `statement.client?.code` |
| `group.currencyCode`   | `group.currency?.code`   |

---

## 5. 受影响接口清单（含 OrderFeeDto 嵌套）

路由前缀均为 `/api/services/app/{ServiceName}`。

### 5.1 业务费用 OrderFeeAdmin

| 接口 | 方法 | 路径 | 出参中费用位置 |
| :-- | :-- | :-- | :-- |
| 费用分页列表 | GET | `OrderFeeAdmin/GetPagedListAsync` | 列表项 `OrderFeeDto` |
| 费用详情 | GET | `OrderFeeAdmin/DetailAsync` | 根 `OrderFeeDto` |
| 申请修改费用 | POST | `OrderFeeAdmin/ModifyOrderFeeAsync` | 任务内容序列化费用预览为 `OrderFeeDto`（接口返回 Guid） |
| 费用任务列表 | GET | `OrderFeeAdmin/OrderFeeTaskListAsync` | `orderFeeTasks[]` 为 `OrderFeeAndTaskDto` |
| 费用任务详情 | GET | `OrderFeeAdmin/OrderFeeTaskDetailAsync` | 费用行 `OrderFeeAndTaskDto` |

### 5.2 客户对账 StatementAdmin

| 接口 | 方法 | 路径 | 出参位置 |
| :-- | :-- | :-- | :-- |
| 对账详情 | GET | `StatementAdmin/DetailAsync` | 头 `client`；`statementCurrencyGroup[].currency`；`orderFeeGroups[].orderFees[]` |
| 对账列表 | GET | `StatementAdmin/GetPagedListAsync` | 头 `client`；`statementCurrencyGroup[].currency` |
| 未对账费用按业务分组 | GET | `StatementAdmin/GetOrderFeeGroupAsync` | 业务下 `OrderFeeDto[]` |

### 5.3 海运出口 / 进口 / 空运出口

| 接口 | 方法 | 路径 | 出参中费用位置 |
| :-- | :-- | :-- | :-- |
| 海运出口列表/详情 | GET | `SeaExportAdmin/GetPagedListAsync`、`DetailAsync` | `transportOrder.orderFees[]` 或等价 |
| 海运进口列表/详情 | GET | `SeaImportAdmin/GetPagedListAsync`、`DetailAsync` | 同上 |
| 空运出口列表/详情 | GET | `AirExportAdmin/GetPagedListAsync`、`DetailAsync` | 同上 |

### 5.4 其它嵌套 OrderFeeDto 的模块

| 模块 | 方法 | 路径 | 出参中费用位置 |
| :-- | :-- | :-- | :-- |
| 服务项任务 | GET | `SeServiceTaskAdmin/*`（含费用填充） | `transportOrder.orderFees[]` |
| 更改单 | GET | `ChangeOrderAdmin/DetailAsync` | `orderFees[]` |
| 付费申请 | GET | `PaymentApplicationAdmin/DetailAsync` 等 | 业务分组内 `OrderFeeDto` |
| 付费结算 | GET | `PaymentSettlementAdmin/DetailAsync`、`DetailByCurrencyAsync` | 嵌套 `OrderFeeDto` |
| 收费结算 | GET | `ReceiveSettlementAdmin/DetailAsync` 等 | 嵌套 `OrderFeeDto` |
| 开票申请 | GET | `InvoiceApplicationAdmin/DetailAsync` | 明细关联 `OrderFeeDto` |
| 发票开出 | GET | `InvoiceIssueAdmin/DetailAsync` 等 | 嵌套 `OrderFeeDto` |
| 打印 | POST/GET | `PrintFormatAdmin/*` | 占位符改读对象；模板旧平铺列需改绑 |

> 付费申请**头**上的 `settlement`/`currency` 对象化是既有结构；本次仅改嵌套 `OrderFeeDto` 平铺字段。

---

## 6. 前端适配清单（总）

- [ ] 对账单头：`client.name` / `client.code` / `client.fullName`
- [ ] 对账币别汇总：`currency.code` / `currency.cnName`
- [ ] 全局搜索费用行 `feeCodeName`/`currencyName`/`settlementName`/`feeCodeCode`/`currencyCode`/`settlementCode` 并替换为对象路径
- [ ] 表格、筛选、导出、打印模板同步改绑；空值用可选链 `fee.feeCode?.cnName`
- [ ] 确认 `creatorUserName` 仍可用
- [ ] `OrderFeeEditDto.originalInfo` 的 `feeCodeCode`/`settlementName`/`currencyCode` 勿误删

---

## 7. 避坑指南

- AutoMapper 映射实体 `OrderFee.FeeCode`/`Currency` 导航时，若未 Include 则为 null，业务代码需显式赋值 SimpleDto。
- 前端/打印若仍绑「费用代码名称」等旧 Description 平铺列会取空，需改绑 `FeeCode.CnName` 等对象路径。
- 其它 DTO 自有的 `settlementName`/`currencyCode`（付费申请任务项、开票申请头、银行账户等）**不在本次删除范围**。
- 打印专用 `StatementCurrencyFeeCodeDto` 仍为平铺（FastReport）。
