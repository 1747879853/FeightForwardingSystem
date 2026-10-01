---
title: 荣E通场站查询、即时运价查询
module: 外部Api对接
author: 系统
last_updated: 2026-09-29
---

# 1. 说明

按选中的多票海运出口，用主提单号和场站简称向场站查箱数据，并回写船名、船公司航次和业务箱。

主提单号、场站简称由后端从票上取，前端只传海运出口 Id。没有箱子的票不改原数据，也不算失败。

| 项目 | 内容                                                              |
| :--- | :---------------------------------------------------------------- |
| 方法 | `POST`                                                            |
| 地址 | `/api/services/app/RongETongAdmin/RealQueryAsync`                 |
| 权限 | 登录，且具备「第三方接口 > 使用」（`Admin.ExternalApi.Use`）      |
| 返回 | ABP 统一包一层 `result`。`result` 只含失败的票；全部成功时是 `[]` |

整批都没选票、或接口账号没配，不返回列表，直接走 ABP 错误。某一票失败不影响其他票。

# 2. 请求参数

| 字段 | 类型 | 必填 | 说明 |
| :-- | :-- | :-- | :-- |
| seaExportIds | Guid[] | 是 | 海运出口 Id。重复的 Id 只处理一次 |
| skipPickedUp | bool | 否 | 是否跳过已提箱。`true` 时已提箱的票不查询、不改数据、也不算失败。不传或 `false` 时照常查询 |

```json
{
  "seaExportIds": [
    "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "4fa85f64-5717-4562-b3fc-2c963f66afa7"
  ],
  "skipPickedUp": true
}
```

# 3. 返回 result[]

只列出失败的票。成功回写的、以及对方没有箱子因而没改数据的，都不在这里。

| 字段 | 类型 | 说明 |
| :-- | :-- | :-- |
| commissionNum | string | 委托编号。票不存在时为 `null` |
| reason | int | 失败原因枚举 `RongETongRealQueryFailReason`，见第 4 节。前端按枚举值自己出文案 |

```json
{
  "result": [
    {
      "commissionNum": "SE20260928001",
      "reason": 2
    },
    {
      "commissionNum": "SE20260928002",
      "reason": 4
    }
  ],
  "success": true
}
```

# 4. 失败原因 reason

返回的是整数，不是文案。

| 值  | 枚举               | 含义                                              |
| :-- | :----------------- | :------------------------------------------------ |
| 1   | 未找到海运出口     | Id 对不上海运出口。此时 `commissionNum` 为 `null` |
| 2   | 未填写主提单号     | 没填主提单号                                      |
| 3   | 主提单号格式不正确 | 不是 6 到 30 位大写字母或数字                     |
| 4   | 未填写场站         | 没填场站，或场站简称为空                          |
| 5   | 场站简称过长       | 场站简称超过 20 个字符                            |
| 6   | 箱号为空           | 返回里有空箱号，未回写                            |
| 7   | 分票箱型不一致     | 同一箱号的分票箱型不一致，未回写                  |
| 8   | 分票封号不一致     | 同一箱号的分票封号不一致，未回写                  |
| 9   | 分票皮重不一致     | 同一箱号的分票皮重不一致，未回写                  |
| 10  | 分票船名不一致     | 同一箱号的分票船名不一致，未回写                  |
| 11  | 分票航次不一致     | 同一箱号的分票航次不一致，未回写                  |
| 12  | 船名不一致         | 不同箱子的船名不一致，未回写                      |
| 13  | 航次不一致         | 不同箱子的航次不一致，未回写                      |
| 14  | 请求超时           | 三方接口请求超时                                  |
| 15  | 请求失败           | 三方接口请求失败                                  |
| 16  | 返回为空           | 三方接口返回为空                                  |
| 17  | 返回格式错误       | 三方接口返回不是约定格式                          |
| 18  | 参数无效           | 三方接口判定参数无效                              |
| 19  | 请求已过期         | 三方接口请求已过期                                |
| 20  | 账号不存在         | 三方接口账号不存在                                |
| 21  | 账号已停用         | 三方接口账号已停用                                |
| 22  | 签名验证失败       | 三方接口签名验证失败                              |
| 23  | 请求重复           | 三方接口请求重复                                  |
| 24  | 接口暂不可用       | 三方接口暂时不可用                                |
| 25  | 接口返回失败       | 三方接口返回了上表以外的失败状态                  |

下面几种**不会**出现在失败列表里：

- 三方接口没有返回箱子：这一票的船名、航次、业务箱、是否提箱都保持原样。
- `skipPickedUp=true` 且该票已经提箱：不查询，不出现在失败列表里。
- 三方接口有箱子，但箱型对不上系统箱型表现形式：这一票算成功。原业务箱会删掉，对得上的才插入；对不上的不插入。是否提箱改为 true。

# 5. 即时运价查询

按起运港、目的港、两端运输类型和箱型，同步查各船司的即时运价。运输类型必填：`CY` 堆场，`SD` 门点。后端会等三方接口查完再返回，**最长 5 分钟**，超时的箱型判为失败。前端这个请求的超时设为 **5 分钟**（**2026-09-30 由 180 秒改为 5 分钟**），等待期间给出加载提示。等满 5 分钟后，后端还要再查一轮状态、取已完成的结果，返回可能晚几秒。前端先超时的，后端照样跑完，已查完的箱型已经存下，1 小时内同样条件重查会直接复用。同样条件包括两端运输类型。

| 项目 | 内容 |
| :-- | :-- |
| 方法 | `POST` |
| 地址 | `/api/services/app/RongETongAdmin/SpotQueryAsync` |
| 权限 | 登录，且具备「第三方接口 > 使用」（`Admin.ExternalApi.Use`） |
| 返回 | ABP 统一包一层 `result`。`result` 是数组，每个箱型一条，顺序和传入的 `ctnCodeIds` 一致 |

- **1 小时内复用**：起运港、目的港、两端运输类型、箱型都相同的查询，1 小时内直接复用之前的结果（`isReused=true`），不会重新查。运输类型不同会重新查询。`creationTime` 是原来那次的查询时间，可以显示成「xx 分钟前的运价」。
- **超过 5 分钟**：还没查完的箱型 `status` 为 2（失败），`errorMessage` 为「三方接口查询超时」。失败的不复用，再查会重新查询。
- **五字码不支持**：起运港或目的港的 EDI 代码不在前端写死的 911 个五字码里，整次请求报错，文案是「港口不支持」。此时不会向三方接口发请求，也不会扣查询次数。前端应在调用本接口之前用写死的名单本地判断并提示，不要等这个报错。没有单独的五字码查询接口。
- **箱型不支持**：表现形式去空格转大写后不是 `20GP`、`40GP`、`40HC`、`45HC`、`20NOR`、`40NOR`、`20RF`、`40RF`、`40RH`、`20OT`、`40OT` 之一，整次报错。文案写明不支持的箱型，并列出支持的箱型，例如「40HQ不支持，支持的箱型：20GP、40GP、40HC、45HC、20NOR、40NOR、20RF、40RF、40RH、20OT、40OT」。多个不支持的箱型用顿号隔开。不再把 `HQ` 换成 `HC`。此时不会向三方接口发请求，也不会扣查询次数。
- **报错**：没选港口或箱型、港口没维护 EDI 代码、五字码不支持、箱型不支持、三方接口账号或权益有问题时，不返回列表，直接走 ABP 错误，展示 `error.message` 即可。

## 5.1 请求参数

| 字段 | 类型 | 必填 | 说明 |
| :-- | :-- | :-- | :-- |
| polId | long | 是 | 起运港 Id。港口须维护 EDI 代码，且五字码须在前端写死的 911 个里，否则报「港口不支持」 |
| podId | long | 是 | 目的港 Id。港口须维护 EDI 代码，且五字码须在前端写死的 911 个里，否则报「港口不支持」 |
| polServiceType | string | 是 | 起运港运输类型。`CY` 堆场，`SD` 门点。会落库，1 小时内复用时必须相同 |
| podServiceType | string | 是 | 目的港运输类型。`CY` 堆场，`SD` 门点。会落库，1 小时内复用时必须相同 |
| ctnCodeIds | long[] | 是 | 箱型 Id，至少 1 个，不限个数。重复的 Id 只查一次。表现形式去空格转大写后只接受 `20GP`、`40GP`、`40HC`、`45HC`、`20NOR`、`40NOR`、`20RF`、`40RF`、`40RH`、`20OT`、`40OT`，否则报错写明不支持的箱型，并列出支持的箱型。不再把 `HQ` 换成 `HC` |

```json
{
  "polId": 1,
  "podId": 25,
  "polServiceType": "CY",
  "podServiceType": "SD",
  "ctnCodeIds": [1, 3, 5, 8]
}
```

## 5.2 返回 result[]

| 字段 | 类型 | 说明 |
| :-- | :-- | :-- |
| id | Guid | 查询记录 Id |
| ctnCode | object | 箱型，见 5.3 |
| status | int | 1 已完成，2 失败。接口返回时不会出现 0（执行中） |
| creationTime | datetime | 查询时间。复用时是原来那次的时间 |
| isReused | bool | 是否复用了 1 小时内同样条件的查询 |
| errorMessage | string | 失败原因，`status=2` 时有值：三方接口未返回查询任务号 / 三方接口查询任务已失效 / 三方接口查询超时 |
| spotList | array | 运价，`status=1` 时有值，每条是一个船司的一个船名航次，见 5.4。其他状态为 `[]` |

## 5.3 result[].ctnCode

| 字段        | 类型   | 说明                   |
| :---------- | :----- | :--------------------- |
| id          | long   | 箱型 Id                |
| ctnName     | string | 表现形式，如 40HQ      |
| cabinetType | int    | 柜型：0 普柜，1 特种柜 |
| ctnSize     | string | 集装箱类型             |
| ctnType     | string | 集装箱尺寸             |
| teu         | int    | TEU                    |

## 5.4 result[].spotList[]

| 字段 | 类型 | 说明 |
| :-- | :-- | :-- |
| quotationUnique | string | 船公司运价唯一标识 |
| carrierCode | string | 船司代码，如 MSK、EMC。是三方接口的编码，和系统船公司代码不一定一致 |
| etd | datetime | 开船日期，只有日期 |
| eta | datetime | 预抵日期，只有日期 |
| voyage | int | 航程（天） |
| isDirect | bool | 是否直达 |
| vessel | string | 船名 |
| innerVoyno | string | 航次（船公司航次） |
| routeCode | string | 航线代码，如 CEM |
| freightCurrency | string | 海运费币别代码，如 USD |
| freightAmount | decimal | 海运费金额 |
| totalCurrency | string | 总费用币别代码 |
| totalAmount | decimal | 总费用金额 |
| isSoldOut | bool | 是否售罄 |
| validTimeEnd | datetime | 报价有效期截止，可能为空 |
| quotationUpdateTime | datetime | 报价更新时间 |
| routeInfoList | array | 航线途经港口，见 5.5 |
| feeGroupInfoList | array | 费用，按费用分类分组，见 5.6 |
| spotFeeInfoList | array | Spot 费用，见 5.7 |
| dndGroupInfoList | array | 目的港滞箱、滞港、堆存费用，按类型分组，见 5.8 |

## 5.5 result[].spotList[].routeInfoList[]

| 字段        | 类型     | 说明                                |
| :---------- | :------- | :---------------------------------- |
| ediCode     | string   | 港口五字码，对应系统港口的 EDI 代码 |
| portName    | string   | 港口英文名称                        |
| portCountry | string   | 港口国家编码，如 CN                 |
| portTerm    | string   | 港口码头                            |
| vessel      | string   | 船名                                |
| innerVoyno  | string   | 航次（船公司航次）                  |
| routeCode   | string   | 航线代码                            |
| etd         | datetime | 预计离港日期，只有日期              |
| eta         | datetime | 预计到达日期，只有日期              |

## 5.6 result[].spotList[].feeGroupInfoList[]

| 字段 | 类型 | 说明 |
| :-- | :-- | :-- |
| feeCategoryName | string | 费用分类名称，如 Origin charges、Destination charges、Basic Ocean Freight |
| feeDetailList | array | 费用明细，见下表 |

**feeDetailList[]**

| 字段 | 类型 | 说明 |
| :-- | :-- | :-- |
| categoryName | string | 费用名称，英文全称，如 Low Sulphur Surcharge (LSS) |
| paymentMethod | string | 付款方式：P 预付，C 到付 |
| priceFeeType | int | 计费方式：0 按箱，1 按票。三方接口给了其他计费单位时为空 |
| currency | string | 币别代码 |
| price | decimal | 金额 |

## 5.7 result[].spotList[].spotFeeInfoList[]

| 字段        | 类型   | 说明             |
| :---------- | :----- | :--------------- |
| spotFeeName | string | 费用名称         |
| currency    | string | 币别代码         |
| price       | string | 单价，原样字符串 |

## 5.8 result[].spotList[].dndGroupInfoList[]

| 字段 | 类型 | 说明 |
| :-- | :-- | :-- |
| type | int | 1 进口滞箱（重箱出场起算），2 进口滞港（卸船起算），3 堆存，4 合并计算 |
| dndDetailInfoList | array | 费用明细，见下表 |

**dndDetailInfoList[]**

| 字段           | 类型   | 说明                   |
| :------------- | :----- | :--------------------- |
| destination    | string | 描述，一般是目的港名称 |
| validityPeriod | string | 区间（天），如 1-10    |
| currency       | string | 币别代码               |
| cost           | string | 费用，原样字符串       |

## 5.9 返回示例

```json
{
  "result": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "ctnCode": {
        "id": 1,
        "ctnName": "20GP",
        "cabinetType": 0,
        "ctnSize": "20",
        "ctnType": "GP",
        "teu": 1
      },
      "status": 1,
      "creationTime": "2026-09-29T16:56:43+08:00",
      "isReused": false,
      "errorMessage": null,
      "spotList": [
        {
          "quotationUnique": "9129177a7f5a5732cbce756411ed0869",
          "carrierCode": "EMC",
          "etd": "2026-10-03T00:00:00",
          "eta": "2026-11-19T00:00:00",
          "voyage": 47,
          "isDirect": true,
          "vessel": "EVER ART",
          "innerVoyno": "1359-012W",
          "routeCode": "CEM",
          "freightCurrency": "USD",
          "freightAmount": 2332,
          "totalCurrency": "USD",
          "totalAmount": 2435,
          "isSoldOut": false,
          "validTimeEnd": null,
          "quotationUpdateTime": "2026-09-29T16:56:57+08:00",
          "routeInfoList": [
            {
              "ediCode": "CNTAO",
              "portName": "Qingdao",
              "portCountry": "CN",
              "portTerm": "",
              "vessel": "EVER ART",
              "innerVoyno": "1359-012W",
              "routeCode": "CEM",
              "etd": "2026-10-03T00:00:00",
              "eta": null
            }
          ],
          "feeGroupInfoList": [
            {
              "feeCategoryName": "Origin charges",
              "feeDetailList": [
                {
                  "categoryName": "Low Sulphur Surcharge (LSS)",
                  "paymentMethod": "P",
                  "priceFeeType": 0,
                  "currency": "USD",
                  "price": 20
                }
              ]
            }
          ],
          "spotFeeInfoList": [],
          "dndGroupInfoList": [
            {
              "type": 1,
              "dndDetailInfoList": [
                {
                  "destination": "Hamburg",
                  "validityPeriod": "1-10",
                  "currency": "USD",
                  "cost": "0"
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  "success": true
}
```
