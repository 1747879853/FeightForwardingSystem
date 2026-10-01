# 海运出口运价 SeFreiPriceAdmin 前端对接文档

## 数据结构说明

### 表关系

- **SeFreiPrice**（运价主表，含币别CurrencyId、约号ContractNo、订舱代理BookingAgentId）
  - **SeFreiPriceCtn**（运价箱型，主表的子表，含成本 Cost、可空指导价 SugPrice）
  - **SeFreiPriceFee**（运价费用，主表的子表，含币别CurrencyId、附加费计费方式PriceFeeType、价格Price）
    - **SeFreiPriceCtnFee**（运价箱型费用，交叉表，关联箱型和费用，仅PriceFeeType==Ctn时使用）
  - **SeFreiPriceDay**（关联日，主表的子表，0到多条，含 ETD、CloseDocTime、ClosingTime）
  - **SeFreiPriceWeekDay**（关联周几，主表的子表，0到多条，含 ETD/CloseDoc/Closing 的周几与时间点）

> BookingAgentId 关联客户表（App_Clients），代表给货代公司供货的订舱代理（国内代理），可空。新增和编辑时，SeFreiPriceCtnFee 通过 `CtnCodeId` 关联箱型（而非 SeFreiPriceCtnId），后端会自动映射。关联日（SeFreiPriceDay）和关联周几（SeFreiPriceWeekDay）在编辑时采用**删除重建**策略。SeFreiPriceDay 中 ETD（开船日）、CloseDocTime（截单时间）、ClosingTime（截港时间/截关时间）三类日期作为一组存储；SeFreiPriceWeekDay 中存储对应的周几与时间点（共6个字段，均可空）。SeFreiPriceFee 的 `PriceFeeType` 为必填字段，支持两种计费模式：当 `PriceFeeType` == `Ctn`(0) 时为按集装箱计费，此时由 `SeFreiPriceCtnFees` 提供各箱型价格，`Price` 必须为空；当 `PriceFeeType` != `Ctn`（如 `Order`=1 按票）时为固定计费，此时使用 `Price` 字段，不允许填写箱型费用。

### 枚举说明

| 枚举 | 值 | 说明 |
| --- | --- | --- |
| PriceFeeType | 0=Ctn(按集装箱), 1=Order(按票) | 附加费计费方式（必填） |
| FreiPricePropType | 0=XXX | 条件类型（运价要比较字段类型） |
| OperatorType | 0=大于, 1=大于等于, 2=小于, 3=小于等于 | 算符类型 |

---

## 1. 新增运价

- **请求路径**: `POST /api/services/app/seFreiPriceAdmin/AddAsync`
- **权限**: `Admin.SeFreiPrice.Add`

### 请求体 SeFreiPriceAddDto

```json
{
  "recommend": true,
  "carrierId": 1,
  "bookingAgentId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "polId": 1,
  "podId": 2,
  "isDirect": true,
  "pot1Id": null,
  "pot2Id": null,
  "polFreeDays": 14,
  "podFreeDays": 14,
  "poddem": null,
  "poddet": null,
  "voyage": "2周",
  "vesselVoyage": "EVER GIVEN/0123W",
  "validTimeStart": "2026-05-01T00:00:00",
  "validTimeEnd": "2026-06-01T00:00:00",
  "remark": "备注",
  "currencyId": 1,
  "contractNo": "CONT-2026-001",
  "seFreiPriceCtns": [
    {
      "ctnCodeId": 1,
      "cost": 100,
      "sugPrice": 120,
      "remark": "20GP备注"
    },
    {
      "ctnCodeId": 2,
      "cost": 200,
      "sugPrice": null,
      "remark": "40GP备注"
    }
  ],
  "seFreiPriceFees": [
    {
      "feeCodeId": 1,
      "currencyId": 1,
      "priceFeeType": 0,
      "price": null,
      "seFreiPriceCtnFees": [
        {
          "ctnCodeId": 1,
          "price": 500.0,
          "conditionType": null,
          "operatorType": null,
          "value": null,
          "otherPrice": null
        },
        {
          "ctnCodeId": 2,
          "price": 800.0,
          "conditionType": 0,
          "operatorType": 0,
          "value": 5,
          "otherPrice": 600.0
        }
      ]
    },
    {
      "feeCodeId": 2,
      "currencyId": 1,
      "priceFeeType": 1,
      "price": 200.0,
      "seFreiPriceCtnFees": []
    }
  ],
  "seFreiPriceDays": [
    {
      "etd": "2026-05-01T00:00:00",
      "closeDocTime": "2026-04-28T00:00:00",
      "closingTime": "2026-04-29T00:00:00"
    },
    {
      "etd": "2026-05-08T00:00:00",
      "closeDocTime": "2026-05-05T00:00:00",
      "closingTime": "2026-05-06T00:00:00"
    }
  ],
  "seFreiPriceWeekDays": [
    {
      "etdDayOfWeek": 1,
      "etdDayTime": "08:30:00",
      "closeDocDayOfWeek": 5,
      "closeDocDayTime": "12:00:00",
      "closingDayOfWeek": 6,
      "closingDayTime": "18:00:00"
    },
    {
      "etdDayOfWeek": 4,
      "etdDayTime": "14:00:00",
      "closeDocDayOfWeek": 3,
      "closeDocDayTime": "10:00:00",
      "closingDayOfWeek": 4,
      "closingDayTime": "16:00:00"
    }
  ]
}
```

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| recommend | bool | 是 | 是否推荐 |
| carrierId | long | 是 | 船公司id |
| bookingAgentId | Guid? | 否 | 订舱代理id（客户表中的客户id，可空） |
| polId | long | 是 | 起运港id |
| podId | long | 是 | 目的港id |
| isDirect | bool | 是 | 是否直达 |
| pot1Id | long? | 否 | 中转港1id |
| pot2Id | long? | 否 | 中转港2id |
| polFreeDays | int? | 否 | 起运港免用箱天数 |
| podFreeDays | int? | 否 | 目的港免用箱天数 |
| poddem | int? | 否 | 目的港免堆期天数 |
| poddet | int? | 否 | 目的港免箱期天数 |
| voyage | string | 否 | 航程 |
| vesselVoyage | string | 否 | 船名航次，最长 100，可空。与航程 voyage 不是同一字段 |
| validTimeStart | DateTime | 是 | 有效时间起 |
| validTimeEnd | DateTime | 是 | 有效时间止 |
| remark | string | 否 | 备注 |
| currencyId | long | 是 | 币别Id |
| contractNo | string | 否 | 约号 |
| seFreiPriceCtns | array | 否 | 运价箱型列表 |
| seFreiPriceFees | array | 否 | 运价费用列表 |
| seFreiPriceDays | array | 否 | 关联日列表（0到多条，每项含 etd、closeDocTime、closingTime） |
| seFreiPriceWeekDays | array | 否 | 关联周几列表（0到多条，每项含6个周几/时间点字段） |

### SeFreiPriceCtnAddDto（箱型子项）

| 字段      | 类型   | 必填 | 说明   |
| --------- | ------ | ---- | ------ |
| ctnCodeId | long   | 是   | 箱型Id |
| cost      | int    | 是   | 成本   |
| sugPrice  | int?   | 否   | 指导价 |
| remark    | string | 否   | 备注   |

### SeFreiPriceFeeAddDto（费用子项）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| feeCodeId | long | 是 | 费用代码Id |
| currencyId | long | 是 | 币别Id |
| priceFeeType | PriceFeeType (enum int) | 是 | 附加费计费方式（0=Ctn按集装箱, 1=Order按票） |
| price | decimal? | 条件必填 | 价格（priceFeeType!=Ctn时**必填**，priceFeeType==Ctn时**必须为空**） |
| seFreiPriceCtnFees | array | 条件限制 | 箱型费用列表（priceFeeType!=Ctn时**不能有值**，priceFeeType==Ctn时按需填写） |

> **费用计费方式验证规则**：
>
> - `priceFeeType` == `Ctn`(0)：`price` 必须为空，`seFreiPriceCtnFees` 按需填写（按集装箱计费模式）
> - `priceFeeType` != `Ctn`（如 `Order`=1）：`price` 必须有值，`seFreiPriceCtnFees` 必须为空（固定计费模式，如按票）

### SeFreiPriceCtnFeeAddDto（箱型费用子项，嵌套在费用下）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| ctnCodeId | long | 是 | **箱型Id**（通过CtnCodeId关联，非Guid） |
| price | decimal | 是 | 价格 |
| conditionType | FreiPricePropType? (enum int) | 否 | 条件类型（枚举：0=XXX） |
| operatorType | OperatorType? (enum int) | 否 | 算符类型（枚举：0=大于, 1=大于等于, 2=小于, 3=小于等于） |
| value | int? | 否 | 要比较的值 |
| otherPrice | decimal? | 否 | 否则的价格 |

### SeFreiPriceDayAddDto（关联日子项）

| 字段         | 类型      | 必填 | 说明              |
| ------------ | --------- | ---- | ----------------- |
| etd          | DateTime? | 否   | 开船日            |
| closeDocTime | DateTime? | 否   | 截单时间          |
| closingTime  | DateTime? | 否   | 截港时间/截关时间 |

### SeFreiPriceWeekDayAddDto（关联周几子项）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| etdDayOfWeek | DayOfWeek? (enum int) | 否 | 开船日 周几（0=Sunday, 1=Monday, ...6=Saturday） |
| etdDayTime | TimeSpan? (string) | 否 | 开船日 一天中的时间点（如 "08:30:00"） |
| closeDocDayOfWeek | DayOfWeek? (enum int) | 否 | 截单时间 周几 |
| closeDocDayTime | TimeSpan? (string) | 否 | 截单时间 一天中的时间点 |
| closingDayOfWeek | DayOfWeek? (enum int) | 否 | 截港时间 周几 |
| closingDayTime | TimeSpan? (string) | 否 | 截港时间 一天中的时间点 |

### 响应

```json
"3fa85f64-5717-4562-b3fc-2c963f66afa6"
```

返回新增的运价主键Id（Guid）。

---

## 2. 删除运价

- **请求路径**: `DELETE /api/services/app/seFreiPriceAdmin/DeleteAsync`
- **权限**: `Admin.SeFreiPrice.Delete`

### 请求体 GuidIdDto

```json
{
  "ids": ["3fa85f64-5717-4562-b3fc-2c963f66afa6"]
}
```

### 响应

```json
true
```

> 会同时删除该运价下的所有箱型、费用、箱型费用交叉数据、关联日和关联周几数据。

---

## 3. 编辑运价

- **请求路径**: `PUT /api/services/app/seFreiPriceAdmin/EditAsync`
- **权限**: `Admin.SeFreiPrice.Edit`

### 请求体 SeFreiPriceEditDto

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "recommend": true,
  "carrierId": 1,
  "bookingAgentId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "polId": 1,
  "podId": 2,
  "isDirect": true,
  "pot1Id": null,
  "pot2Id": null,
  "polFreeDays": 14,
  "podFreeDays": 14,
  "poddem": null,
  "poddet": null,
  "voyage": "2周",
  "vesselVoyage": "EVER GIVEN/0123W",
  "validTimeStart": "2026-05-01T00:00:00",
  "validTimeEnd": "2026-06-01T00:00:00",
  "remark": "备注",
  "currencyId": 1,
  "contractNo": "CONT-2026-001",
  "seFreiPriceCtns": [
    {
      "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "ctnCodeId": 1,
      "cost": 100,
      "sugPrice": 120,
      "remark": "20GP备注"
    },
    {
      "id": null,
      "ctnCodeId": 3,
      "cost": 300,
      "sugPrice": null,
      "remark": "新增箱型"
    }
  ],
  "seFreiPriceFees": [
    {
      "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "feeCodeId": 1,
      "currencyId": 1,
      "priceFeeType": 0,
      "price": null,
      "seFreiPriceCtnFees": [
        {
          "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
          "ctnCodeId": 1,
          "price": 550.0,
          "conditionType": null,
          "operatorType": null,
          "value": null,
          "otherPrice": null
        },
        {
          "id": null,
          "ctnCodeId": 3,
          "price": 900.0,
          "conditionType": null,
          "operatorType": null,
          "value": null,
          "otherPrice": null
        }
      ]
    },
    {
      "id": null,
      "feeCodeId": 2,
      "currencyId": 1,
      "priceFeeType": 1,
      "price": 200.0,
      "seFreiPriceCtnFees": []
    }
  ],
  "seFreiPriceDays": [
    {
      "etd": "2026-05-01T00:00:00",
      "closeDocTime": "2026-04-28T00:00:00",
      "closingTime": "2026-04-29T00:00:00"
    },
    {
      "etd": "2026-05-15T00:00:00",
      "closeDocTime": "2026-05-12T00:00:00",
      "closingTime": "2026-05-13T00:00:00"
    }
  ],
  "seFreiPriceWeekDays": [
    {
      "etdDayOfWeek": 1,
      "etdDayTime": "08:30:00",
      "closeDocDayOfWeek": 5,
      "closeDocDayTime": "12:00:00",
      "closingDayOfWeek": 6,
      "closingDayTime": "18:00:00"
    }
  ]
}
```

### 编辑逻辑说明

**处理顺序**：先处理关联日和关联周几（删除重建） → 箱型和费用子表 → SaveChanges → 再处理箱型费用交叉表

**关联日（seFreiPriceDays）**:

- 编辑时**删除该运价下所有已有关联日**，然后根据输入重新创建

**关联周几（seFreiPriceWeekDays）**:

- 编辑时**删除该运价下所有已有关联周几**，然后根据输入重新创建

**箱型（seFreiPriceCtns）**:

- `id` 有值：修改已有箱型
- `id` 为 null：新增箱型
- 不在列表中的已有箱型：自动删除（连同关联的箱型费用）

**费用（seFreiPriceFees）**:

- `id` 有值：修改已有费用
- `id` 为 null：新增费用
- 不在列表中的已有费用：自动删除（连同关联的箱型费用）

**箱型费用（seFreiPriceCtnFees）嵌套在费用下**:

- `id` 有值：修改已有箱型费用
- `id` 为 null：新增箱型费用
- 不在列表中的已有箱型费用：自动删除
- 通过 `ctnCodeId` 关联对应箱型（非Guid）

### SeFreiPriceCtnEditDto

| 字段      | 类型   | 必填 | 说明               |
| --------- | ------ | ---- | ------------------ |
| id        | Guid?  | 否   | 主键Id，为空则新增 |
| ctnCodeId | long   | 是   | 箱型Id             |
| cost      | int    | 是   | 成本               |
| sugPrice  | int?   | 否   | 指导价             |
| remark    | string | 否   | 备注               |

### SeFreiPriceFeeEditDto

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | Guid? | 否 | 主键Id，为空则新增 |
| feeCodeId | long | 是 | 费用代码Id |
| currencyId | long | 是 | 币别Id |
| priceFeeType | PriceFeeType (enum int) | 是 | 附加费计费方式（0=Ctn按集装箱, 1=Order按票） |
| price | decimal? | 条件必填 | 价格（priceFeeType!=Ctn时**必填**，priceFeeType==Ctn时**必须为空**） |
| seFreiPriceCtnFees | array | 条件限制 | 箱型费用列表（priceFeeType!=Ctn时**不能有值**，priceFeeType==Ctn时按需填写） |

> 验证规则同 SeFreiPriceFeeAddDto。

### SeFreiPriceCtnFeeEditDto

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | Guid? | 否 | 主键Id，为空则新增 |
| ctnCodeId | long | 是 | **箱型Id**（通过CtnCodeId关联，非Guid） |
| price | decimal | 是 | 价格 |
| conditionType | FreiPricePropType? (enum int) | 否 | 条件类型（枚举：0=XXX） |
| operatorType | OperatorType? (enum int) | 否 | 算符类型（枚举：0=大于, 1=大于等于, 2=小于, 3=小于等于） |
| value | int? | 否 | 要比较的值 |
| otherPrice | decimal? | 否 | 否则的价格 |

### 响应

```json
true
```

---

## 4. 运价详情

- **请求路径**: `GET /api/services/app/seFreiPriceAdmin/DetailAsync`
- **权限**: `Admin.SeFreiPrice.Get`

### 请求参数（Query）

| 参数 | 类型 | 说明       |
| ---- | ---- | ---------- |
| Id   | Guid | 运价主键Id |

### 响应 SeFreiPriceOutDto

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "recommend": true,
  "carrierId": 1,
  "bookingAgentId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "bookingAgentName": "某某订舱代理公司",
  "polId": 1,
  "podId": 2,
  "isDirect": true,
  "pot1Id": null,
  "pot2Id": null,
  "polFreeDays": 14,
  "podFreeDays": 14,
  "poddem": null,
  "poddet": null,
  "voyage": "2周",
  "vesselVoyage": "EVER GIVEN/0123W",
  "validTimeStart": "2026-05-01T00:00:00",
  "validTimeEnd": "2026-06-01T00:00:00",
  "remark": "备注",
  "currencyId": 1,
  "contractNo": "CONT-2026-001",
  "creationTime": "2026-05-01T00:00:00",
  "creatorUserId": 1,
  "creatorUserName": "张三",
  "lastModificationTime": null,
  "lastModifierUserId": null,
  "isValid": true,
  "carrier": {
    "id": 1,
    "cnName": "中远海运",
    "code": "COSCO",
    "logo": {
      "id": 1,
      "attachmentId": 100,
      "itemId": "1",
      "moduleTypeId": "160010",
      "displayOrder": 0
    }
  },
  "pol": { "...PortCodeDto..." },
  "pod": { "...PortCodeDto..." },
  "pot1": null,
  "pot2": null,
  "currency": { "...CurrencyDto..." },
  "lane": { "...LaneCodeDto（目的港对应航线）..." },
  "country": { "...CountryCodeDto（目的港对应国家）..." },
  "seFreiPriceCtns": [
    {
      "id": "xxx",
      "seFreiPriceId": "xxx",
      "ctnCodeId": 1,
      "cost": 100,
      "sugPrice": 120,
      "costDelta": null,
      "sugDelta": null,
      "remark": "20GP",
      "ctnCode": { "...CtnCodeDto..." }
    }
  ],
  "seFreiPriceFees": [
    {
      "id": "xxx",
      "seFreiPriceId": "xxx",
      "feeCodeId": 1,
      "currencyId": 1,
      "priceFeeType": 0,
      "price": null,
      "feeCode": { "...FeeCodeDto..." },
      "currency": { "...CurrencyDto..." },
      "seFreiPriceCtnFees": [
        {
          "id": "xxx",
          "seFreiPriceCtnId": "xxx",
          "ctnCodeId": 1,
          "seFreiPriceFeeId": "xxx",
          "price": 500.00,
          "conditionType": null,
          "operatorType": null,
          "value": null,
          "otherPrice": null
        }
      ]
    },
    {
      "id": "xxx",
      "seFreiPriceId": "xxx",
      "feeCodeId": 2,
      "currencyId": 1,
      "priceFeeType": 1,
      "price": 200.00,
      "feeCode": { "...FeeCodeDto..." },
      "currency": { "...CurrencyDto..." },
      "seFreiPriceCtnFees": []
    }
  ],
  "seFreiPriceDays": [
    {
      "id": 1,
      "seFreiPriceId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "etd": "2026-05-01T00:00:00",
      "closeDocTime": "2026-04-28T00:00:00",
      "closingTime": "2026-04-29T00:00:00"
    },
    {
      "id": 2,
      "seFreiPriceId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "etd": "2026-05-08T00:00:00",
      "closeDocTime": "2026-05-05T00:00:00",
      "closingTime": "2026-05-06T00:00:00"
    }
  ],
  "seFreiPriceWeekDays": [
    {
      "id": 1,
      "seFreiPriceId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "etdDayOfWeek": 1,
      "etdDayTime": "08:30:00",
      "closeDocDayOfWeek": 5,
      "closeDocDayTime": "12:00:00",
      "closingDayOfWeek": 6,
      "closingDayTime": "18:00:00"
    },
    {
      "id": 2,
      "seFreiPriceId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "etdDayOfWeek": 4,
      "etdDayTime": "14:00:00",
      "closeDocDayOfWeek": 3,
      "closeDocDayTime": "10:00:00",
      "closingDayOfWeek": 4,
      "closingDayTime": "16:00:00"
    }
  ]
}
```

### 输出字段说明

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| polFreeDays | int? | 起运港免用箱天数 |
| podFreeDays | int? | 目的港免用箱天数 |
| poddem | int? | 目的港免堆期天数 |
| poddet | int? | 目的港免箱期天数 |
| contractNo | string | 约号 |
| vesselVoyage | string | 船名航次，可空，最长 100。列表和详情原样返回，不参与筛选 |
| bookingAgentId | Guid? | 订舱代理id |
| bookingAgentName | string | 订舱代理名称（客户简称，bookingAgentId为空时为null） |
| creatorUserId | long? | 创建人Id |
| creatorUserName | string | 创建人名称（取用户 NickName 真实姓名，creatorUserId为空或用户不存在时为null） |
| isValid | bool | 是否有效。按自然日比较 validTimeStart/End 与今天，忽略时分秒；有效期止为今天时今天仍有效 |
| carrier | CarrierDto | 船公司对象（含 `logo` 字段，类型 AttachmentItemDto，船公司Logo附件） |
| pol | PortCodeDto | 起运港对象 |
| pod | PortCodeDto | 目的港对象 |
| pot1 | PortCodeDto? | 中转港1对象 |
| pot2 | PortCodeDto? | 中转港2对象 |
| currency | CurrencyDto | 币别对象 |
| lane | LaneCodeDto | 目的港对应的航线对象 |
| country | CountryCodeDto | 目的港对应的国家对象 |
| seFreiPriceCtns | array | 运价箱型列表（含 CtnCodeDto） |
| seFreiPriceFees | array | 运价费用列表（含 FeeCodeDto、CurrencyDto、箱型费用列表） |
| seFreiPriceDays | array | 关联日列表（含 etd、closeDocTime、closingTime） |
| seFreiPriceWeekDays | array | 关联周几列表（含6个周几/时间点字段） |

### SeFreiPriceCtnOutDto

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | Guid | 主键Id |
| seFreiPriceId | Guid | 运价Id |
| ctnCodeId | long | 箱型Id |
| cost | int | 成本 |
| sugPrice | int? | 指导价，未填为 null |
| costDelta | decimal? | 成本涨跌（现价减上一条）。**仅列表计算**；差额为 0 或没有上一条时为 null。详情为 null |
| sugDelta | decimal? | 指导价涨跌（现价减上一条）。**仅列表计算**；差额为 0、任一侧未填或没有上一条时为 null。详情为 null |
| remark | string | 备注 |
| ctnCode | CtnCodeDto | 箱型对象 |

### SeFreiPriceFeeOutDto

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | Guid | 主键Id |
| seFreiPriceId | Guid | 运价Id |
| feeCodeId | long | 费用代码Id |
| currencyId | long | 币别Id |
| priceFeeType | PriceFeeType (enum int) | 附加费计费方式（0=Ctn按集装箱, 1=Order按票） |
| price | decimal? | 价格（priceFeeType!=Ctn时有值，priceFeeType==Ctn时为null） |
| feeCode | FeeCodeDto | 费用代码对象 |
| currency | CurrencyDto | 币别对象 |
| seFreiPriceCtnFees | array | 箱型费用列表（priceFeeType==Ctn时有值，priceFeeType!=Ctn时为空数组） |

### SeFreiPriceCtnFeeOutDto

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | Guid | 主键Id |
| seFreiPriceCtnId | Guid | 运价箱型Id |
| ctnCodeId | long | 箱型Id（供编辑时使用） |
| seFreiPriceFeeId | Guid | 运价费用Id |
| price | decimal | 价格 |
| conditionType | FreiPricePropType? (enum int) | 条件类型（枚举：0=XXX） |
| operatorType | OperatorType? (enum int) | 算符类型（枚举：0=大于, 1=大于等于, 2=小于, 3=小于等于） |
| value | int? | 要比较的值 |
| otherPrice | decimal? | 否则的价格 |

### SeFreiPriceDayOutDto

| 字段          | 类型      | 说明              |
| ------------- | --------- | ----------------- |
| id            | long      | 主键Id            |
| seFreiPriceId | Guid      | 运价Id            |
| etd           | DateTime? | 开船日            |
| closeDocTime  | DateTime? | 截单时间          |
| closingTime   | DateTime? | 截港时间/截关时间 |

### SeFreiPriceWeekDayOutDto

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | long | 主键Id |
| seFreiPriceId | Guid | 运价Id |
| etdDayOfWeek | DayOfWeek? (enum int) | 开船日 周几（0=Sunday, 1=Monday, ...6=Saturday） |
| etdDayTime | TimeSpan? (string) | 开船日 一天中的时间点（如 "08:30:00"） |
| closeDocDayOfWeek | DayOfWeek? (enum int) | 截单时间 周几 |
| closeDocDayTime | TimeSpan? (string) | 截单时间 一天中的时间点 |
| closingDayOfWeek | DayOfWeek? (enum int) | 截港时间 周几 |
| closingDayTime | TimeSpan? (string) | 截港时间 一天中的时间点 |

---

## 5. 运价列表

- **请求路径**: `POST /api/services/app/seFreiPriceAdmin/GetPagedListAsync`
- **权限**: `Admin.SeFreiPrice.Get`
- **请求方式**: `application/json`，参数置于请求体（Body）

### 请求参数（Body / JSON）SeFreiPriceQueryDto

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| CarrierId | long? | 船公司id |
| BookingAgentId | Guid? | 订舱代理id |
| POLId | long? | 起运港id |
| PODId | long? | 目的港id |
| POT1Id | long? | 中转港1id |
| POT2Id | long? | 中转港2id |
| CurrencyId | long? | 币别id |
| Recommend | bool? | 是否推荐 |
| IsDirect | bool? | 是否直达 |
| POLFreeDays | int? | 起运港免用箱天数（精确匹配） |
| PODFreeDays | int? | 目的港免用箱天数（精确匹配） |
| PODDEM | int? | 目的港免堆期天数（精确匹配） |
| PODDET | int? | 目的港免箱期天数（精确匹配） |
| Voyage | string | 航程（模糊搜索） |
| Remark | string | 备注（模糊搜索） |
| ValidTimeStartBegin | DateTime? | 有效时间起 - 起始（ValidTimeStart >= 此值） |
| ValidTimeStartEnd | DateTime? | 有效时间起 - 截止（ValidTimeStart <= 此值） |
| ValidTimeEndBegin | DateTime? | 有效时间止 - 起始（ValidTimeEnd >= 此值） |
| ValidTimeEndEnd | DateTime? | 有效时间止 - 截止（ValidTimeEnd <= 此值） |
| CountryId | long? | 目的港的国家id |
| LaneId | long? | 目的港的航线id |
| IsValid | List<int> | 生效状态（按自然日比较有效期与今天，忽略时分秒），**支持多选**，满足任一即命中。不传/空=不筛选；`0`=已生效（有效期起的日期 <= 今天 <= 有效期止的日期，有效期止为今天时今天仍有效）；`1`=未生效（今天 < 有效期起的日期）；`2`=已过期（今天 > 有效期止的日期）。Body 传参示例：`"IsValid": [0, 1]` |
| ContractNo | string | 约号（模糊搜索） |
| CreatorUserId | long? | 录入人id（创建人Id，精确匹配） |
| CreationTimeStart | DateTime? | 录入时间起（CreationTime >= 此值）。不传则不限制 |
| CreationTimeEnd | DateTime? | 录入时间止（CreationTime <= 此值）。不传则不限制 |
| Sorting | string | 排序字段（如 `CreationTime desc`）。特殊值 `id desc`：按生效状态排序（已生效在前、未生效居中、已过期在后），再按起运港id、目的港id 升序 |
| PageIndex | int | 当前页码（从1开始） |
| PageSize | int | 每页条数 |

#### 请求体示例

```json
{
  "POLId": 100,
  "IsValid": [0, 1],
  "CreationTimeStart": "2026-07-01T00:00:00",
  "CreationTimeEnd": "2026-07-04T23:59:59",
  "Sorting": "id desc",
  "PageIndex": 1,
  "PageSize": 20
}
```

### 响应

**2026-10-01 起列表出参改为 `SeFreiPriceListDto`，不再和详情共用整票对象。** 详情 `DetailAsync` 仍是 `SeFreiPriceOutDto`。

列表去掉：航线对象 `lane`、`creatorUserId`、`lastModifierUserId`、`lastModificationTime`、`isValid`。过期看 `validTimeEnd`。

关联对象只留列表用到的字段：`carrier` 留 `id`、`code`、`cnShortName`、`cnName`、`enName`、`logo.url`；港口留 `id`、`portName`、`cnName`、`ediCode`，港口下的 `country` 只留 `countryName`、`countryEnName`；主表 `country` 留 `code`、`countryName`、`countryEnName`；订舱代理留 `id`、`name`；主表币别留 `code`、`name`、`symbol`，`name` 取币别中文名，**2026-10-01 起不再返回 `currency.id`**（用外层 `currencyId`）；费用代码留 `cnName`、`enName`；费用币别留 `code`、`name`；箱型代码只留 `ctnName`，**不再返回 `ctnCode.id`**。

箱型行去掉 `seFreiPriceId` 和 `remark`，保留 `id`、`ctnCodeId`、`cost`、`sugPrice`、`costDelta`、`sugDelta`。关联日、关联周几去掉 `id` 和 `seFreiPriceId`。费用行不再返回 `id`。按箱附加费不再返回 `id`、`seFreiPriceFeeId`，箱型仍靠 `seFreiPriceCtnId` 对齐。详情仍返回这些 id。

```json
{
  "items": [
    "...SeFreiPriceListDto数组（箱型上的 costDelta、sugDelta 仅列表有值）..."
  ],
  "totalCount": 100,
  "pageIndex": 1,
  "pageSize": 10
}
```

涨跌写在每条箱型上，不另起列表。详情里这两个字段为 null。

上一条按全库同航线查找，不受本页筛选和分页限制。航线键是船公司、起运港、目的港、是否直达、中转港 1（空与空相等）。中转港 2、币别、订舱代理不参与。只保留有效截止日的**日期**严格早于当前行的记录，时分秒不参与比较，再取截止日期最大的一条。同一天有多条时，取创建时间较晚的，创建时间相同再取 Id 较大的。

箱型先按 `ctnCodeId` 对齐，对不上再用箱型名称 `ctnCode.ctnName`。差额 = 现价 − 上一条。涨为正，跌为负。差额为 0 时该侧为 null。指导价任一侧未填时 `sugDelta` 为 null。对不上上一条箱型时两侧都为 null。

```json
"seFreiPriceCtns": [
  {
    "ctnCodeId": 123,
    "cost": 1050,
    "sugPrice": 1180,
    "costDelta": 50,
    "sugDelta": -20,
    "ctnCode": { "ctnName": "40HC" }
  }
]
```

---

## 6. 获取所有航线

- **请求路径**: `GET /api/services/app/seFreiPriceAdmin/GetAllLaneCodesAsync`
- **权限**: `Admin.SeFreiPrice.Get`

### 请求参数

无

### 响应 SeFreiPriceLaneCodesResultDto

```json
{
  "laneCodes": [
    { "...LaneCodeDto..." }
  ]
}
```

> 返回所有运价目的港对应的航线列表（去重）。

---

## 7. 获取批量运价的箱型列表

- **请求路径**: `POST /api/services/app/seFreiPriceAdmin/GetCtnCodesByPriceIdsAsync`
- **权限**: `Admin.SeFreiPrice.Get`

> 根据多条运价Id，查询这些运价下的所有箱型，去重后返回 CtnCodeDto 列表。

### 请求体 GetCtnCodesDto

```json
{
  "ids": [
    "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  ]
}
```

| 字段 | 类型         | 必填 | 说明       |
| ---- | ------------ | ---- | ---------- |
| ids  | List\<Guid\> | 是   | 运价Id列表 |

### 响应

```json
[
  { "...CtnCodeDto..." },
  { "...CtnCodeDto..." }
]
```

返回去重后的 `List<CtnCodeDto>`。

---

## 8. 批量编辑运价

- **请求路径**: `PUT /api/services/app/seFreiPriceAdmin/BatchEditAsync`
- **权限**: `Admin.SeFreiPrice.Edit`

### 请求体 SeFreiPriceBatchEditDto

```json
{
  "ids": ["guid1", "guid2"],
  "recommend": true,
  "carrierId": null,
  "bookingAgentId": null,
  "polId": null,
  "podId": null,
  "isDirect": null,
  "pot1Id": null,
  "pot2Id": null,
  "polFreeDays": null,
  "podFreeDays": null,
  "poddem": null,
  "poddet": null,
  "voyage": null,
  "vesselVoyage": null,
  "validTimeStart": null,
  "validTimeEnd": null,
  "remark": null,
  "currencyId": null,
  "contractNo": null,
  "seFreiPriceCtns": null,
  "seFreiPriceFees": null,
  "seFreiPriceDays": null,
  "seFreiPriceWeekDays": null
}
```

### 批量编辑逻辑

- `ids`（必填）：要修改的运价Id列表
- 其余字段（含 `currencyId`、`contractNo`、`bookingAgentId`、`vesselVoyage`）：为 `null` 则**不修改**该字段。`vesselVoyage` 与 `voyage`、`remark`、`contractNo` 一样，空白字符串也不覆盖原值
- `bookingAgentId`：有值时校验客户必须包含订舱代理行业类别
- `seFreiPriceCtns`：不为 null 则**删除原有所有箱型及其箱型费用**并重新添加
- `seFreiPriceDays`：不为 null 则**删除原有所有关联日**并重新添加
- `seFreiPriceWeekDays`：不为 null 则**删除原有所有关联周几**并重新添加
- `seFreiPriceFees`：不为 null 时，对每条运价执行以下逻辑：
  1. 按 `feeCodeId` 查找该运价已有的费用记录，存在则复用，不存在则新建 `SeFreiPriceFee`
  2. 遍历每个费用的 `seFreiPriceCtnFees`，通过 `ctnCodeId` 匹配当前运价的箱型
  3. **仅当该箱型没有任何已有附加费（SeFreiPriceCtnFee）时**，才添加输入的箱型费用
  4. 已有附加费的箱型跳过，**不删除也不修改**已有的费用和箱型费用

### 响应

```json
true
```

---

## 9. 批量简单新增（仅主表+箱型）

- **请求路径**: `POST /api/services/app/seFreiPriceAdmin/BatchAddSimpleAsync`
- **权限**: `Admin.SeFreiPrice.Add`

> 仅操作 SeFreiPrice、SeFreiPriceCtn、SeFreiPriceDay、SeFreiPriceWeekDay，不涉及费用表。

### 请求体 List\<SeFreiPriceSimpleAddDto\>

```json
[
  {
    "recommend": true,
    "carrierId": 1,
    "bookingAgentId": null,
    "polId": 1,
    "podId": 2,
    "isDirect": true,
    "pot1Id": null,
    "pot2Id": null,
    "polFreeDays": 14,
    "podFreeDays": 14,
    "poddem": null,
    "poddet": null,
    "voyage": "2周",
    "vesselVoyage": "EVER GIVEN/0123W",
    "validTimeStart": "2026-05-01T00:00:00",
    "validTimeEnd": "2026-06-01T00:00:00",
    "remark": "备注",
    "currencyId": 1,
    "contractNo": "CONT-2026-001",
    "seFreiPriceCtns": [
      { "ctnCodeId": 1, "cost": 100, "sugPrice": 120, "remark": "20GP" },
      { "ctnCodeId": 2, "cost": 200, "sugPrice": null, "remark": "40GP" }
    ],
    "seFreiPriceDays": [
      {
        "etd": "2026-05-01T00:00:00",
        "closeDocTime": "2026-04-28T00:00:00",
        "closingTime": "2026-04-29T00:00:00"
      }
    ],
    "seFreiPriceWeekDays": [
      {
        "etdDayOfWeek": 1,
        "etdDayTime": "08:30:00",
        "closeDocDayOfWeek": 5,
        "closeDocDayTime": "12:00:00",
        "closingDayOfWeek": 6,
        "closingDayTime": "18:00:00"
      }
    ]
  }
]
```

### SeFreiPriceSimpleAddDto 字段说明

与 SeFreiPriceAddDto 相同（不含 seFreiPriceFees 字段），含 contractNo、vesselVoyage、seFreiPriceDays、seFreiPriceWeekDays。

### 响应

```json
["3fa85f64-5717-4562-b3fc-2c963f66afa6"]
```

返回新增的运价主键Id列表（`List<Guid>`），顺序与输入一致。

---

## 10. 批量简单编辑（仅主表+箱型）

- **请求路径**: `PUT /api/services/app/seFreiPriceAdmin/BatchEditSimpleAsync`
- **权限**: `Admin.SeFreiPrice.Edit`

> 仅操作 SeFreiPrice、SeFreiPriceCtn、SeFreiPriceDay、SeFreiPriceWeekDay，不涉及费用表。删除箱型时同步删除关联的 SeFreiPriceCtnFee。关联日和关联周几采用删除重建策略。

### 请求体 List\<SeFreiPriceSimpleEditDto\>

```json
[
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "recommend": true,
    "carrierId": 1,
    "bookingAgentId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "polId": 1,
    "podId": 2,
    "isDirect": true,
    "pot1Id": null,
    "pot2Id": null,
    "polFreeDays": 14,
    "podFreeDays": 14,
    "poddem": null,
    "poddet": null,
    "voyage": "2周",
    "vesselVoyage": "EVER GIVEN/0123W",
    "validTimeStart": "2026-05-01T00:00:00",
    "validTimeEnd": "2026-06-01T00:00:00",
    "remark": "备注",
    "currencyId": 1,
    "contractNo": "CONT-2026-001",
    "seFreiPriceCtns": [
      {
        "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "ctnCodeId": 1,
        "cost": 120,
        "sugPrice": 150,
        "remark": "修改"
      },
      {
        "id": null,
        "ctnCodeId": 3,
        "cost": 300,
        "sugPrice": null,
        "remark": "新增箱型"
      }
    ],
    "seFreiPriceDays": [
      {
        "etd": "2026-05-01T00:00:00",
        "closeDocTime": "2026-04-28T00:00:00",
        "closingTime": "2026-04-29T00:00:00"
      },
      {
        "etd": "2026-05-15T00:00:00",
        "closeDocTime": "2026-05-12T00:00:00",
        "closingTime": "2026-05-13T00:00:00"
      }
    ],
    "seFreiPriceWeekDays": [
      {
        "etdDayOfWeek": 1,
        "etdDayTime": "08:30:00",
        "closeDocDayOfWeek": 5,
        "closeDocDayTime": "12:00:00",
        "closingDayOfWeek": 6,
        "closingDayTime": "18:00:00"
      }
    ]
  }
]
```

### SeFreiPriceSimpleEditDto 字段说明

与 SeFreiPriceEditDto 相同（不含 seFreiPriceFees 字段），`id`（Guid）必填，含 contractNo、vesselVoyage、seFreiPriceDays、seFreiPriceWeekDays。简单编辑会整列写入，传 null 会把原船名航次清空。

### 编辑逻辑

- 主表全量覆盖所有字段
- 箱型 `id` 有值：修改 | `id` 为 null：新增 | 不在列表中：删除（同时删除关联的 SeFreiPriceCtnFee）
- 关联日和关联周几：删除重建

### 响应

```json
true
```

---

## 11. 改变推荐状态

- **请求路径**: `PUT /api/services/app/seFreiPriceAdmin/ChangeRecommendAsync`
- **权限**: `Admin.SeFreiPrice.Edit`

### 请求体 SeFreiPriceRecommendDto

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "recommend": true
}
```

### 响应

```json
true
```

> 只修改单条运价的推荐状态，不影响其他字段。

---

## 通用说明

### 接口路径规则

所有接口路径格式为: `/api/services/app/seFreiPriceAdmin/{方法名}`

方法名保留 `Async` 后缀，例如:

- `AddAsync`
- `DeleteAsync`
- `EditAsync`
- `DetailAsync`
- `GetPagedListAsync`
- `GetAllLaneCodesAsync`
- `GetCtnCodesByPriceIdsAsync`
- `BatchEditAsync`
- `BatchAddSimpleAsync`
- `BatchEditSimpleAsync`
- `ChangeRecommendAsync`

### 船公司Logo说明

列表和详情返回的 `carrier`（CarrierDto）对象中包含 `logo` 字段（AttachmentItemDto 类型），为船公司Logo附件信息。通过附件服务根据 `ModuleTypeId=160010`（CarrierLogo）和船公司Id查询获得。

### 箱型费用（CtnFee）中的 CtnCodeId 说明

新增和编辑时，`SeFreiPriceCtnFee` 交叉表中使用 `ctnCodeId`（long 类型，即箱型代码Id）来关联对应箱型，**不使用** `seFreiPriceCtnId`（Guid）。后端会在保存箱型后，自动将 `ctnCodeId` 映射为对应的 `seFreiPriceCtnId`。

详情输出时，`SeFreiPriceCtnFeeOutDto` 会返回实际的 `seFreiPriceCtnId`（Guid）、`ctnCodeId`（long）和 `seFreiPriceFeeId`（Guid）。列表只返回 `seFreiPriceCtnId` 和 `ctnCodeId`，不返回 `id`、`seFreiPriceFeeId`。

### 关联日和关联周几说明

关联日（SeFreiPriceDay）和关联周几（SeFreiPriceWeekDay）为运价主表的子表，一个运价可以有0到多条关联日和0到多条关联周几记录。

SeFreiPriceDay 中 ETD（开船日）、CloseDocTime（截单时间）、ClosingTime（截港时间/截关时间）三类日期作为一组存储；SeFreiPriceWeekDay 中存储对应的周几与时间点（共6个字段，均可空）。

- **新增时**：直接随主表一同创建
- **编辑时**：采用**删除重建**策略，即先删除该运价下所有已有的关联日/关联周几记录，再根据输入重新创建
- **删除运价时**：同步删除关联的所有关联日和关联周几记录

### 错误处理

所有接口在参数校验失败时返回 `UserFriendlyException`，包含中文错误信息，如：

- 输入不能为空
- 船公司不存在
- 起运港不存在 / 目的港不存在
- 中转港1不存在 / 中转港2不存在
- 币别不存在
- 订舱代理不存在
- 该客户不包含订舱代理属性
- 箱型不存在
- 箱型不可重复添加
- 费用代码不存在
- 运价不存在
- 箱型费用中的箱型CtnCodeId={id}在箱型列表中不存在
- 非按集装箱计费时，价格不能为空
- 非按集装箱计费时，不能填写箱型费用
- 按集装箱计费时，价格必须为空
