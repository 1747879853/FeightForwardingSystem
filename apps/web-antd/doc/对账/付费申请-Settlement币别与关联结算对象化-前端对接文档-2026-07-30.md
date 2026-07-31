# 付费申请 — Settlement / Currency / 关联结算对象化（前端对接）

**变更日期**：2026-07-30  
**关联后端文档**：《付费申请-2026-07-30》  
**破坏性**：是（旧字段已删除）

## 涉及接口

| 接口 | 方法 | 地址 |
|------|------|------|
| 付费申请分页列表 | GET | `/api/services/app/PaymentApplicationAdmin/GetPagedListAsync` |
| 付费结算可选申请列表 | GET | `/api/services/app/PaymentApplicationAdmin/GetPagedListForSettlementAsync` |
| 付费申请详情 | GET | `/api/services/app/PaymentApplicationAdmin/DetailAsync` |

以上接口出参中的 `PaymentApplicationDto` 均按下列字段变更生效。

---

## 字段变更一览

| 操作 | 旧字段 | 新字段 | 类型 | 列表 | 详情 |
|------|--------|--------|------|------|------|
| 删除 | `clientName` | — | `string` | — | — |
| 删除 | `currencyCode` | — | `string` | — | — |
| 删除 | `paymentSettlementAttachments` | — | `AttachmentItemDto[]` | — | — |
| 统一/新增 | — | `settlement` | `ClientSimpleDtoForOrder` | ✅ | ✅ |
| 统一/新增 | — | `currency` | `CurrencySimpleDto` | ✅ | ✅ |
| 新增 | — | `paymentSettlements` | `PaymentSettlementForApplicationSimpleDto[]` | ✅ | ✅ |

`settlementId`、`currencyId` 仍保留。

---

## 新对象字段

### `settlement`（`ClientSimpleDtoForOrder`）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `guid` | 客户ID |
| `name` | `string` | 简称 |
| `fullName` | `string` | 全称 |
| `address` | `string` | 默认地址，可能为空 |

### `currency`（`CurrencySimpleDto`）

| 字段 | 类型 | 说明 |
|------|------|------|
| `code` | `string` | 币别代码 |
| `cnName` | `string` | 中文名 |
| `enName` | `string` | 英文名 |
| `defaultRate` | `number` | 默认汇率（来自后端币别缓存） |

原币申请时 `currency` 为 `null`。

### `paymentSettlements[]`（`PaymentSettlementForApplicationSimpleDto`）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `guid` | 付费结算ID |
| `settlementNo` | `string` | 结算单号 |
| `settlementTime` | `datetime` | 结算时间 |
| `settlement` | `ClientSimpleDtoForOrder` | 结算对象：`id` / `name` / `fullName` / `address` |
| `currency` | `CurrencySimpleDto` | 结算币别：`code` / `cnName` / `enName` / `defaultRate` |
| `totalSettledPrice` | `number` | 结算金额合计(结算币别)=SUM(SettledAmount * Rate)，与付费结算列表同口径（整张结算单） |
| `attachments` | `AttachmentItemDto[]` | 该结算单附件（含下载 Url、创建人昵称等，结构同原附件项） |

无关联结算时为 `[]`。

---

## 前端改造对照

```text
旧：item.clientName
新：item.settlement?.name          // 全称：item.settlement?.fullName

旧：item.currencyCode
新：item.currency?.code

旧：item.paymentSettlementAttachments   // 全申请平铺附件
新：item.paymentSettlements             // 按结算单分组
    item.paymentSettlements.forEach(ps => {
      // ps.settlementNo / ps.settlementTime / ps.settlement / ps.currency / ps.totalSettledPrice / ps.attachments
    })
```

### 出参示例（节选）

```json
{
  "id": "...",
  "applicationNo": "PA...",
  "settlementId": "...",
  "currencyId": 1,
  "settlement": {
    "id": "...",
    "name": "客户简称",
    "fullName": "客户全称",
    "address": "默认地址"
  },
  "currency": {
    "code": "USD",
    "cnName": "美元",
    "enName": "US Dollar",
    "defaultRate": 7.2
  },
  "paymentSettlements": [
    {
      "id": "...",
      "settlementNo": "PS...",
      "settlementTime": "2026-07-30T10:00:00",
      "settlement": {
        "id": "...",
        "name": "结算对象简称",
        "fullName": "结算对象全称",
        "address": "默认地址"
      },
      "currency": {
        "code": "USD",
        "cnName": "美元",
        "enName": "US Dollar",
        "defaultRate": 7.2
      },
      "totalSettledPrice": 1000.00,
      "attachments": [
        {
          "id": 1,
          "attachmentId": 100,
          "itemId": "...",
          "moduleTypeId": "...",
          "url": "...",
          "creatorUserName": "张三",
          "displayOrder": 0
        }
      ]
    }
  ]
}
```

---

## 注意

1. **勿与 `attachmentGroup` 混淆**：`attachmentGroup` 仍是付费申请自身附件（仅详情）；`paymentSettlements[].attachments` 是关联付费结算的附件。
2. **列表已可展示结算对象全称/地址、币别对象、关联结算及附件**，不必再为列表单独调客户/币别接口（除非业务需要更多字段）。
3. 打印/列表原先读 `clientName` / `currencyCode` 的地方需一次性改完，后端不再回填旧字段。
4. **出参结构不变**：后端仅将币别/用户展示数据改为读缓存，前端字段与对接方式无额外变更；`currency.defaultRate`、附件 `creatorUserName` 等仍按上表使用即可。