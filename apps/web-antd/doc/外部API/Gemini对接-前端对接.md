---
title: Gemini 对接 - 前端对接
module: 外部Api对接 / Gemini
author: 系统
last_updated: 2026-09-15
---

# 1. 说明

本文档面向前端，汇总 Gemini 智能解析相关**前端需对接的接口**（均在 `GeminiAdminAppService` 中）。

> **重要：本次后端把"访问 Gemini"的出站请求拆到了独立的外网服务器(`Freight.GlobalServer`)，但接口地址、入参、出参对前端完全没有变化，前端无需做任何改动。** 密钥保管、境外网络、转发、超时等全部由后端处理。
>
> 后端架构说明见：`Gemini对接-外网服务器拆分-2026-07-25.md`、`Gemini模块总逻辑文档.md`
>
> **2026-08-13 更新：** 海运报价解析新增可选文字入参 `text`，前端可让用户"上传文件"或"直接粘贴文字"二选一，原有文件上传调用**不受影响、无需改动**。详见「3.2」与 `Gemini对接-报价解析支持文字输入-2026-08-13.md`。
>
> **2026-09-15 更新：** 新增 `ExtractClientInvoiceInfoAsync`：上传开票资料文件**或直接粘贴开票资料文字**，识别客户的开票信息（抬头、纳税人识别号、开票地址、开票电话、手机、开票要求）与**开票银行列表**，出参字段名与客户开票信息表一致，可直接填回新增/编辑开票信息的表单。详见「10」。
>
> **2026-09-14 更新：** 新增**单证抽取转新建Dto**四个接口（海运出口 / 海运进口 / 空运出口 / 业务联系单），上传单证直接返回对应业务「新建」接口的入参 Dto，用于填表单。与 `TextInAdmin` 下同名的四个接口**入参与表单字段完全一致**，只是换了识别引擎，且**不返回原文定位信息 `extract`**（返回值就是表单对象本身，没有外层包装）。详见「9」。
>
> **2026-09-07 更新：**
>
> 1. 新增 `UploadAndExtractInvoiceAsync`：上传一个发票文件(PDF或图片)，**一次请求完成落附件 + 识别发票**，出参在通用上传结果上增加嵌套的 `invoice` 对象，识别失败为 `null`。原 `ExtractInvoiceAsync`（只识别不落库）**保持不变**。详见「8」。
> 2. `ExtractBillFeesAsync` 传了 `transportOrderId` 时不再核对比单号：业务存在即返回；认不出提单号、或识别提单号与当前票对不上，都不报错，费用挂到该业务上。前端用返回的 `mblNum` 自己判断是否对得上。详见「7」。
>
> **2026-09-06 更新：** 新增 `ExtractBillFeesAsync`：上传单票账单，识别提单号与费用并匹配业务，返回费用添加 DTO 列表（不落库）。费用行的 `settlement` 按行业类别从业务带回完整客户对象，不只是 id。详见「7」。
>
> **2026-09-04 更新：** 新增 `UploadAndExtractCtnNoAsync`：上传一张图片并识别箱号，出参在通用上传结果上增加 `ctnNo`，识别失败为 `null`。详见「6」。
>
> **2026-08-17 更新：**
>
> 1. 海运报价解析出参**新增 4 个字段**：船公司 `carrierName`/`carrierId`、起运港 `polName`/`polId`，详见「3.3」。原有字段不变。
> 2. **新增发票识别接口** `ExtractInvoiceAsync`（发票号 + 开票日期，支持上传文件或传 `attachmentId`），详见 `Gemini对接-发票识别-前端对接文档-2026-08-17.md`。

# 2. 接口清单

| 接口 | 用途 | 章节 |
| :-- | :-- | :-- |
| `ExtractSeFreiPriceByPromptAsync` | 上传海运报价文件**或直接传报价文字**，解析为多行价格数据并回填船公司/港口/币别/箱型Id | 见「3」 |
| `ExtractInvoiceAsync` | 上传发票文件**或传已上传附件的 attachmentId**，只识别不落库 | 见 `Gemini对接-发票识别-前端对接文档-2026-08-17.md` |
| `UploadAndExtractInvoiceAsync` | 上传**一个**发票文件(PDF或图片)，落成附件并识别发票信息 | 见「8」 |
| `UploadAndExtractCtnNoAsync` | 上传**一张**图片，落成附件并识别箱号 | 见「6」 |
| `ExtractBillFeesAsync` | 上传**单票账单**，识别提单号与费用并匹配业务，返回费用添加 DTO 列表（不落库） | 见「7」 |
| `ExtractClientInvoiceInfoAsync` | 上传开票资料文件**或直接传开票资料文字**，识别客户开票信息与开票银行列表（不落库） | 见「10」 |
| `ExtractBillDataAsync` | 上传提单PDF，提取提单字段（gemini-3.5-flash） | 见「4」 |
| `ExtractBillDataBy31FlashLiteAsync` | 上传提单PDF，提取提单字段（gemini-3.1-flash-lite，效果对比用） | 见「5」 |
| `ExtractSeaExportToAddDtoAsync` | 上传单证，返回**新建海运出口**的入参 Dto（已回填 Id） | 见「9」 |
| `ExtractSeaImportToAddDtoAsync` | 上传单证，返回**新建海运进口**的入参 Dto（已回填 Id） | 见「9」 |
| `ExtractAirExportToAddDtoAsync` | 上传单证，返回**新建空运出口**的入参 Dto（已回填 Id，港口匹配机场表） | 见「9」 |
| `ExtractPreOrderToAddDtoAsync` | 上传单证，返回**新建业务联系单**的入参 Dto（已回填 Id，需传 `bizType`） | 见「9」 |

**这些接口的公共约定：**

| 项目 | 内容 |
| :-- | :-- |
| 方法 | `POST` |
| 请求格式 | `multipart/form-data`，**取第一个文件**（文件字段名不限）；`ExtractSeFreiPriceByPromptAsync` 与 `ExtractClientInvoiceInfoAsync` 另支持只传文字（见「3.2」「10.2」），`ExtractInvoiceAsync` 另支持只传 `attachmentId`；`UploadAndExtractCtnNoAsync` **只允许一张图片**，`UploadAndExtractInvoiceAsync` **只允许一个 PDF 或图片**；`ExtractBillFeesAsync` 只收文件、上限 20MB，可选 `transportOrderId` |
| 权限 | 需登录（类级 `[AbpAuthorize]`，无额外权限点） |
| 返回包装 | ABP 统一包一层 `result` |
| 失败 | 统一抛 `UserFriendlyException`，前端按常规错误提示展示即可 |
| 耗时 | 单证解析通常 10~60 秒，前端务必给 loading 且**不要设过短的超时**（后端超时 180 秒） |

---

# 3. 海运报价解析 (ExtractSeFreiPriceByPromptAsync)

## 3.1 接口

| 项目 | 内容 |
| :-- | :-- |
| 方法 | `POST` |
| 地址 | `/api/services/app/GeminiAdmin/ExtractSeFreiPriceByPromptAsync` |
| 请求体 | `multipart/form-data`，**单个文件** 或 **文字字段 `text`**（二选一，见「3.2」） |
| 返回 | `GeminiSeFreiPriceDto[]`，见「3.3」 |

## 3.2 请求参数

**文件与文字二选一，传了文字就用文字解析、不再读文件；两者都不传报「请上传文件或输入需要解析的文字」。**

| 字段名 | 类型 | 含义 | 必填 | 说明 |
| :-- | :-- | :-- | :-- | :-- |
| **text** | string | 待解析的报价**文字内容** | 否 | 直接粘贴的报价文本。**非空白时优先使用，此时上传的文件被忽略**；只传空格/换行等空白等同于没传 |
| **（文件）** | File | 待解析的报价**文件** | 否 | 未传 `text` 时必传。支持 pdf / png / jpg / jpeg / webp / heic / heif / gif / bmp / txt / **xlsx / xls**；Excel 会在后端转为 HTML 表格(保留合并单元格)再识别 |

**`text` 的传参方式（重要）：**

| 方式 | 是否支持 | 示例 |
| :-- | :-- | :-- |
| `multipart/form-data` 表单字段（推荐，可与文件同一请求） | ✅ | `formData.append('text', '上海到洛杉矶 20GP 1200 40HC 2300 ...')` |
| `application/x-www-form-urlencoded` 表单字段 | ✅ | `text=上海到洛杉矶...` |
| URL query 参数 | ✅ | `...ExtractSeFreiPriceByPromptAsync?text=xxx`（文字长建议改用表单） |
| JSON 请求体 `{"text":"..."}` | ❌ **不支持** | 后端绑不到值，会当作没传文字并报错 |

**只传文字的最小示例：**

```javascript
const formData = new FormData();
formData.append('text', pastedText);
await axios.post(
  '/api/services/app/GeminiAdmin/ExtractSeFreiPriceByPromptAsync',
  formData,
);
```

## 3.3 返回结构 (GeminiSeFreiPriceDto)

| 字段名 | 类型 | 含义 | 说明 |
| :-- | :-- | :-- | :-- |
| **carrierName** | string | 船公司名称/简称 | `2026-08-17 新增`。如 `CMA`、`马士基`；常写在表头或行首，后端会下发给该段每一行。未识别为 null |
| **carrierId** | long | 船公司Id | `2026-08-17 新增`。由 `carrierName` 多字段模糊匹配得出，**匹配不到为 -1** |
| **polName** | string | 起运港名称 | `2026-08-17 新增`。装货港，如 `天津`。未识别为 null |
| **polId** | long | 起运港Id | `2026-08-17 新增`。由 `polName` 多字段模糊匹配得出，**匹配不到为 -1** |
| **podName** | string | 卸货港名称 | 模型识别出的原始名称，**始终保留**，便于人工核对。原文若是「欧洲」等区域名会原样返回，此时 `podId` 多为 -1 |
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
>
> **文字识别提示：** 纯文字没有表格版面信息，识别准确率通常低于文件/Excel。表格型报价建议引导用户上传原文件；若用户坚持粘贴文字，提示其"每个目的港一行、各列用空格或制表符对齐"。

## 3.5 返回示例

```json
{
  "result": [
    {
      "carrierName": "CMA",
      "carrierId": 12,
      "polName": "天津",
      "polId": 88,
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

---

# 6. 上传图片识别箱号 (UploadAndExtractCtnNoAsync)

## 6.1 接口

| 项目 | 内容 |
| :-- | :-- |
| 方法 | `POST` |
| 地址 | `/api/services/app/GeminiAdmin/UploadAndExtractCtnNoAsync` |
| 请求体 | `multipart/form-data`，**只能一张图片**（文件字段名不限） |
| 权限 | 需登录（类级 `[AbpAuthorize]`，无额外权限点） |
| 返回 | `GeminiCtnNoUploadDto`，见「6.3」 |
| 返回包装 | ABP 统一包一层 `result` |
| 耗时 | 识别通常数秒到十几秒，前端给 loading；**不要把超时设太短**（后端超时 180 秒） |

## 6.2 请求参数

| 字段名 | 类型 | 含义 | 必填 | 说明 |
| :-- | :-- | :-- | :-- | :-- |
| **（文件）** | File | 箱号照片 | **是** | 只支持 **一张**。支持 png / jpg / jpeg / webp / heic / heif / gif / bmp。超过 **5MB** 报 `文件太大，不可超过5M`。0 张报 `请上传图片`，多于 1 张报 `只支持上传一张图片` |

```javascript
const formData = new FormData();
formData.append('file', selectedImage);
const res = await axios.post(
  '/api/services/app/GeminiAdmin/UploadAndExtractCtnNoAsync',
  formData,
);
```

## 6.3 返回结构 (`GeminiCtnNoUploadDto`)

继承通用上传结果 `UploadFileDto`，额外一个箱号字段：

| 字段名 | 类型 | 含义 | 说明 |
| :-- | :-- | :-- | :-- |
| **filePath** | string | 文件存储相对路径 | 与 `POST /api/Upload/UploadFile` 相同口径 |
| **fileUrl** | string | 文件访问地址 | 同上 |
| **fileName** | string | 原始文件名 | 同上 |
| **attachmentId** | long | 附件Id | 已写入附件表，后续可按附件关联 |
| **ctnNo** | string | 识别出的箱号 | 字母数字、已转大写、已去掉空格和横杠。**识别失败或图里没有箱号为 `null`**，此时上面四个附件字段仍然有值 |

> **识别失败不报错。** 接口 `success` 仍为 true，只是 `ctnNo` 为 `null`。前端要单独判断箱号是否为空，让用户手工填。

## 6.4 返回示例

识别成功：

```json
{
  "result": {
    "filePath": "image/20260904/6389xxxx.jpg",
    "fileUrl": "/FileServer/.../image/20260904/6389xxxx.jpg",
    "fileName": "箱门.jpg",
    "attachmentId": 50001,
    "ctnNo": "CBHU1234567"
  },
  "success": true,
  "error": null
}
```

识别失败（附件已保存）：

```json
{
  "result": {
    "filePath": "image/20260904/6389xxxx.jpg",
    "fileUrl": "/FileServer/.../image/20260904/6389xxxx.jpg",
    "fileName": "箱门.jpg",
    "attachmentId": 50001,
    "ctnNo": null
  },
  "success": true,
  "error": null
}
```

---

# 7. 单票账单识别费用 (ExtractBillFeesAsync)

上传船公司/订舱代理的**单票账单**（Invoice / Debit Note），识别提单号和费用行，返回费用添加 DTO 列表，**由用户决定是否添加**。本接口**不写费用**。

- **未传 `transportOrderId`：** 必须识别到提单号，并按主提单号唯一匹配到业务，否则报错。
- **传了 `transportOrderId`：** 先校验该业务存在；认不出提单号、或识别提单号与该票对不上，**都不报错**。费用挂到传入的业务上。前端用返回的 `mblNum` 自己判断是否对得上。

## 7.1 接口

| 项目 | 内容 |
| :-- | :-- |
| 方法 | `POST` |
| 地址 | `/api/services/app/GeminiAdmin/ExtractBillFeesAsync` |
| 请求体 | `multipart/form-data`，**单个文件**（取第一个，字段名不限），可选表单字段 `transportOrderId` |
| 权限 | 需登录（类级 `[AbpAuthorize]`，无额外权限点） |
| 返回 | `GeminiBillFeeExtractDto`，见「7.3」 |
| 返回包装 | ABP 统一包一层 `result` |
| 失败 | 统一抛 `UserFriendlyException`，文案见「7.6」 |
| 耗时 | 通常 10~60 秒，前端给 loading；**不要把超时设太短**（后端超时 180 秒） |

## 7.2 请求参数

| 字段名 | 类型 | 含义 | 必填 | 说明 |
| :-- | :-- | :-- | :-- | :-- |
| **transportOrderId** | Guid | 当前业务id | 否 | 费用页已打开某一票时传入。**有值时只校验业务存在**，不核对比单号。认不出提单号、或识别提单号与该票对不上，都不报错，费用 `transportOrderId` 填这个值。不传则必须识别到提单号并唯一匹配业务 |
| **（文件）** | File | 单票账单 | **是** | 支持 pdf / png / jpg / jpeg / webp / heic / heif / gif / bmp / txt / xlsx / xls。超过 **20MB** 报错。0 张报 `请上传账单文件` |

`transportOrderId` 的传参方式与发票识别的 `attachmentId` 相同：用 **form 字段**或 **query**，不要放 JSON body。

```javascript
const formData = new FormData();
formData.append('file', selectedFile);
formData.append('transportOrderId', currentOrderId);
const res = await axios.post(
  '/api/services/app/GeminiAdmin/ExtractBillFeesAsync',
  formData,
);
```

用户勾选后，把 `orderFees` 里要添加的行（去掉 `feeCodeId`/`currencyId` 仍为 `-1` 的，或先改成有效 Id）提交到现有费用接口：

`PUT /api/services/app/OrderFeeAdmin/BatchEditAsync`，body 为 `{ orderFees: selectedRows }`。`id` 为空表示新增。一次只能提交同一业务、同一收付类型；本接口返回的行已是同一业务且 `paySide` 均为应付。

## 7.3 返回结构 (`GeminiBillFeeExtractDto`)

识别结果按「提单号 → 业务 → 费用列表」嵌套，不要把业务字段和费用字段拍平。

### 7.3.1 行级 `GeminiBillFeeExtractDto`

| 字段名 | 类型 | 含义 | 说明 |
| :-- | :-- | :-- | :-- |
| **mblNum** | string | 识别出的提单号 | 已去掉空格/横杠并转大写。未传业务id时恒有值（认不出会报错）。**传了业务id 时认不出为 null，不报错** |
| **transportOrder** | object | 用于组装费用的业务 | 见「7.3.2」，恒有值 |
| **orderFees** | object[] | 费用添加列表 | 见「7.3.3」。可能为空数组（认到提单号但对不出费用行） |

### 7.3.2 嵌套对象 `transportOrder`（`GeminiBillFeeTransportOrderDto`）

恒有值。传了 `transportOrderId` 时就是该票；未传时是按识别提单号匹配到的那票。

| 字段名 | 类型 | 含义 | 说明 |
| :-- | :-- | :-- | :-- |
| **id** | Guid | 业务id | 即 `TransportOrder.Id`，也是下面每条费用的 `transportOrderId` |
| **bizType** | enum | 业务类型 | 海运出口/海运进口/空运出口等 |
| **commissionNum** | string | 委托编号 |  |
| **mblNum** | string | 主提单号 | 库里原值。可能与外层识别值不同（传了业务id 且对不上时，外层是账单上的，这里是当前票的） |

### 7.3.3 嵌套数组 `orderFees[]`（`OrderFeeEditDto`）

每条就是费用批量编辑的新增项，`id` 恒为 `null`。`feeCode` / `currency` / `settlement` 是展示用嵌套对象，提交时以后端认的 `feeCodeId` / `currencyId` / `settlementId` 为准。

| 字段名 | 类型 | 含义 | 说明 |
| :-- | :-- | :-- | :-- |
| **id** | Guid? | 费用id | **恒为 `null`**（新增） |
| **paySide** | enum | 收付类型 | 账单固定为 **付**（应付） |
| **changeOrderId** | Guid? | 更改单id | 恒为 `null`（记在主单上） |
| **transportOrderId** | Guid | 业务id | 与 `transportOrder.id` 相同 |
| **feeCodeId** | long | 费用代码id | 由费用项目匹配。**匹配不到为 -1**，须用户改完才能提交 |
| **industryCategory** | enum? | 结算对象类别 | 按费用代码默认付费客户类型解析，解析不到为 null |
| **settlementId** | Guid? | 结算对象id | 按类别从业务上带出；带不到为 null，录入状态允许为空 |
| **currencyId** | long | 币别id | 由币种列匹配。**匹配不到为 -1** |
| **exchangeRate** | decimal | 汇率 | 按业务所属公司本位币 + 会计期间 + 应付取值；对不上为 0 |
| **unitPrice** | decimal | 含税单价 | 账单 Rate / 单价列 |
| **noTaxUnitPrice** | decimal | 不含税单价 | 按费用代码默认税率反算 |
| **amount** | decimal | 金额 | `unitPrice * quantity`，两位小数 |
| **noTaxAmount** | decimal | 不含税金额 | 按税率反算 |
| **unit** | string | 单位 | **箱型名**（匹配到箱型基础资料则用系统箱型名，否则用账单原文，如 `40HC`） |
| **quantity** | decimal | 数量 | **该箱型的箱量**，不是 UNI/FIX 这种单位名 |
| **taxRate** | decimal | 税率(%) | 取自匹配到的费用代码默认税率，未匹配为 0 |
| **invoiceBlocked** | bool | 是否禁开发票 | 取自费用代码，未匹配为 false |
| **isConfidential** | bool | 是否机密 | 取自费用代码，未匹配为 false |
| **remark** | string | 备注 | 本接口不填，为 null |
| **feeCode** | object | 费用代码（展示） | 见「7.3.4」。未匹配时 `id=-1`，`code`/`cnName`/`enName` 为账单上的费用项目原文 |
| **settlement** | object | 结算对象（展示） | 见「7.3.6」。`settlementId` 由 `ResolveSettlementByIndustryCategory` 按费用代码默认付费客户类型从业务上带出，再查客户表回填本对象；带不到为 null。提交仍以 `settlementId` 为准 |
| **currency** | object | 币别（展示） | 见「7.3.5」。未匹配时用账单币种代码填 `code`/`cnName`/`enName` |

### 7.3.4 嵌套对象 `orderFees[].feeCode`（`FeeCodeSimpleDto`）

| 字段名 | 类型 | 含义 | 说明 |
| :-- | :-- | :-- | :-- |
| **id** | long | 费用代码id | 与 `feeCodeId` 一致；未匹配为 -1 |
| **code** | string | 费用代码 | 未匹配时为账单费用项目原文 |
| **cnName** | string | 中文名称 | 未匹配时为账单费用项目原文 |
| **enName** | string | 英文名称 | 未匹配时为账单费用项目原文 |
| **currencyId** | long | 默认币别id | 未匹配时为 0 |
| **defaultUnit** / **defaultUnitName** | string | 默认计费标准 | 未匹配时为 null |
| **defaultDebitName** / **defaultCreditName** | string | 默认收/付客户类型字母 | 未匹配时为 null |
| **isConfidential** | bool | 是否机密 | 未匹配时为 false |
| **isInvoiceProhibit** | bool | 禁开发票 | 未匹配时为 false |
| **taxRate** | decimal | 默认税率 | 未匹配时为 0 |
| **exchangeRate** | object | 当前有效汇率 | 本接口不填，为 null |

### 7.3.5 嵌套对象 `orderFees[].currency`（`CurrencySimpleDto`）

匹配到或未匹配时都尽量有值，便于展示。本对象**没有 id**，提交用外层 `currencyId`。

| 字段名     | 类型   | 含义     | 说明                 |
| :--------- | :----- | :------- | :------------------- |
| **code**   | string | 币别代码 | 如 `CNY`             |
| **cnName** | string | 中文名称 | 未匹配时与 code 相同 |
| **enName** | string | 英文名称 | 未匹配时与 code 相同 |

### 7.3.6 嵌套对象 `orderFees[].settlement`（`ClientSimpleDto`）

有 `settlementId` 时恒有值（客户已删则仍为 null）。提交费用只用外层 `settlementId`，本对象给表格展示简称/代码/失信标记。

| 字段名              | 类型     | 含义       | 说明                       |
| :------------------ | :------- | :--------- | :------------------------- |
| **id**              | Guid     | 客户id     | 与外层 `settlementId` 一致 |
| **name**            | string   | 客户简称   |                            |
| **code**            | string   | 客户代码   |                            |
| **fullName**        | string   | 客户全称   |                            |
| **enName**          | string   | 客户英文名 |                            |
| **isDishonest**     | bool     | 是否失信   |                            |
| **dishonestRemark** | string   | 失信备注   | 未失信时为 null            |
| **enterpriseType**  | int?     | 企业类型   | 前端自定义枚举             |
| **clientType**      | enum?    | 客户类型   | 0 同行 / 1 直客            |
| **isShared**        | bool     | 是否共享   |                            |
| **orgId**           | long?    | 归属公司id |                            |
| **orgs**            | object[] | 归属组织串 | 本接口不填，为 null        |

## 7.4 返回示例

```json
{
  "result": {
    "mblNum": "GGZ3096976",
    "transportOrder": {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "bizType": 1,
      "commissionNum": "2607SE001",
      "mblNum": "GGZ3096976"
    },
    "orderFees": [
      {
        "id": null,
        "paySide": 1,
        "changeOrderId": null,
        "transportOrderId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "feeCodeId": 12,
        "industryCategory": 15,
        "settlementId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        "currencyId": 1,
        "exchangeRate": 1,
        "unitPrice": 1190,
        "noTaxUnitPrice": 1190,
        "amount": 1190,
        "noTaxAmount": 1190,
        "unit": "40HQ",
        "quantity": 1,
        "taxRate": 0,
        "invoiceBlocked": false,
        "isConfidential": false,
        "remark": null,
        "feeCode": {
          "id": 12,
          "code": "OTHC",
          "cnName": "码头操作费",
          "enName": "Terminal Handling Charge"
        },
        "settlement": {
          "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
          "name": "某某订舱代理",
          "code": "BK001",
          "fullName": "某某订舱代理有限公司",
          "enName": null,
          "isDishonest": false,
          "dishonestRemark": null,
          "enterpriseType": null,
          "clientType": 0,
          "isShared": false,
          "orgId": 1,
          "orgs": null
        },
        "currency": { "code": "CNY", "cnName": "人民币", "enName": "CNY" }
      }
    ]
  },
  "success": true,
  "error": null
}
```

> `unit` 示例为 `40HQ`：账单原文可能是 `40HC`，匹配到系统箱型后改用系统箱型名。未匹配到箱型时保留账单原文。
>
> `paySide=1` 为应付。`feeCodeId=-1` 的行必须让用户手工选费用代码。
>
> `industryCategory=15` 为订舱代理。示例里 `settlementId` 与 `settlement.id` 相同；类别带不出往来单位（如船公司）时两者都为 null。

## 7.5 前端处理要点

1. 传了 `transportOrderId` 时，用返回的 `mblNum` 和当前业务主提单号比对；对不上只提示用户，**接口不会报错**。`mblNum` 为 null 表示账单上没认出提单号，同样不报错。
2. 用表格展示 `orderFees`，让用户勾选要添加的行。费用已挂在传入的业务上（`orderFees[].transportOrderId` = 入参）。
3. `feeCodeId` 或 `currencyId` 为 **-1** 的行标红，下拉改成系统费用代码/币别后再允许勾选提交。
4. `settlementId` 为空不拦录入保存；提交审核时现有费用接口仍会要求结算对象。有值时用 `settlement.name` 展示，不要只显示 id。
5. **不要把本接口成功当成费用已保存。**

## 7.6 失败文案

| 文案 | 原因 |
| :-- | :-- |
| `请上传账单文件` | 没传文件或文件是空的 |
| `账单文件大小 xMB，超过 20MB 上限，无法识别` | 文件过大 |
| `未能识别到提单号` | **未传** `transportOrderId`，且账单上找不到提单号 |
| `业务不存在` | 传了 `transportOrderId` 但该业务不存在或已删除 |
| `未找到提单号对应的业务` | **未传** 业务id，认到了提单号，但当前租户没有主提单号相同的业务 |
| `提单号对应多条业务，请人工核对` | **未传** 业务id，同一个主提单号命中多票 |
| `AI识别账单结果无法解析` | 模型返回不是合法 JSON，已重试仍失败 |
| `AI识别失败：…` | 外网服务器/模型调用失败（文案已中性化，不含供应商名） |

---

# 8. 上传文件识别发票 (UploadAndExtractInvoiceAsync)

上传一个发票文件（PDF 或图片），**一次请求同时完成两件事**：按通用上传口径把文件落成附件，并用 AI 识别发票信息。识别不出时不会把整次上传打成失败。

## 8.1 接口

| 项目 | 内容 |
| :-- | :-- |
| 方法 | `POST` |
| 地址 | `/api/services/app/GeminiAdmin/UploadAndExtractInvoiceAsync` |
| 请求体 | `multipart/form-data`，**只能一个文件**（文件字段名不限） |
| 权限 | 需登录（类级 `[AbpAuthorize]`，无额外权限点） |
| 返回 | `GeminiInvoiceUploadDto`，见「8.3」 |
| 返回包装 | ABP 统一包一层 `result` |
| 耗时 | 识别通常数秒到十几秒，前端给 loading；**不要把超时设太短**（后端超时 180 秒） |

## 8.2 请求参数

| 字段名 | 类型 | 含义 | 必填 | 说明 |
| :-- | :-- | :-- | :-- | :-- |
| **（文件）** | File | 发票文件 | **是** | 只支持 **一个**。允许 **pdf** 与图片 png / jpg / jpeg / webp / heic / heif / gif / bmp，其它格式报 `只支持上传PDF或图片`。大小上限按类型区分：**图片 5MB、PDF 10MB**（与通用上传口径一致）。0 个报 `请上传发票文件`，多于 1 个报 `只支持上传一个发票文件` |

```javascript
const formData = new FormData();
formData.append('file', selectedFile);
const res = await axios.post(
  '/api/services/app/GeminiAdmin/UploadAndExtractInvoiceAsync',
  formData,
);
```

## 8.3 返回结构 (`GeminiInvoiceUploadDto`)

继承通用上传结果 `UploadFileDto`，额外一个**嵌套**的发票信息对象：

| 字段名 | 类型 | 含义 | 说明 |
| :-- | :-- | :-- | :-- |
| **filePath** | string | 文件存储相对路径 | 与 `POST /api/Upload/UploadFile` 相同口径。图片存 `image/日期/`，PDF 存 `document/日期/` |
| **fileUrl** | string | 文件访问地址 | 同上 |
| **fileName** | string | 原始文件名 | 同上 |
| **attachmentId** | long | 附件Id | 已写入附件表，后续可按附件关联；也可再传给 `ExtractInvoiceAsync` 重新识别 |
| **invoice** | object | 识别出的发票信息 | 见「8.3.1」。**整体识别失败时为 `null`**，此时上面四个附件字段仍然有值 |

### 8.3.1 嵌套对象 `invoice`（`GeminiInvoiceDto`）

字段与 `ExtractInvoiceAsync` 的返回完全一致，识别不到的单个字段为 `null`。

| 字段名 | 类型 | 含义 | 说明 |
| :-- | :-- | :-- | :-- |
| **invoiceNo** | string | 发票号码 | 按发票原文返回，保留字母与数字，不额外加空格或分隔符 |
| **invoiceDate** | DateTime? | 开票日期 | 已统一转成标准日期（JSON 形如 `2026-09-05T00:00:00`） |
| **sellerTaxNo** | string | 销方税号 | 销售方纳税人识别号，只保留字母数字并转大写。分不清销购方归属时为 null |
| **sellerHeader** | string | 销方抬头 | 销售方名称全称，与 `sellerTaxNo` 取自同一栏 |
| **totalAmount** | decimal? | 价税合计 | 含税总额，纯数字（不带货币符号与千分位） |

> **识别失败不报错。** 接口 `success` 仍为 true，只是 `invoice` 为 `null`。前端要单独判断 `invoice` 是否为空，为空时让用户手工填发票信息。
>
> **注意区分两级为空：** `invoice` 为 `null` 表示这次识别整体失败（AI 超时、返回非法 JSON 等）；`invoice` 有值但里面某个字段为 `null`，表示发票上确实找不到该信息（后端要求模型宁可返回 null 也不编造）。

## 8.4 返回示例

识别成功：

```json
{
  "result": {
    "filePath": "document/20260907/6390xxxx.pdf",
    "fileUrl": "/FileServer/.../document/20260907/6390xxxx.pdf",
    "fileName": "增值税专用发票.pdf",
    "attachmentId": 50011,
    "invoice": {
      "invoiceNo": "24327000000012345678",
      "invoiceDate": "2026-09-05T00:00:00",
      "sellerTaxNo": "91310000MA1FL0XXXX",
      "sellerHeader": "某某国际物流有限公司",
      "totalAmount": 1234.56
    }
  },
  "success": true,
  "error": null
}
```

识别失败（附件已保存）：

```json
{
  "result": {
    "filePath": "document/20260907/6390xxxx.pdf",
    "fileUrl": "/FileServer/.../document/20260907/6390xxxx.pdf",
    "fileName": "增值税专用发票.pdf",
    "attachmentId": 50011,
    "invoice": null
  },
  "success": true,
  "error": null
}
```

## 8.5 与 ExtractInvoiceAsync 的区别

两个接口识别能力（提示词、字段、缓存）完全相同，差别只在**是否落库**与**入参形态**，按场景选一个：

| 项目 | `UploadAndExtractInvoiceAsync`（本节） | `ExtractInvoiceAsync` |
| :-- | :-- | :-- |
| 是否落成附件 | **会**，返回 `attachmentId` 等四个字段 | 不会，只返回识别结果 |
| 入参 | 只收文件，**限一个** | 文件（取第一个）**或** `attachmentId` |
| 文件类型 | 只允许 PDF 与图片 | 还允许 txt / xlsx / xls 等 |
| 大小上限 | 图片 5MB、PDF 10MB | 传 `attachmentId` 时 20MB |
| 出参 | 附件字段 + 嵌套 `invoice` | 直接就是发票信息对象（平级五个字段） |
| 识别失败 | **不报错**，`invoice` 为 null | **报错** `AI识别发票结果无法解析` |
| 适用场景 | 用户当场选发票文件，既要存档又要预填 | 附件已存在、只想重新识别；或只识别不留档 |

> **两者共享识别缓存**（按文件内容去重）。同一份发票先用一个接口识别过，另一个接口再识别时直接命中缓存、不再调用 AI，响应会明显变快。

## 8.6 失败文案

| 文案 | 原因 |
| :-- | :-- |
| `请上传发票文件` | 没传文件，或文件是空的（0 字节） |
| `只支持上传一个发票文件` | 一次传了多于 1 个文件 |
| `只支持上传PDF或图片` | 文件不是 PDF 也不是图片 |
| `文件太大，不可超过5M` | 图片超过 5MB |
| `文件太大，不可超过10M` | PDF 超过 10MB |
| `上传失败：…` | 存储或落库环节出错（**注意：AI 识别失败不会走到这里**，只会让 `invoice` 为 null） |

---

# 9. 单证抽取转新建Dto（海运出口 / 海运进口 / 空运出口 / 业务联系单）

上传提单、订舱确认、业务联系单等单证 → AI 按字段清单抽取 → 系统把抽出来的文本按名称匹配成各引用表的 Id → **直接返回对应业务「新建」接口的入参 Dto**，前端拿到就能填表单，用户核对后调原有新建接口保存。**本接口不落库。**

> 这四个接口与 `TextInAdmin` 下同名的四个接口**出参结构一致、入参一致**，差别只在识别引擎，以及**本组接口不返回原文定位信息 `extract`**（返回值就是表单对象本身，不再包一层）。前端可以只换接口地址来对比两家的识别效果。

## 9.1 接口

| 业务 | 地址（`POST`） | 返回 |
| :-- | :-- | :-- |
| 海运出口 | `/api/services/app/GeminiAdmin/ExtractSeaExportToAddDtoAsync` | `SeaExportExtractFormDto`，见「9.4」 |
| 海运进口 | `/api/services/app/GeminiAdmin/ExtractSeaImportToAddDtoAsync` | `SeaImportExtractFormDto`，见「9.5」 |
| 空运出口 | `/api/services/app/GeminiAdmin/ExtractAirExportToAddDtoAsync` | `AirExportAddDto`，见「9.6」 |
| 业务联系单 | `/api/services/app/GeminiAdmin/ExtractPreOrderToAddDtoAsync` | `PreOrderExtractFormDto`，见「9.7」 |

| 项目 | 内容 |
| :-- | :-- |
| 请求体 | `multipart/form-data`，**取第一个文件**（字段名不限）；业务联系单另有 `bizType` |
| 文件类型 | pdf / png / jpg / jpeg / webp / heic / heif / gif / bmp / txt / xlsx / xls（Excel 后端先转 HTML 表格再识别）。**后端只校验大小、不校验扩展名**，传其他格式会在 AI 环节报识别失败，前端自己限制一下选择范围 |
| 大小上限 | **20MB** |
| 权限 | 需登录（类级 `[AbpAuthorize]`，无额外权限点） |
| 返回包装 | ABP 统一包一层 `result` |
| 失败 | 统一抛 `UserFriendlyException`，文案见「9.10」 |
| 耗时 | 通常 10~60 秒，前端务必给 loading 且**不要设过短的超时**（后端超时 180 秒） |
| 缓存 | 同一份文件（按内容 MD5 + 字节数去重）第二次调用直接返回历史识别结果，不再调用 AI；**名称→Id 匹配每次重跑**，基础资料改了立刻生效 |

## 9.2 请求参数

| 字段名 | 类型 | 含义 | 必填 | 说明 |
| :-- | :-- | :-- | :-- | :-- |
| **（文件）** | File | 待识别单证 | **是** | 没传报 `请上传文件`，0 字节报 `上传的文件为空` |
| **bizType** | int | 业务类型 | 否 | **仅业务联系单接口有**。`0`=海运出口 `1`=海运进口 `2`=空运出口，不传默认 0。抽取本身不判断业务类型，该值决定**港口匹配哪张表**（2 匹配空运机场表 `AirPort`，其余匹配海运港口表 `PortCode`），并原样回填到出参 `bizType` |

`bizType` 是简单类型参数，只能用 **form 字段**或 **query** 传，放 JSON body 绑不到值（与报价解析的 `text`、账单识别的 `transportOrderId` 同理）。

```javascript
const formData = new FormData();
formData.append('file', selectedFile);
formData.append('bizType', 0);
const res = await axios.post(
  '/api/services/app/GeminiAdmin/ExtractPreOrderToAddDtoAsync',
  formData,
);
```

## 9.3 出参的公共约定

**出参就是各业务「新建」接口的入参 Dto**，下面各节只列**抽取会回填的字段**；没列到的字段（业务编号、操作人、服务项、费用等）都是默认值或空，由前端按新建页原有逻辑处理。

| 约定 | 说明 |
| :-- | :-- |
| 匹配不到的 Id | 各 `xxxId` 一律为 **null**，由前端标出来让用户补选。**注意与报价解析不同，这里不是 -1** |
| `clientId`（委托单位） | 匹配不到时是 **`00000000-0000-0000-0000-000000000000`**（`Guid.Empty`），不是 null，前端要当成"没匹配上"处理 |
| `ctnCodeId`（箱型） | 逐箱明细里匹配不到时是 **0**，同时 `ctnCodeName` 带回识别到的原文，由前端补选 |
| 名称字段 | `ctnCodeName` / `codePackageName` / `polRemark` 等是**为了让用户核对**而额外返回的，新建接口不需要回传 |
| 文本类字段 | 发货人/收货人/通知人/货物描述/唛头**保留原文换行**（`\n`），前端用 textarea 原样展示，不要把换行压成空格 |
| 日期字段 | ISO 8601 字符串，识别不出为 null |

## 9.4 海运出口出参 `SeaExportExtractFormDto`

### 9.4.1 行级

| 字段名 | 类型 | 含义 | 来源字段 → 匹配表 |
| :-- | :-- | :-- | :-- |
| **vessel** | string | 船名 | 船名 |
| **innerVoyno** | string | 航次 | 航次 |
| **carrierId** | long? | 船公司 | 船公司简称 → `Carrier.CnShortName` |
| **shipAgentId** | Guid? | 船代 | 船代 → `Client.EnName` |
| **codeIssueTypeId** | long? | 签单方式 | 签单方式 → `CodeIssueType.BillType`/`EnName` |
| **signingPortId** | long? | 签单地点 | 签单地点 → `PortCode.PortName` |
| **signingTime** | DateTime? | 签单日期 | 签单日期 |
| **polId** / **polRemark** | long? / string | 起运港 + 港口备注 | 起运港名称 + 起运港代码 → `PortCode`；备注格式 `PortName, CountryEnName` |
| **podId** / **podRemark** | long? / string | 目的港 + 港口备注 | 目的港名称 + 目的港代码 → `PortCode` |
| **deliverPortId** | long? | 交货地 | 交货地名称 + 交货港代码 → `PortCode` |
| **serviceTypes** | array | 服务项 | 恒为**空数组**，不抽取 |
| **transportOrder** | object | 业务信息 | 见「9.4.2」 |

### 9.4.2 嵌套对象 `transportOrder`（`TransportOrderExtractAddDto`）

| 字段名 | 类型 | 含义 | 来源字段 → 匹配表 |
| :-- | :-- | :-- | :-- |
| **bizType** | int | 业务类型 | 固定 `0`（海运出口） |
| **mblNum** | string | 主提单号 | 主提单号 |
| **bookingNum** | string | 订舱编号 | 订舱编号 |
| **marks** | string | 唛头 | 唛头（保留换行） |
| **goodsDes** | string | 货物描述 | 货物描述（保留换行） |
| **shipperContent** / **consigneeContent** / **notifierContent** | string | 发货人 / 收货人 / 通知人 | 同名字段（保留换行，`SH>`/`CN>`/`NP>` 标记已去掉，标记后的内容保留） |
| **pkgs** | int? | 件数 | 件数 |
| **kgs** | decimal? | 毛重 | 毛重kgs |
| **cbm** | decimal? | 体积 | 体积cbm |
| **goodsCompleteTime** | DateTime? | 货好日期 | 货好日期 |
| **etd** | DateTime? | 开船日期 | 开船日期 |
| **tradeTermsType** | int? | 贸易条款 | 贸易条款 → 枚举名匹配 |
| **codeServiceId** | long? | 运输条款 | 运输条款 → `CodeService.EnName` |
| **codePackageId** | long? | 包装 | 包装 → `CodePackage.Name` |
| **clientId** | Guid | 委托单位 | 委托单位 → `Client.EnName`；匹配不到为 `Guid.Empty` |
| **orderCodeGoodss** | array | 品名列表 | 品名按 逗号/顿号/分号/斜杠/换行 拆开后逐个匹配 `CodeGoods.EnName`，**匹配不到的整条丢弃** |
| **orderCtns** | array | 箱型箱量（逐箱） | 见「9.4.3」 |
| **orderUsers** | array | 操作人 | 恒为**空数组**，不抽取 |

### 9.4.3 嵌套数组 `transportOrder.orderCtns[]`（`OrderCtnExtractAddDto`）

集装箱明细**一个箱号一条**，合计行不作为一条记录。箱型带数量（如 `40HQ*2`）时按数量拆成多条，箱号/封号/件数/重量等明细只挂在第一条上。

| 字段名 | 类型 | 含义 | 说明 |
| :-- | :-- | :-- | :-- |
| **ctnCodeId** | long | 箱型 | 匹配 `CtnCode.CtnName`/`EdiCode`，支持 `40'HQ`→`40HQ`、`20DC`→`20GP`、`40HC`→`40HQ` 的归一化；**匹配不到为 0** |
| **ctnCodeName** | string | 箱型名 | 匹配上取库里的名称，没匹配上带回识别原文 |
| **ctnNo** | string | 箱号 |  |
| **sealNo** | string | 封号 |  |
| **pkgs** | int? | 该箱件数 |  |
| **codePackageId** / **codePackageName** | long? / string | 该箱包装 | 包装名**完全相等**才匹配（不做包含匹配），没匹配上 Id 为 null、名称带回原文 |
| **volume** | decimal? | 该箱体积 | 尺码CBM |
| **grossWeight** | decimal? | 该箱毛重 | 重量KGS |
| **tareWeight** | decimal? | 该箱皮重 | 皮重KGS |
| **netWeight** | decimal? | 该箱净重 | 海运出口新建接口不用，抽到了也带回来 |

## 9.5 海运进口出参 `SeaImportExtractFormDto`

与海运出口的差别：**没有**船代、签单方式/地点/日期、货好日期、交货地；**集装箱在最外层 `orderCtns`**（不在 `transportOrder` 里）；单证上的**到港日期**（ETA / ARRIVAL DATE）回填到 `transportOrder.etd`。

### 9.5.1 行级

| 字段名 | 类型 | 含义 | 来源字段 → 匹配表 |
| :-- | :-- | :-- | :-- |
| **vessel** / **innerVoyno** | string | 船名 / 航次 | 同名字段 |
| **carrierId** | long? | 船公司 | 船公司简称 → `Carrier.CnShortName` |
| **polId** / **polRemark** | long? / string | 起运港 + 备注 | 起运港名称 + 起运港代码 → `PortCode` |
| **podId** / **podRemark** | long? / string | 目的港 + 备注 | 目的港名称 + 目的港代码 → `PortCode` |
| **orderCtns** | array | 箱型箱量（逐箱） | 字段与「9.4.3」相同（`SeaImportOrderCtnExtractAddDto`）；进口专属的型号/规格不抽取，为 null |
| **transportOrder** | object | 业务信息 | 字段同「9.4.2」，但 `bizType` 固定 `1`，且**没有** `goodsCompleteTime`、`orderCtns`；`etd` 取的是**到港日期** |

## 9.6 空运出口出参 `AirExportAddDto`

与海运的差别：没有船名/航次/船代/签单相关（改为**航班**）；起运地/中转地/目的地都是**机场**，匹配空运港口表 `AirPort`（三字码 `IataCode` / `EnName` / `CnName` / `City`）；**没有集装箱**，货物明细在最外层 `airExportOrderCtns`。

### 9.6.1 行级

| 字段名 | 类型 | 含义 | 来源字段 → 匹配表 |
| :-- | :-- | :-- | :-- |
| **flightNo** | string | 航班号 | 航班 |
| **polId** / **polRemark** | long? / string | 起运机场 + 备注 | 起运地名称 + 起运地代码 → `AirPort` |
| **potId** / **potRemark** | long? / string | 中转机场 + 备注 | 中转地名称 + 中转地代码 → `AirPort` |
| **podId** / **podRemark** | long? / string | 目的机场 + 备注 | 目的地名称 + 目的地代码 → `AirPort` |
| **bubbleRatio** | decimal? | 泡比 | 毛重 ÷ 体积，保留 6 位小数；缺一侧或体积为 0 时为 null |
| **airExportOrderCtns** | array | 货物明细 | 见「9.6.2」 |
| **transportOrder** | object | 业务信息 | 字段同「9.4.2」，但 `bizType` 固定 `2`，**没有** `tradeTermsType`、`orderCtns`；`etd` 取**起飞日期**，另有 `eta` 取**预抵日期** |

### 9.6.2 嵌套数组 `airExportOrderCtns[]`（`AirExportOrderCtnAddDto`）

一行一条尺寸重量记录，合计行不作为一条。**重量与长宽高都是"单件"口径**，体积重/计费重是整行合计。

| 字段名 | 类型 | 含义 | 说明 |
| :-- | :-- | :-- | :-- |
| **pkgs** | int? | 该行件数 |  |
| **kgs** | decimal? | 单件毛重(KGS) |  |
| **length** / **width** / **height** | decimal? | 单件长 / 宽 / 高(CM) |  |
| **cbm** | decimal? | 单件体积(CBM) | 单据上没给且长宽高齐全时按 `长×宽×高÷1000000` 补算 |
| **volumeWeight** | decimal? | 体积重(KGS) | 单据上没给时按 `单件体积×167×件数` 补算 |
| **chargeWeight** | decimal? | 计费重(KGS) | 单据上没给时取 `max(体积重, 单件重量×件数)` 并按 0.5 千克向上进位 |
| **sortId** | int | 行序号 | 按识别顺序从 0 开始 |

## 9.7 业务联系单出参 `PreOrderExtractFormDto`

没有船代、订舱编号、签单相关、唛头、货物描述（这些字段不抽取）；箱型**按箱型汇总成"箱型 + 箱量"**，不是逐箱明细；比海运出口多一个**付费方式**。

### 9.7.1 行级

| 字段名 | 类型 | 含义 | 来源字段 → 匹配表 |
| :-- | :-- | :-- | :-- |
| **bizType** | int | 业务类型 | 原样回填入参 `bizType` |
| **clientId** | Guid | 委托单位 | 委托单位 → `Client.EnName`；匹配不到为 `Guid.Empty` |
| **mblNum** | string | 主提单号 | 主提单号 |
| **carrierId** | long? | 船公司 | 船公司简称 → `Carrier.CnShortName` |
| **vessel** / **innerVoyno** | string | 船名 / 航次 | 同名字段（仅海运进出口使用，空运出口前端忽略） |
| **goodsCompleteTime** | DateTime? | 货好日期 | 货好日期 |
| **etd** | DateTime? | 开船日期 | 开船日期 |
| **receivePortId** / **receivePortRemark** | long? / string | 收货地 + 备注 | 收货地名称 + 收货地代码 |
| **polId** / **polRemark** | long? / string | 起运港 + 备注 | 起运港名称 + 起运港代码 |
| **podId** / **podRemark** | long? / string | 目的港 + 备注 | 目的港名称 + 目的港代码 |
| **deliverPortId** / **deliverPortRemark** | long? / string | 交货地 + 备注 | 交货地名称 + 交货港代码 |
| **codeFrtId** | long? | 付费方式 | 付费方式 → `CodeFrt.EnName`/`CnName`/`EdiCode` |
| **codeServiceId** | long? | 运输条款 | 运输条款 → `CodeService.EnName` |
| **tradeTermsType** | int? | 贸易条款 | 贸易条款 → 枚举名匹配 |
| **shipperContent** / **consigneeContent** / **notifierContent** | string | 发货人 / 收货人 / 通知人 | 同名字段（保留换行） |
| **pkgs** | int? | 件数 | 件数 |
| **codePackageId** | long? | 包装 | 包装 → `CodePackage.Name` |
| **kgs** / **cbm** | decimal? | 毛重 / 体积 | 毛重kgs / 体积cbm |
| **preOrderCodeGoodss** | array | 品名列表 | 每项只有 `codeGoodsId`；匹配不到的整条丢弃 |
| **preOrderCtns** | array | 箱型 + 箱量 | 见「9.7.2」 |
| **preOrderUsers** | array | 操作人 | 恒为**空数组**，不抽取 |

> 四个港口字段走**同一套**匹配：`bizType=2`（空运出口）匹配机场表 `AirPort`，其余匹配海运港口表 `PortCode`。**`bizType` 传错会把港口 Id 匹配到另一张表上**，前端务必按用户选的业务类型传。

### 9.7.2 嵌套数组 `preOrderCtns[]`（`PreOrderCtnExtractAddDto`）

| 字段名 | 类型 | 含义 | 说明 |
| :-- | :-- | :-- | :-- |
| **ctnCodeId** | long | 箱型 | 匹配不到为 **0** |
| **ctnCodeName** | string | 箱型名 | 没匹配上带回识别原文 |
| **count** | int | 箱量 | 逐箱明细按 `ctnCodeId + ctnCodeName` 分组后的条数 |

## 9.8 与 TextIn 版同名接口的差异

| 项目 | 本组接口（`GeminiAdmin`） | `TextInAdmin` 下的同名接口 |
| :-- | :-- | :-- |
| 出参 | **就是表单对象本身** | 外面包一层，`seaExport`/`seaImport`/`airExport`/`preOrder` + `extract` |
| 原文定位信息 | **不返回**（没有 `extract`，也就没有页码与坐标） | 返回 `extract.citations`，可做原文高亮 |
| 表单字段与匹配规则 | 完全一致（用的是同一批 Dto、同一套匹配口径） | 同 |
| 权限 | **需登录** | 类级 `[AbpAuthorize]` 被注释掉，可匿名 |
| 识别缓存 | 与 TextIn **各存一份**（服务商列不同），同一份文件在两边各算一次调用 | 同 |

## 9.9 前端处理要点

1. **Id 为 null / `Guid.Empty` / `0` 的字段必须标出来让用户补选**，直接提交会产生脏数据。
2. `ctnCodeName`、`codePackageName`、`polRemark` 这类名称字段只用于展示核对，提交新建接口时不必回传。
3. 识别结果只是**预填**，保存走各业务原有的新建接口，本接口不落库、也不校验业务规则（不查重、不校验必填）。
4. 同一份文件反复点识别不会重复计费（命中缓存），但**换了文件就是一次新的调用**。

## 9.10 失败文案

| 文案 | 原因 |
| :-- | :-- |
| `请上传文件` | 没传文件 |
| `上传的文件为空` | 文件 0 字节 |
| `文件大小 xx.xMB，超过 20MB 上限，无法识别` | 超过 20MB |
| `AI识别单证结果无法解析` | 模型连续 3 次返回的都不是能解析的 JSON |
| `AI识别超时：…` / `无法连接AI识别服务：…` / `AI识别服务繁忙，请稍后重试` | 外网服务器链路问题，稍后重试 |
| `海运出口抽取转换异常: …` / `海运进口抽取转换异常: …` / `空运出口抽取转换异常: …` / `业务联系单抽取转换异常: …` | 抽取之后的名称转 Id 环节出错，按提示反馈后端 |

---

# 10. 识别客户开票信息 (ExtractClientInvoiceInfoAsync)

上传客户发来的开票资料（开票信息表、开票资料单、聊天/邮件里的开票信息截图、营业执照）**或直接粘贴开票资料文字** → AI 识别开票信息主体与**开票银行列表** → 返回的字段名与客户开票信息表完全一致，前端拿到就能填回「客户 - 开票信息」的新增/编辑表单，用户核对后调 `ClientInvoiceInfoAdmin` 原有接口保存。**本接口不落库。**

## 10.1 接口

| 项目 | 内容 |
| :-- | :-- |
| 方法 | `POST` |
| 地址 | `/api/services/app/GeminiAdmin/ExtractClientInvoiceInfoAsync` |
| 请求体 | `multipart/form-data`，**单个文件** 或 **文字字段 `text`**（二选一，见「10.2」） |
| 文件类型 | pdf / png / jpg / jpeg / webp / heic / heif / gif / bmp / txt / xlsx / xls（Excel 后端先转 HTML 表格再识别）。**后端只校验大小、不校验扩展名** |
| 大小上限 | **20MB** |
| 权限 | 需登录（类级 `[AbpAuthorize]`，无额外权限点） |
| 返回 | `GeminiClientInvoiceInfoDto`，见「10.3」 |
| 失败 | 统一抛 `UserFriendlyException`，文案见「10.6」 |
| 耗时 | 通常 5~30 秒，前端务必给 loading 且**不要设过短的超时**（后端超时 180 秒） |
| 缓存 | 同一份文件 / 同一段文字（按内容 MD5 + 字节数去重）第二次调用直接返回历史识别结果，不再调用 AI；**币别 code → 币别Id 的匹配每次重跑**，基础资料改了立刻生效 |

## 10.2 请求参数

**文件与文字二选一，传了文字就用文字识别、不再读文件；两者都不传报「请上传开票资料文件或输入需要识别的文字」。**

| 字段名 | 类型 | 含义 | 必填 | 说明 |
| :-- | :-- | :-- | :-- | :-- |
| **text** | string | 待识别的开票资料**文字内容** | 否 | 直接粘贴的开票信息文本。**非空白时优先使用，此时上传的文件被忽略**；只传空格/换行等空白等同于没传 |
| **（文件）** | File | 待识别的开票资料**文件** | 否 | 未传 `text` 时必传。取第一个文件，字段名不限 |

`text` 是简单类型参数，只能用 **form 字段**或 **query** 传，放 JSON body 绑不到值（与报价解析的 `text` 同理，见卡点 7）。

**只传文字的最小示例：**

```javascript
const formData = new FormData();
formData.append('text', pastedText);
const res = await axios.post(
  '/api/services/app/GeminiAdmin/ExtractClientInvoiceInfoAsync',
  formData,
);
```

## 10.3 返回结构 (`GeminiClientInvoiceInfoDto`)

### 10.3.1 行级

字段名与 `ClientInvoiceInfoAddDto` / `ClientInvoiceInfoEditDto` 同名，可直接赋值回表单。

| 字段名 | 类型 | 含义 | 说明 |
| :-- | :-- | :-- | :-- |
| **header** | string | 发票抬头（公司全称） | 识别不到为 null。取全称，不取简称。资料里中英文各给一份时取中文那份 |
| **taxNum** | string | 纳税人识别号 | 识别不到为 null。**只保留字母数字并转大写**（去掉空格与横杠），最长 128。「税务识别号」「税务登记证号」「社会统一信用代码」等叫法都认；「营业执照注册号」不会被当成税号 |
| **address** | string | 开票地址（公司地址） | 识别不到为 null，最长 256。原文「地址及电话」写在一起时会拆开，电话进 `tel`。**「开户行地址」「邮寄地址」不会进这里** |
| **tel** | string | 开票电话（联系电话） | 识别不到为 null，最长 128。**只放固话**（带区号或 7-8 位） |
| **mobile** | string | 手机 | 识别不到为 null，最长 64。**只放 11 位手机号** |
| **require** | string | 开票要求 | 识别不到为 null。**识别到多条要求时按原文顺序用中文分号（；）拼成一段字符串**，不是数组；最长 2048，超出部分后端直接截断（开票信息表该列就是 2048，`2026-09-15 由 128 放宽`） |
| **clientInvoiceBanks** | object[] | 开票银行列表 | 见「10.3.2」。识别不到银行时为**空数组**，不是 null |

> 出参**不含** `clientId`，客户是前端当前所在的客户，由前端自己填。也不含开票信息主体的 `isDefault` / `sortId`，按新增页原有逻辑处理。
>
> **`tel` 与 `mobile` 按号码形态分流、不按标签分流：** 资料里标签写「电话号码」但值是 11 位手机号时，值进 `mobile`、`tel` 为 **null**。客户只给了一个手机号的资料很常见，此时开票电话就是空的，**不是漏识别**。

### 10.3.2 嵌套数组 `clientInvoiceBanks[]`（`GeminiClientInvoiceBankDto`）

字段名与 `ClientInvoiceBankAddDto` 同名。**一份资料里有几个银行账户就返回几条**，不会合并、不会只返回第一条。

已按真实开票资料的三种常见写法做了拆分（提示词层面）：

| 资料写法 | 识别结果 |
| :-- | :-- |
| 开户银行只写一次，下面按币别列多个账号（`银行账户：兴业银行义乌分行营业部` + `RMB：3560101…` + `USD：3560114…`） | 拆成 **2 条**，两条的 `bankName` 都是那个开户银行 |
| 币别写在标签括号里（`开户银行（人民币）名称` / `开户银行（美元）账号`） | 括号里的币别就是该条的 `currencyCode`，名称与账号按币别配成同一条 |
| 同时出现多方账号（另有标注`销方账号`/`收款方账号`的） | **只取归属于 `header` 这家公司的账户**，判断不出归属的不返回 |

| 字段名 | 类型 | 含义 | 说明 |
| :-- | :-- | :-- | :-- |
| **bankName** | string | 开户银行 | 识别不到为 null，最长 128 |
| **bankAccount** | string | 银行账号 | 识别不到为 null。**只保留字母数字并转大写**（去掉空格与横杠），最长 128 |
| **accountName** | string | 账户名称 | 资料里没单独给户名时**自动取 `header`（发票抬头）**，最长 128 |
| **currencyCode** | string | 币别 code（识别原文） | 国际标准三位码（`CNY`/`USD`/`EUR`…）。资料未标注币别时为 null |
| **currencyId** | long | 币别Id | 由 `currencyCode` 多字段模糊匹配得出，**匹配不到为 -1**（含 `currencyCode` 为 null 的情况），前端需标红让用户手工选 |
| **swiftCode** | string | SwiftCode | 识别不到为 null，最长 128 |
| **isDefault** | bool | 是否默认 | **每个币别的第一条为 `true`**，同币别后面的账户为 `false`。开票信息新增/编辑接口要求每个币别有且仅有一个默认账户，按此值直接提交即可通过校验 |
| **sortId** | int | 排序id | 按识别顺序**倒序**赋值（第一条最大）。列表接口按 `sortId` 倒序展示，照此提交可让展示顺序与资料原文顺序一致 |
| **currency** | object | 币别对象 | `CurrencySimpleDto`，见「10.3.3」。恒有值（`currencyId` 为 -1 时里面装的是识别原文） |

### 10.3.3 嵌套对象 `clientInvoiceBanks[].currency`（`CurrencySimpleDto`）

| 字段名 | 类型 | 含义 | 说明 |
| :-- | :-- | :-- | :-- |
| **code** | string | 币别代码 | `currencyId` 匹配上时取币别表的 `Code`；匹配不到时填识别原文 |
| **cnName** | string | 中文名称 | 匹配上时取币别表的 `CnName`；匹配不到时填识别原文 |
| **enName** | string | 英文名称 | 匹配上时取币别表的 `EnName`；匹配不到时填识别原文 |

> 该对象**只用于展示**，提交开票信息接口时以 `currencyId` 为准。`currencyCode` 为 null 时整个 `currency` 也为 null。

## 10.4 返回示例

```json
{
  "result": {
    "header": "上海某某国际物流有限公司",
    "taxNum": "91310000MA1FL1XY2B",
    "address": "上海市虹口区东大名路1111号11楼A座",
    "tel": "021-61234567",
    "mobile": "13812345678",
    "require": "只开增值税专用发票；备注栏需写提单号；开票后需邮寄纸质发票",
    "clientInvoiceBanks": [
      {
        "bankName": "中国银行上海市分行营业部",
        "bankAccount": "454059218888",
        "accountName": "上海某某国际物流有限公司",
        "currencyCode": "CNY",
        "currencyId": 1,
        "swiftCode": "BKCHCNBJ300",
        "isDefault": true,
        "sortId": 2,
        "currency": { "code": "CNY", "cnName": "人民币", "enName": "RMB" }
      },
      {
        "bankName": "BANK OF CHINA SHANGHAI BRANCH",
        "bankAccount": "454059217777",
        "accountName": "上海某某国际物流有限公司",
        "currencyCode": "USD",
        "currencyId": 2,
        "swiftCode": "BKCHCNBJ300",
        "isDefault": true,
        "sortId": 1,
        "currency": { "code": "USD", "cnName": "美元", "enName": "US DOLLAR" }
      }
    ]
  },
  "success": true,
  "error": null
}
```

> 上例两条银行**都是 `isDefault: true`**，因为它们分属人民币与美元两个币别，各自是该币别的第一条。同币别有两个账户时只有第一条为 `true`。

## 10.5 前端处理要点

1. **`currencyId` 为 -1 的银行行必须标红让用户手工选币别**，直接提交会产生脏数据；此时可以把 `currency.code` 当成识别原文展示给用户参考。
2. **`clientInvoiceBanks` 是数组，不要只取第一条**。资料里常见「人民币一个账户 + 美元一个账户」，两条都要落进表单。
3. `require` 是**一段拼好的字符串**（多条用中文分号分隔），不是数组；上限 2048，正常开票要求装得下，表单控件用 textarea 别用单行 input。
4. `accountName` 为空时后端已自动填 `header`，前端不必再兜一层。
5. 识别结果只是**预填**，保存走 `ClientInvoiceInfoAdmin` 原有的 `AddAsync` / `EditAsync` / `BatchEditAsync`，本接口不落库、也不做抬头税号查重。
6. 同一份文件 / 同一段文字反复点识别不会重复计费（命中缓存），但**换了文件或改了文字就是一次新的调用**。
7. 文字与文件**同时传时以文字为准、文件被静默忽略**，测试「换了文件结果没变」时先确认文字框是否还有残留内容。
8. 客户只给了手机号时 `tel` 为 null（见「10.3.1」下的说明），表单上不要按"必填没识别到"报错。

## 10.6 失败文案

| 文案 | 原因 |
| :-- | :-- |
| `请上传开票资料文件或输入需要识别的文字` | 文件与 `text` 都没传，或文件 0 字节 |
| `文件大小 xx.xMB，超过 20MB 上限，无法识别` | 超过 20MB |
| `AI识别开票信息结果无法解析` | 模型连续 3 次返回的都不是能解析的 JSON |
| `Excel 文件无法读取，请确认文件为有效的 xlsx 格式：…` | 传了损坏的 Excel |
| `AI识别失败：…` / `AI识别超时：…` / `无法连接AI识别服务：…` / `AI识别服务繁忙，请稍后重试` | 外网服务器链路问题，稍后重试 |
