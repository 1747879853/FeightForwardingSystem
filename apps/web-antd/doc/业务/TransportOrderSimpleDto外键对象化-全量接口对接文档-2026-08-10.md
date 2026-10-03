---
title: TransportOrderSimpleDto / 开票费用分组外键对象化
module: 业务（跨开票申请、对账、结算、费用任务等）
author: Cursor
last_updated: 2026-08-10
---

# TransportOrderSimpleDto 外键对象化 — 全量接口对接文档

## 1. 背景意图

详情/列表返回关联外键除 **User 表昵称** 外禁止平铺，统一返回 SimpleDto；历史平铺字段**直接删除**。

本次统一变更两类出参：

1. **`TransportOrderSimpleDto`（含 `TransportOrderSimplePrintDto`）**：委托单位、包装对象化
2. **`InvoiceApplicationFeeDto`**（仅开票申请加费用分组）：费用代码、币别、结算对象对象化

> 本文档为**唯一**前端对接入口，勿再按模块拆多份分散文档。

---

## 2. 共享 DTO 字段变更（全局）

### 2.1 `TransportOrderSimpleDto`

| 变更 | 原 JSON | 新 JSON | 类型 | 说明 |
| :-- | :-- | :-- | :-- | :-- |
| 删除 | `clientName` | — | — | 历史平铺，已删 |
| 新增 | — | `client` | `ClientSimpleDto` | `id` / `name` / `code` / `fullName` |
| 删除 | `codePackageName` | — | — | 历史平铺，已删 |
| 新增 | — | `codePackage` | `CodePackageSimpleDto` | `id` / `name` / `ediCode` |
| 保留 | `codePackageId` | `codePackageId` | `long?` | 包装主键 |
| 保留 | `clientId` | `clientId` | `Guid` | 委托单位主键 |

**映射：**

| 旧写法                           | 新写法                             |
| :------------------------------- | :--------------------------------- |
| `transportOrder.clientName`      | `transportOrder.client?.name`      |
| `transportOrder.codePackageName` | `transportOrder.codePackage?.name` |

### 2.2 `InvoiceApplicationFeeDto`（仅开票申请 `GetOrderFeeGroupAsync`）

| 变更 | 原 JSON | 新 JSON | 类型 |
| :-- | :-- | :-- | :-- |
| 删除 | `feeCodeName` | — | — |
| 新增 | — | `feeCodeId` | `long` |
| 新增 | — | `feeCode` | `FeeCodeSimpleDto` |
| 删除 | `currencyCode` | — | — |
| 新增 | — | `currency` | `CurrencySimpleDto` |
| 删除 | `settlementName` | — | — |
| 新增 | — | `settlement` | `ClientSimpleDto` |
| 新增 | — | `creatorUserName` | `string`（User 昵称，**仍平铺**） |

保留：`currencyId`、`settlementId`、`creatorUserId`、金额与状态字段。

**映射：**

| 旧写法               | 新写法                 |
| :------------------- | :--------------------- |
| `fee.feeCodeName`    | `fee.feeCode?.cnName`  |
| `fee.currencyCode`   | `fee.currency?.code`   |
| `fee.settlementName` | `fee.settlement?.name` |
| （无）               | `fee.creatorUserName`  |

### 2.3 SimpleDto 常用字段

**ClientSimpleDto（`client` / `settlement`）**

| JSON       | 类型   | 说明 |
| :--------- | :----- | :--- |
| `id`       | Guid   | 主键 |
| `name`     | string | 简称 |
| `code`     | string | 代码 |
| `fullName` | string | 全称 |

**CodePackageSimpleDto（`codePackage`）**

| JSON      | 类型   | 说明     |
| :-------- | :----- | :------- |
| `id`      | long   | 主键     |
| `name`    | string | 包装名   |
| `ediCode` | string | EDI 代码 |

**FeeCodeSimpleDto（`feeCode`）**

| JSON     | 类型   | 说明     |
| :------- | :----- | :------- |
| `id`     | long   | 主键     |
| `code`   | string | 费用代码 |
| `cnName` | string | 中文名   |
| `enName` | string | 英文名   |

**CurrencySimpleDto（`currency`）**

| JSON          | 类型    | 说明     |
| :------------ | :------ | :------- |
| `code`        | string  | 币别代码 |
| `cnName`      | string  | 中文名   |
| `enName`      | string  | 英文名   |
| `defaultRate` | decimal | 默认汇率 |

---

## 3. 受影响接口清单（全部）

路由前缀均为 `/api/services/app/{ServiceName}`。

### 3.1 开票申请 `InvoiceApplicationAdmin`

| 接口 | 方法 | 出参位置 | 变更要点 |
| :-- | :-- | :-- | :-- |
| `GetOrderFeeGroupAsync` | GET | `items[].transportOrder` + `items[].orderFees[]` | 业务：`client`/`codePackage`；费用：`feeCode`/`currency`/`settlement`/`creatorUserName` |
| `DetailAsync` | GET | `feeGroups[].transportOrder` | 业务：`client`/`codePackage`（明细内费用仍为既有 `OrderFeeDto` 对象化） |

### 3.2 客户对账 `StatementAdmin`

| 接口 | 方法 | 出参位置 | 变更要点 |
| :-- | :-- | :-- | :-- |
| `DetailAsync` | GET | `orderFeeGroups[].transportOrder` | `client`/`codePackage`；打印专用平铺 DTO 从对象取值 |

### 3.3 业务费用 `OrderFeeAdmin`

| 接口 | 方法 | 出参位置 | 变更要点 |
| :-- | :-- | :-- | :-- |
| `OrderFeeTaskListAsync` | GET | `items[].transportOrder` | `codePackage`（及共享 DTO 契约） |
| `OrderFeeTaskDetailAsync` | GET | `transportOrder` | 同上 |

### 3.4 收费结算 `ReceiveSettlementAdmin`

| 接口 | 方法 | 出参位置 | 变更要点 |
| :-- | :-- | :-- | :-- |
| `GetOrderFeeGroupAsync` | GET | `items[].transportOrder` | `client`（替代 `clientName`） |
| `GetInvoiceApplicationGroupForSettlementAsync` | GET | `items[].items[].transportOrder` | `client` |
| `DetailAsync` | GET | `receiveSettlementItems[].transportOrder`、`receiveSettlementInvoiceItems[].transportOrder` | `client` |
| `GetDetailsByBankStatementAsync` | GET | 同上（详情结构） | `client` |

### 3.5 付费申请 `PaymentApplicationAdmin`

| 接口 | 方法 | 出参位置 | 变更要点 |
| :-- | :-- | :-- | :-- |
| `GetPagedListAsync` | GET | 费用行嵌套 `transportOrder`（`TransportOrderSimplePrintDto`） | `client` |
| `GetPagedListForSettlementAsync` | GET | 同上 | `client` |
| `GetPagedListByCurrencyForSettlementAsync` | GET | 同上 | `client` |
| `DetailAsync` | GET | 分组内 `transportOrder`（`ProjectTo` SimpleDto） | 共享 DTO 契约：`client`/`codePackage`（勿读平铺名） |

### 3.6 付费结算 `PaymentSettlementAdmin`

| 接口                    | 方法 | 出参位置                        | 变更要点 |
| :---------------------- | :--- | :------------------------------ | :------- |
| `DetailAsync`           | GET  | 付费申请费用行 `transportOrder` | `client` |
| `DetailByCurrencyAsync` | GET  | 同上                            | `client` |

### 3.7 发票开出 `InvoiceIssueAdmin`

| 接口 | 方法 | 出参位置 | 变更要点 |
| :-- | :-- | :-- | :-- |
| `DetailAsync` | GET | 开票申请明细费用上 `orderFee.transportOrder` | `client` |
| `GetPagedListAsync` | GET | 若嵌套同结构 | 同共享 DTO 契约 |

---

## 4. 开票申请 `GetOrderFeeGroupAsync` 出参示例

`GET /api/services/app/InvoiceApplicationAdmin/GetOrderFeeGroupAsync`

```json
{
  "totalCount": 1,
  "items": [
    {
      "transportOrder": {
        "id": "guid",
        "userId": 1,
        "commissionNum": "C2026001",
        "mblNum": "MBL001",
        "bookingNum": "BK001",
        "client": {
          "id": "guid",
          "name": "客户A",
          "code": "C001",
          "fullName": "客户A有限公司"
        },
        "codePackageId": 1,
        "codePackage": { "id": 1, "name": "CARTONS", "ediCode": "CT" },
        "etd": "2026-06-01T00:00:00",
        "seaExport": {
          "vessel": "EVER GIVEN",
          "innerVoyno": "V001",
          "pol": {
            "id": 1,
            "portName": "CNSHA",
            "cnName": "上海",
            "ediCode": "CNSHA",
            "lane": {
              "id": 5,
              "code": "FE",
              "laneName": "远东航线",
              "laneEnName": "FAR EAST",
              "ediCode": "FE"
            },
            "country": {
              "id": 9,
              "code": "CN",
              "countryName": "中国",
              "countryEnName": "CHINA"
            }
          },
          "pod": {
            "id": 2,
            "portName": "USLAX",
            "cnName": "洛杉矶",
            "ediCode": "USLAX",
            "lane": {
              "id": 7,
              "code": "NA",
              "laneName": "北美航线",
              "laneEnName": "NORTH AMERICA",
              "ediCode": "NA"
            },
            "country": {
              "id": 12,
              "code": "US",
              "countryName": "美国",
              "countryEnName": "UNITED STATES"
            }
          },
          "carrier": { "id": 1, "cnName": "中远", "code": "COSCO" }
        }
      },
      "orderFees": [
        {
          "id": "fee-guid",
          "feeCodeId": 1,
          "feeCode": { "id": 1, "code": "OCEAN", "cnName": "海运费" },
          "currencyId": 1,
          "currency": { "code": "CNY", "cnName": "人民币" },
          "amount": 10000,
          "remainingInvoiceAmount": 5000,
          "settlementId": "guid",
          "settlement": { "id": "guid", "name": "客户A", "code": "C001" },
          "creatorUserId": 1,
          "creatorUserName": "张三",
          "accountDate": "2026-06-01T00:00:00"
        }
      ]
    }
  ]
}
```

---

## 5. 前端适配总清单

- [ ] 全局搜索并替换：`clientName` → `client?.name`（仅业务 SimpleDto 场景）
- [ ] 全局搜索并替换：`codePackageName` → `codePackage?.name`（仅业务 SimpleDto 场景）
- [ ] 开票申请加费用：`feeCodeName`/`currencyCode`/`settlementName` → 对象字段
- [ ] 开票申请加费用录入人：用 `creatorUserName`
- [ ] `seaExport.pol`/`pod`/`carrier` 此前已对象化，无需再改
- [ ] **不要**改 User 昵称平铺（`creatorUserName` 等）
- [ ] 对账单 **FastReport 打印** 专用平铺 DTO 仍由后端从对象回填，前端联调接口 JSON 即可

---

## 6. 避坑

1. `TransportOrderDto`（完整业务 DTO，海运出口列表等）上的 `codePackageName` 等平铺字段**不在本次删除范围**；本次仅改 **`TransportOrderSimpleDto`**。
2. 箱型子表 `OrderCtn` 等上的 `codePackageName` 仍为各模块既有结构，勿与本次 SimpleDto 混淆。
3. 打印模板占位符若绑的是 `ClientName`/`CodePackageName`，对账单打印侧已改为从 `Client`/`CodePackage` 取值再写入打印平铺 DTO。

---

## 7. 涉及后端文件（备查）

| 文件 | 说明 |
| :-- | :-- |
| `App/TransportOrder/Dto/TransportOrderDto.cs` | `TransportOrderSimpleDto` 删平铺、加对象 |
| `App/InvoiceApplication/Dto/InvoiceApplicationDto.cs` | `InvoiceApplicationFeeDto` 对象化 |
| `App/InvoiceApplication/InvoiceApplicationAdminAppService.cs` | 加费用分组 / 详情 |
| `App/Statement/StatementAdminAppService.cs` | 对账详情 |
| `App/Statement/StatementCurrencyFeeCodeFlatMapper.cs` | 打印平铺取值 |
| `App/OrderFee/OrderFeeAdminAppService.cs` | 费用任务列表/详情 |
| `App/ReceiveSettlement/ReceiveSettlementAdminAppService.cs` | 收费结算多接口 |
| `App/PaymentApplication/PaymentApplicationAdminAppService.cs` | 付费申请列表/详情 |
| `App/PaymentSettlement/PaymentSettlementAdminAppService.cs` | 付费结算详情 |
| `App/InvoiceIssue/InvoiceIssueAdminAppService.cs` | 发票开出详情 |
