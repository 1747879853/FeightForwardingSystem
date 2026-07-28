---
title: Gemini 对接 - 前端对接
module: 外部Api对接 / Gemini
author: 系统
last_updated: 2026-07-25
---

# 1. 说明

本文档面向前端，汇总 Gemini 智能解析相关**前端需对接的接口**（均在 `GeminiAdminAppService` 中）。

> **重要：本次后端把"访问 Gemini"的出站请求拆到了独立的外网服务器(`Freight.GlobalServer`)，但接口地址、入参、出参对前端完全没有变化，前端无需做任何改动。** 密钥保管、境外网络、转发、超时等全部由后端处理。
>
> 后端架构说明见：`Gemini对接-外网服务器拆分-2026-07-25.md`、`Gemini模块总逻辑文档.md`

# 2. 接口清单

| 接口 | 用途 | 章节 |
| :-- | :-- | :-- |
| `ExtractSeFreiPriceByPromptAsync` | 上传海运报价文件，解析为多行价格数据并回填港口/币别/箱型Id | 见「3」 |
| `ExtractBillDataAsync` | 上传提单PDF，提取提单字段（gemini-3.5-flash） | 见「4」 |
| `ExtractBillDataBy31FlashLiteAsync` | 上传提单PDF，提取提单字段（gemini-3.1-flash-lite，效果对比用） | 见「5」 |

**三个接口的公共约定：**

| 项目 | 内容 |
| :-- | :-- |
| 方法 | `POST` |
| 请求格式 | `multipart/form-data`，**取第一个文件**（文件字段名不限） |
| 权限 | 需登录（类级 `[AbpAuthorize]`，无额外权限点） |
| 返回包装 | ABP 统一包一层 `result` |
| 失败 | 统一抛 `UserFriendlyException`，前端按常规错误提示展示即可 |
| 耗时 | 单证解析通常 10~60 秒，前端务必给 loading 且**不要设过短的超时**（后端超时 180 秒） |

---

# 3. 海运报价解析 (ExtractSeFreiPriceByPromptAsync)

## 3.1 接口

| 项目   | 内容                                                            |
| :----- | :-------------------------------------------------------------- |
| 方法   | `POST`                                                          |
| 地址   | `/api/services/app/GeminiAdmin/ExtractSeFreiPriceByPromptAsync` |
| 请求体 | `multipart/form-data`，单个文件                                 |
| 返回   | `GeminiSeFreiPriceDto[]`，见「3.3」                             |

## 3.2 请求参数

| 字段名 | 类型 | 含义 | 必填 | 说明 |
| :-- | :-- | :-- | :-- | :-- |
| **（文件）** | File | 待解析的报价文件 | 是 | 支持 pdf / png / jpg / jpeg / webp / heic / heif / gif / bmp / txt / **xlsx / xls**；Excel 会在后端转为 HTML 表格(保留合并单元格)再识别；未上传报「请上传文件」 |

## 3.3 返回结构 (GeminiSeFreiPriceDto)

| 字段名 | 类型 | 含义 | 说明 |
| :-- | :-- | :-- | :-- |
| **podName** | string | 卸货港名称 | 模型识别出的原始名称，**始终保留**，便于人工核对 |
| **podId** | long | 目的港Id | 由 `podName` 多字段模糊匹配得出，**匹配不到为 -1**，前端需高亮让用户手工选 |
| **isDirect** | bool? | 是否直航 | `true`=直航，`false`=中转，`null`=未识别 |
| **pot1Name** | string | 中转港1名称 | 可能为空 |
| **pot1Id** | long? | 中转港1Id | 名称为空则不匹配（为 null）；有名称但匹配不到为 -1 |
| **pot2Name** | string | 中转港2名称 | 可能为空 |
| **pot2Id** | long? | 中转港2Id | 同 `pot1Id` 规则 |
| **currencyCode** | string | 币别代码 | 国际标准币别码，模型未识别时默认 `USD` |
| **currencyId** | long | 币别Id | 由 `currencyCode` 模糊匹配，匹配不到为 -1 |
| **validTimeStart** | DateTime? | 有效期开始 | ISO 8601 格式 |
| **validTimeEnd** | DateTime? | 有效期结束 | ISO 8601 格式 |
| **remark** | string | 备注 | 模型提取的补充说明 |
| **seFreiPriceCtns** | object[] | 箱型价格明细 | 见「3.4」 |

## 3.4 箱型价格明细 (SeFreiPriceCtnDto)

| 字段名 | 类型 | 含义 | 说明 |
| :-- | :-- | :-- | :-- |
| **ctnName** | string | 箱型名称 | 如 `20GP`/`40GP`/`40HC`/`40NOR`；模型未识别箱型名时按列序默认 |
| **ctnCodeId** | long | 箱型Id | 由 `ctnName` 模糊匹配，匹配不到为 -1 |
| **price** | decimal? | 价格 | 可能为空 |

> **前端处理要点：** 所有 `xxId` 为 `-1` 表示"模型识别到了名称，但系统基础资料里没匹配上"，应在录入界面把该行/该字段标红并要求用户手工选择；名称字段(`podName`/`currencyCode`/`ctnName`)始终返回，可直接展示给用户参考。解析结果为空数组表示模型未识别出任何行。

## 3.5 返回示例

```json
{
  "result": [
    {
      "podName": "LOS ANGELES",
      "podId": 1032,
      "isDirect": true,
      "pot1Name": null,
      "pot1Id": null,
      "pot2Name": null,
      "pot2Id": null,
      "currencyCode": "USD",
      "currencyId": 1,
      "validTimeStart": "2026-08-01T00:00:00",
      "validTimeEnd": "2026-08-15T00:00:00",
      "remark": "含THC",
      "seFreiPriceCtns": [
        { "ctnName": "20GP", "ctnCodeId": 3, "price": 1200 },
        { "ctnName": "40HC", "ctnCodeId": -1, "price": 2300 }
      ]
    }
  ],
  "targetUrl": null,
  "success": true,
  "error": null,
  "unAuthorizedRequest": false
}
```

---

# 4. 提单数据提取 (ExtractBillDataAsync)

## 4.1 接口

| 项目   | 内容                                                 |
| :----- | :--------------------------------------------------- |
| 方法   | `POST`                                               |
| 地址   | `/api/services/app/GeminiAdmin/ExtractBillDataAsync` |
| 请求体 | `multipart/form-data`，单个 PDF 文件                 |
| 返回   | 动态 JSON 对象（模型输出的字段集合，非固定结构）     |

## 4.2 请求参数

| 字段名 | 类型 | 含义 | 必填 | 说明 |
| :-- | :-- | :-- | :-- | :-- |
| **（文件）** | File | 待解析的提单文件 | 是 | 按 `application/pdf` 发送给模型 |

## 4.3 返回结构

返回的是模型按提示词输出的 JSON 原样反序列化结果，**字段不固定、可能缺失（值为 null 表示全文未出现，不会编造）**，前端按需取用。当前提示词要求提取：

`BookingNo`、`Vessel`、`Voyage`、`ContainerNo`、`Shipper`、`Consignee`、`Notify Party`、`B/L NO`、`Seal No`、`Number of containers or packages`、`Kind of Packages`、`Description of Goods`、`Gross Weight`、`Measurement`、`Port of Loading`、`Port of Discharge`、`Place of Receipt`、`Place of Delivery`、`NO.of Packages`、`Marks`、`船名`、`航次`、`起运港`、`卸货港`、`收货地`、`交货地`、`船期`、`船公司`、`箱型箱量`、`CNTRTOTAL`

---

# 5. 提单数据提取-轻量模型 (ExtractBillDataBy31FlashLiteAsync)

## 5.1 接口

| 项目   | 内容                                                              |
| :----- | :---------------------------------------------------------------- |
| 方法   | `POST`                                                            |
| 地址   | `/api/services/app/GeminiAdmin/ExtractBillDataBy31FlashLiteAsync` |
| 请求体 | `multipart/form-data`，单个 PDF 文件                              |
| 返回   | 动态 JSON 对象（当前提示词只提取 `发货人`/`收货人`/`通知人`）     |

## 5.2 说明

该接口用于与「4. 提单数据提取」做**效果与速度对比**（使用 `gemini-3.1-flash-lite`、思考等级 medium），提示词与提取字段和正式接口不同，**不建议直接用于生产页面**。
