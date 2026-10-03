# 港口英文国家名（countryEnName）前端对接文档

## 变更说明

在所有返回港口信息的接口中，新增 `countryEnName`（国家英文名称）字段，数据来源于港口关联的国家表 `App_CountryCodes.CountryEnName`。

该字段与港口中文名（或国家中文名 `countryName`）同级返回，便于前端国际化展示。

---

## 涉及接口及新增字段

### 1. 海运出口详情 / 列表

**接口路径：** `GET /api/services/app/SeaExportAdmin/DetailAsync`  
**接口路径：** `GET /api/services/app/SeaExportAdmin/GetPagedListAsync`

**返回 DTO：** `SeaExportDto`

| 新增字段 | 类型 | 说明 | 位置 |
| --- | --- | --- | --- |
| `countryEnName` | `string` | 目的港（POD）所属国家英文名 | 与 `countryName`、`laneName` 同级 |

**示例：**

```json
{
  "podId": 123,
  "podName": "SHANGHAI",
  "countryName": "中国",
  "countryEnName": "China",
  "laneName": "远东航线",
  "polId": 456,
  "polName": "LOS ANGELES",
  "pot1Id": null,
  "pot1Name": null,
  "pot2Id": null,
  "pot2Name": null,
  "receivePortId": null,
  "receivePortName": null,
  "deliverPortId": null,
  "deliverPortName": null,
  "signingPortId": 789,
  "signingPortName": "NINGBO",
  "prepareAtId": 101,
  "prepareAtName": "SHANGHAI"
}
```

---

### 2. 付款申请 - 订单费用分组

**接口路径：** `GET /api/services/app/PaymentApplicationAdmin/GetOrderFeeGroupAsync`

**返回 DTO：** `PayAppFeeGroupDto`

> **2026-08-10 更新：** 港口已对象化为 `PortCodeSimpleDtoForOrder`，国家英文名不再平铺在根上。

| 字段路径 | 类型 | 说明 |
| --- | --- | --- |
| `pod.country.countryEnName` | `string` | 目的港所属国家英文名（挂在目的港对象的国家子对象下） |
| `pod.country.countryName` | `string` | 目的港所属国家中文名 |
| `pod.lane.laneName` | `string` | 目的港所属航线中文名 |

详见：`文档/业务/外联平铺改SimpleDto-前端对接文档-2026-08-10.md`

---

### 3. 服务任务工作台

**接口路径：** `GET /api/services/app/SeServiceTaskAdmin/GetWorkbenchAsync`  
**接口路径：** `GET /api/services/app/SeServiceTaskAdmin/GetWorkbenchCountAsync`

**返回 DTO：** 内嵌的 `SeaExportDto`

| 新增字段 | 类型 | 说明 | 位置 |
| --- | --- | --- | --- |
| `countryEnName` | `string` | 目的港（POD）所属国家英文名 | 与 `countryName`、`laneName` 同级 |

---

### 4. 海运出口分票详情 / 列表

**接口路径：** `GET /api/services/app/SeaExportSeparateAdmin/DetailAsync`  
**接口路径：** `GET /api/services/app/SeaExportSeparateAdmin/GetPagedListAsync`

**返回 DTO：** `SeaExportSeparateDto`

| 新增字段 | 类型 | 说明 | 位置 |
| --- | --- | --- | --- |
| `signingPortCountryEnName` | `string` | 签单地点所属国家英文名 | 与 `signingPortName` 同级 |
| `prepareAtCountryEnName` | `string` | 付费地点所属国家英文名 | 与 `prepareAtName` 同级 |

**示例：**

```json
{
  "signingPortId": 789,
  "signingPortName": "宁波",
  "signingPortCountryEnName": "China",
  "prepareAtId": 101,
  "prepareAtName": "上海",
  "prepareAtCountryEnName": "China"
}
```

---

### 5. 报价详情

**接口路径：** `GET /api/services/app/QuotationAdmin/DetailAsync`

**返回 DTO：** `QuotationDto.QuotationItems[]` → `QuotationItemDto`

| 新增字段            | 类型     | 说明                  | 位置               |
| ------------------- | -------- | --------------------- | ------------------ |
| `podCountryEnName`  | `string` | 目的港所属国家英文名  | 与 `podName` 同级  |
| `polCountryEnName`  | `string` | 起运港所属国家英文名  | 与 `polName` 同级  |
| `pot1CountryEnName` | `string` | 中转港1所属国家英文名 | 与 `pot1Name` 同级 |
| `pot2CountryEnName` | `string` | 中转港2所属国家英文名 | 与 `pot2Name` 同级 |

**示例：**

```json
{
  "quotationItems": [
    {
      "podId": 123,
      "podName": "上海",
      "podCountryEnName": "China",
      "polId": 456,
      "polName": "洛杉矶",
      "polCountryEnName": "United States",
      "pot1Id": null,
      "pot1Name": null,
      "pot1CountryEnName": null,
      "pot2Id": null,
      "pot2Name": null,
      "pot2CountryEnName": null
    }
  ]
}
```

---

### 6. 港口信息列表 / 详情

**接口路径：** `GET /api/services/app/PortCodeAdmin/GetPagedListAsync`  
**接口路径：** `GET /api/services/app/PortCodeAdmin/DetailAsync`

**返回 DTO：** `PortCodeDto`

| 新增字段        | 类型     | 说明               | 位置                  |
| --------------- | -------- | ------------------ | --------------------- |
| `countryEnName` | `string` | 港口所属国家英文名 | 与 `countryName` 同级 |

**示例：**

```json
{
  "id": 123,
  "portName": "SHANGHAI",
  "cnName": "上海",
  "countryName": "中国",
  "countryEnName": "China",
  "laneName": "远东航线",
  "laneCode": "FE",
  "ediCode": "CNSHA",
  "country": {
    "code": "CN",
    "countryName": "中国",
    "countryEnName": "China",
    "chau": "亚洲"
  }
}
```

---

### 7. 海运运价（嵌套港口对象）

**接口路径：** `GET /api/services/app/SeFreiPriceAdmin/GetPagedListAsync`  
**接口路径：** `GET /api/services/app/SeFreiPriceAdmin/DetailAsync`

**返回 DTO：** `SeFreiPriceOutDto`

运价接口中的港口以嵌套 `PortCodeDto` 对象返回（`pol`、`pod`、`pot1`、`pot2`），每个港口对象内的 `countryEnName` 字段已自动包含。同时 `country` 嵌套对象中也包含 `countryEnName`。

**示例：**

```json
{
  "pol": {
    "portName": "SHANGHAI",
    "cnName": "上海",
    "countryName": "中国",
    "countryEnName": "China"
  },
  "pod": {
    "portName": "LOS ANGELES",
    "cnName": "洛杉矶",
    "countryName": "美国",
    "countryEnName": "United States"
  },
  "country": {
    "countryName": "美国",
    "countryEnName": "United States"
  }
}
```

---

## 数据来源

```
App_PortCodes (港口表)
  ├── CountryId → App_CountryCodes.Id
  │                  ├── CountryName   (国家中文名)
  │                  └── CountryEnName (国家英文名) ← 新增返回的字段
  └── LaneId → App_LaneCodes.Id
```

## 前端注意事项

1. **向后兼容**：新增字段为可选（nullable），不影响已有逻辑
2. **字段命名**：驼峰命名 `countryEnName`，JSON 序列化自动转换
3. **空值处理**：当港口未关联国家或国家未填写英文名时，字段值为 `null`
4. **嵌套对象**：使用 `PortCodeDto` 嵌套的接口（运价、服务配置等），通过 `port.countryEnName` 或 `port.country.countryEnName` 获取
