# 海运出口运价（SeFreiPrice）前端对接文档

## 基础信息

- **控制器名称**：`SeFreiPriceAdmin`
- **接口基础路径**：`/api/services/app/seFreiPriceAdmin`
- **权限验证**：使用 SeFreiPrice 海运出口运价权限
- **所有接口需要携带登录Token**

---

## 1. 新增运价

- **接口路径**：`POST /api/services/app/seFreiPriceAdmin/AddAsync`
- **权限**：`Admin.SeFreiPrice.Add`
- **Content-Type**：`application/json`

### 请求参数（Body JSON）

| 字段            | 类型      | 必填 | 说明              |
| --------------- | --------- | ---- | ----------------- |
| recommend       | bool      | 是   | 是否推荐          |
| carrierId       | long      | 是   | 船公司id          |
| polId           | long      | 是   | 起运港id          |
| podId           | long      | 是   | 目的港id          |
| isDirect        | bool      | 是   | 是否直达          |
| pot1Id          | long?     | 否   | 中转港1id         |
| pot2Id          | long?     | 否   | 中转港2id         |
| freeDays        | int?      | 否   | 免用箱天数        |
| voyage          | string    | 否   | 航程              |
| etd             | DateTime? | 否   | 开船日期          |
| closeDocTime    | DateTime? | 否   | 截单时间          |
| closingTime     | DateTime? | 否   | 截港时间-截关时间 |
| validTimeStart  | DateTime  | 是   | 有效时间起        |
| validTimeEnd    | DateTime  | 是   | 有效时间止        |
| remark          | string    | 否   | 备注              |
| seFreiPriceCtns | Array     | 否   | 箱型报价列表      |

#### seFreiPriceCtns 子表结构

| 字段               | 类型   | 必填 | 说明             |
| ------------------ | ------ | ---- | ---------------- |
| ctnCodeId          | long   | 是   | 箱型Id           |
| cost               | int    | 是   | 成本             |
| remark             | string | 否   | 备注             |
| seFreiPriceCtnFees | Array  | 否   | 运价箱型费用列表 |

#### seFreiPriceCtnFees 子表的子表结构

| 字段          | 类型     | 必填 | 说明             |
| ------------- | -------- | ---- | ---------------- |
| feeCodeId     | long     | 是   | 费用Id           |
| price         | decimal  | 是   | 价格             |
| conditionType | int?     | 否   | 条件类型 XXX大于 |
| value         | int?     | 否   | 要比较的值       |
| otherPrice    | decimal? | 否   | 否则的价格       |

### 返回值

```json
{
  "result": "guid-string (新增运价的Id)",
  "success": true
}
```

---

## 2. 删除运价

- **接口路径**：`DELETE /api/services/app/seFreiPriceAdmin/DeleteAsync`
- **权限**：`Admin.SeFreiPrice.Delete`
- **Content-Type**：`application/json`

### 请求参数（Body JSON）

| 字段 | 类型   | 必填 | 说明             |
| ---- | ------ | ---- | ---------------- |
| id   | Guid   | 否   | 单条删除的Id     |
| ids  | Guid[] | 否   | 批量删除的Id列表 |

### 返回值

```json
{
  "result": true,
  "success": true
}
```

---

## 3. 编辑运价

- **接口路径**：`PUT /api/services/app/seFreiPriceAdmin/EditAsync`
- **权限**：`Admin.SeFreiPrice.Edit`
- **Content-Type**：`application/json`

### 请求参数（Body JSON）

| 字段            | 类型      | 必填 | 说明              |
| --------------- | --------- | ---- | ----------------- |
| id              | Guid      | 是   | 运价主键Id        |
| recommend       | bool      | 是   | 是否推荐          |
| carrierId       | long      | 是   | 船公司id          |
| polId           | long      | 是   | 起运港id          |
| podId           | long      | 是   | 目的港id          |
| isDirect        | bool      | 是   | 是否直达          |
| pot1Id          | long?     | 否   | 中转港1id         |
| pot2Id          | long?     | 否   | 中转港2id         |
| freeDays        | int?      | 否   | 免用箱天数        |
| voyage          | string    | 否   | 航程              |
| etd             | DateTime? | 否   | 开船日期          |
| closeDocTime    | DateTime? | 否   | 截单时间          |
| closingTime     | DateTime? | 否   | 截港时间-截关时间 |
| validTimeStart  | DateTime  | 是   | 有效时间起        |
| validTimeEnd    | DateTime  | 是   | 有效时间止        |
| remark          | string    | 否   | 备注              |
| seFreiPriceCtns | Array     | 否   | 箱型报价列表      |

#### seFreiPriceCtns 子表结构（编辑）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | Guid? | 否 | 子表主键Id，为空表示新增，有值表示修改，不在列表中的已有记录将被删除 |
| ctnCodeId | long | 是 | 箱型Id |
| cost | int | 是 | 成本 |
| remark | string | 否 | 备注 |
| seFreiPriceCtnFees | Array | 否 | 运价箱型费用列表 |

#### seFreiPriceCtnFees 子表的子表结构（编辑）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | Guid? | 否 | 子表主键Id，为空表示新增，有值表示修改，不在列表中的已有记录将被删除 |
| feeCodeId | long | 是 | 费用Id |
| price | decimal | 是 | 价格 |
| conditionType | int? | 否 | 条件类型 XXX大于 |
| value | int? | 否 | 要比较的值 |
| otherPrice | decimal? | 否 | 否则的价格 |

### 返回值

```json
{
  "result": true,
  "success": true
}
```

---

## 4. 运价详情

- **接口路径**：`GET /api/services/app/seFreiPriceAdmin/DetailAsync`
- **权限**：`Admin.SeFreiPrice.Get`

### 请求参数（Query String）

| 字段 | 类型 | 必填 | 说明   |
| ---- | ---- | ---- | ------ |
| id   | Guid | 是   | 运价Id |

### 返回值

```json
{
  "result": {
    "id": "guid",
    "recommend": true,
    "carrierId": 1,
    "polId": 1,
    "podId": 1,
    "isDirect": true,
    "pot1Id": null,
    "pot2Id": null,
    "freeDays": 14,
    "voyage": "航程",
    "etd": "2026-01-01T00:00:00",
    "closeDocTime": null,
    "closingTime": null,
    "validTimeStart": "2026-01-01T00:00:00",
    "validTimeEnd": "2026-12-31T00:00:00",
    "remark": "备注",
    "creationTime": "2026-01-01T00:00:00",
    "creatorUserId": 1,
    "lastModificationTime": null,
    "lastModifierUserId": null,
    "isValid": true,
    "carrier": {
      /* CarrierDto 船公司对象 */
    },
    "pol": {
      /* PortCodeDto 起运港对象 */
    },
    "pod": {
      /* PortCodeDto 目的港对象 */
    },
    "pot1": null,
    "pot2": null,
    "lane": {
      /* LaneCodeDto 目的港对应的航线对象 */
    },
    "country": {
      /* CountryCodeDto 目的港对应的国家对象 */
    },
    "seFreiPriceCtns": [
      {
        "id": "guid",
        "seFreiPriceId": "guid",
        "ctnCodeId": 1,
        "cost": 100,
        "remark": "备注",
        "ctnCode": {
          /* CtnCodeDto 箱型对象 */
        },
        "seFreiPriceCtnFees": [
          {
            "id": "guid",
            "seFreiPriceCtnId": "guid",
            "feeCodeId": 1,
            "price": 100.0,
            "conditionType": null,
            "value": null,
            "otherPrice": null,
            "feeCode": {
              /* FeeCodeDto 费用代码对象 */
            }
          }
        ]
      }
    ],
    "feeCodeInfos": [
      {
        "feeCodeId": 1,
        "feeCodeCode": "OFR"
      }
    ]
  },
  "success": true
}
```

---

## 5. 运价列表

- **接口路径**：`GET /api/services/app/seFreiPriceAdmin/GetPagedListAsync`
- **权限**：`Admin.SeFreiPrice.Get`

### 请求参数（Query String）

| 字段      | 类型   | 必填 | 说明                                         |
| --------- | ------ | ---- | -------------------------------------------- |
| carrierId | long?  | 否   | 船公司id筛选                                 |
| polId     | long?  | 否   | 起运港id筛选                                 |
| podId     | long?  | 否   | 目的港id筛选                                 |
| recommend | bool?  | 否   | 是否推荐筛选                                 |
| countryId | long?  | 否   | 目的港的国家id筛选                           |
| laneId    | long?  | 否   | 目的港的航线id筛选                           |
| isValid   | bool?  | 否   | 是否有效筛选（根据有效时间止与当前时间比较） |
| pageIndex | int    | 否   | 当前页码，默认1                              |
| pageSize  | int    | 否   | 每页记录数，默认10                           |
| sorting   | string | 否   | 排序字段，默认"Id DESC"                      |

### 返回值

```json
{
  "result": {
    "items": [
      {
        "id": "guid",
        "recommend": true,
        "carrierId": 1,
        "polId": 1,
        "podId": 1,
        "isDirect": true,
        "pot1Id": null,
        "pot2Id": null,
        "freeDays": 14,
        "voyage": "航程",
        "etd": "2026-01-01T00:00:00",
        "closeDocTime": null,
        "closingTime": null,
        "validTimeStart": "2026-01-01T00:00:00",
        "validTimeEnd": "2026-12-31T00:00:00",
        "remark": "备注",
        "creationTime": "2026-01-01T00:00:00",
        "creatorUserId": 1,
        "lastModificationTime": null,
        "lastModifierUserId": null,
        "isValid": true,
        "carrier": {
          /* CarrierDto */
        },
        "pol": {
          /* PortCodeDto */
        },
        "pod": {
          /* PortCodeDto */
        },
        "pot1": null,
        "pot2": null,
        "lane": {
          /* LaneCodeDto */
        },
        "country": {
          /* CountryCodeDto */
        },
        "seFreiPriceCtns": [
          /* SeFreiPriceCtnOutDto[] */
        ],
        "feeCodeInfos": [{ "feeCodeId": 1, "feeCodeCode": "OFR" }]
      }
    ],
    "totalCount": 100,
    "skipCount": 0,
    "maxResultCount": 10
  },
  "success": true
}
```

---

## 6. 获取所有航线

- **接口路径**：`GET /api/services/app/seFreiPriceAdmin/GetAllLaneCodesAsync`
- **权限**：`Admin.SeFreiPrice.Get`

### 请求参数

无

### 返回值

返回所有运价中目的港对应的航线（去重后的结果）。

```json
{
  "result": {
    "laneCodes": [
      {
        "id": 1,
        "code": "AEL",
        "laneName": "亚欧航线",
        "laneEnName": "Asia-Europe Lane",
        "ediCode": "AEL",
        "status": 0,
        "creationTime": "2026-01-01T00:00:00",
        "creatorUserId": 1,
        "lastModificationTime": null,
        "lastModifierUserId": null,
        "isDeleted": false,
        "deleterUserId": null,
        "deletionTime": null
      }
    ]
  },
  "success": true
}
```

---

## 7. 批量编辑运价

- **接口路径**：`PUT /api/services/app/seFreiPriceAdmin/BatchEditAsync`
- **权限**：`Admin.SeFreiPrice.Edit`
- **Content-Type**：`application/json`

### 请求参数（Body JSON）

**注意**：所有字段均为可选，为 `null` 时不修改该字段。子表对象不为空时直接删除所有子表重新添加。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| ids | Guid[] | 是 | 要批量修改的运价Id列表 |
| recommend | bool? | 否 | 是否推荐，为null不修改 |
| carrierId | long? | 否 | 船公司id，为null不修改 |
| polId | long? | 否 | 起运港id，为null不修改 |
| podId | long? | 否 | 目的港id，为null不修改 |
| isDirect | bool? | 否 | 是否直达，为null不修改 |
| pot1Id | long? | 否 | 中转港1id，为null不修改 |
| pot2Id | long? | 否 | 中转港2id，为null不修改 |
| freeDays | int? | 否 | 免用箱天数，为null不修改 |
| voyage | string | 否 | 航程，为null不修改 |
| etd | DateTime? | 否 | 开船日期，为null不修改 |
| closeDocTime | DateTime? | 否 | 截单时间，为null不修改 |
| closingTime | DateTime? | 否 | 截港时间-截关时间，为null不修改 |
| validTimeStart | DateTime? | 否 | 有效时间起，为null不修改 |
| validTimeEnd | DateTime? | 否 | 有效时间止，为null不修改 |
| remark | string | 否 | 备注，为null不修改 |
| seFreiPriceCtns | Array | 否 | 箱型报价列表，为null不修改子表；不为null则删除所有原有子表重新添加 |

#### seFreiPriceCtns 子表结构（批量编辑时与新增结构相同）

| 字段               | 类型   | 必填 | 说明             |
| ------------------ | ------ | ---- | ---------------- |
| ctnCodeId          | long   | 是   | 箱型Id           |
| cost               | int    | 是   | 成本             |
| remark             | string | 否   | 备注             |
| seFreiPriceCtnFees | Array  | 否   | 运价箱型费用列表 |

#### seFreiPriceCtnFees 子表的子表结构

| 字段          | 类型     | 必填 | 说明             |
| ------------- | -------- | ---- | ---------------- |
| feeCodeId     | long     | 是   | 费用Id           |
| price         | decimal  | 是   | 价格             |
| conditionType | int?     | 否   | 条件类型 XXX大于 |
| value         | int?     | 否   | 要比较的值       |
| otherPrice    | decimal? | 否   | 否则的价格       |

### 返回值

```json
{
  "result": true,
  "success": true
}
```

---

## 8. 改变推荐状态

- **接口路径**：`PUT /api/services/app/seFreiPriceAdmin/ChangeRecommendAsync`
- **权限**：`Admin.SeFreiPrice.Edit`
- **Content-Type**：`application/json`

### 请求参数（Body JSON）

| 字段      | 类型 | 必填 | 说明     |
| --------- | ---- | ---- | -------- |
| id        | Guid | 是   | 运价Id   |
| recommend | bool | 是   | 是否推荐 |

### 返回值

```json
{
  "result": true,
  "success": true
}
```

---

## 附录：关联对象 DTO 结构参考

### CarrierDto（船公司）

| 字段        | 类型           | 说明     |
| ----------- | -------------- | -------- |
| id          | long           | 主键     |
| cnName      | string         | 中文名称 |
| cnShortName | string         | 中文简称 |
| enName      | string         | 英文名称 |
| code        | string         | 英文简称 |
| otherCode   | string         | 代码别名 |
| countryId   | long           | 国家Id   |
| ediCode     | string         | EDI代码  |
| remark      | string         | 备注     |
| country     | CountryCodeDto | 国家信息 |

### PortCodeDto（港口）

| 字段            | 类型   | 说明             |
| --------------- | ------ | ---------------- |
| id              | long   | 主键             |
| portName        | string | 港口英文名称     |
| cnName          | string | 港口中文名称     |
| countryName     | string | 国家名称         |
| chau            | string | 所在大洲         |
| explain         | string | 说明             |
| portType        | string | 港口类型         |
| countryId       | long   | 国家Id           |
| laneId          | long   | 航线Id           |
| laneCode        | string | 航线代码         |
| laneName        | string | 航线中文名称     |
| lane            | string | 航线             |
| ediCode         | string | EDI代码          |
| statisticalArea | string | 统计区域         |
| status          | int    | 状态 0启用 1禁用 |

### LaneCodeDto（航线）

| 字段       | 类型   | 说明             |
| ---------- | ------ | ---------------- |
| id         | long   | 主键             |
| code       | string | 航线代码         |
| laneName   | string | 航线中文名称     |
| laneEnName | string | 航线英文名称     |
| ediCode    | string | EDI代码          |
| status     | int    | 状态 0启用 1禁用 |

### CountryCodeDto（国家）

| 字段          | 类型   | 说明         |
| ------------- | ------ | ------------ |
| id            | long   | 主键         |
| code          | string | 国家唯一代码 |
| countryName   | string | 国家名称     |
| countryEnName | string | 国家英文名称 |

### CtnCodeDto（箱型）

| 字段        | 类型    | 说明             |
| ----------- | ------- | ---------------- |
| id          | long    | 主键             |
| ctnSize     | string  | 集装箱类型       |
| ctnType     | string  | 集装箱尺寸       |
| ctnName     | string  | 表现形式         |
| ediCode     | string  | EDI代码          |
| ctnWeight   | decimal | 箱皮重           |
| cnExplain   | string  | 中文说明         |
| enExplain   | string  | 英文说明         |
| afrCode     | string  | AFR代码          |
| limitWeight | decimal | 默认限重         |
| teu         | decimal | TEU              |
| orderNo     | int?    | 排序号           |
| status      | int     | 状态 0启用 1禁用 |
| isDefault   | bool    | 是否默认展示列   |
| remark      | string  | 备注             |

### FeeCodeDto（费用代码）

| 字段            | 类型   | 说明             |
| --------------- | ------ | ---------------- |
| id              | long   | 主键             |
| code            | string | 费用代码         |
| cnName          | string | 中文名称         |
| enName          | string | 英文名称         |
| currencyId      | long   | 币别Id           |
| defaultUnit     | string | 默认计费标准代码 |
| defaultUnitName | string | 默认计费标准名称 |
| isSea           | bool   | 海运             |
| isAir           | bool   | 空运             |
| isTrucking      | bool   | 陆运             |
| isWms           | bool   | 仓储             |
| enable          | bool   | 是否启用         |
| remark          | string | 备注             |

### SeFreiPriceFeeCodeSimpleDto（费用代码简要信息）

| 字段        | 类型   | 说明     |
| ----------- | ------ | -------- |
| feeCodeId   | long   | 费用Id   |
| feeCodeCode | string | 费用代码 |
