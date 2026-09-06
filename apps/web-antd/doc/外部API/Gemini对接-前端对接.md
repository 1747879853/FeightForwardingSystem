---
title: Gemini 对接 - 前端对接
module: 外部Api对接 / Gemini
author: 系统
last_updated: 2026-09-06
---

# 1. 说明

本文档面向前端，汇总 Gemini 智能解析相关**前端需对接的接口**（均在 `GeminiAdminAppService` 中）。

> **重要：本次后端把"访问 Gemini"的出站请求拆到了独立的外网服务器(`Freight.GlobalServer`)，但接口地址、入参、出参对前端完全没有变化，前端无需做任何改动。** 密钥保管、境外网络、转发、超时等全部由后端处理。
>
> 后端架构说明见：`Gemini对接-外网服务器拆分-2026-07-25.md`、`Gemini模块总逻辑文档.md`
>
> **2026-08-13 更新：** 海运报价解析新增可选文字入参 `text`，前端可让用户"上传文件"或"直接粘贴文字"二选一，原有文件上传调用**不受影响、无需改动**。详见「3.2」与 `Gemini对接-报价解析支持文字输入-2026-08-13.md`。
>
> **2026-09-06 更新：**
>
> 1. 新增 `ExtractBillFeesAsync`：上传单票账单，识别提单号与费用并匹配业务，返回费用添加 DTO 列表（不落库）。详见「7」与 `Gemini对接-账单识别费用-2026-09-06.md`。
> 2. `ExtractInvoiceAsync` 出参新增 `sellerTaxNo`（销方税号）、`totalAmount`（价税合计）。付费申请把 `totalAmount` 回填到发票行 `amount`，把识别结果的 `sellerHeader` 回填到销售方抬头。详见 `Gemini对接-发票识别-前端对接文档-2026-08-17.md`。
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
| `ExtractInvoiceAsync` | 上传发票文件**或传已上传附件的 attachmentId**，识别发票号、开票日期、销方税号、价税合计 | 见 `Gemini对接-发票识别-前端对接文档-2026-08-17.md` |
| `UploadAndExtractCtnNoAsync` | 上传**一张**图片，落成附件并识别箱号 | 见「6」 |
| `ExtractBillFeesAsync` | 上传**单票账单**，识别提单号与费用并匹配业务，返回费用添加 DTO 列表（不落库） | 见「7」 |
| `ExtractBillDataAsync` | 上传提单PDF，提取提单字段（gemini-3.5-flash） | 见「4」 |
| `ExtractBillDataBy31FlashLiteAsync` | 上传提单PDF，提取提单字段（gemini-3.1-flash-lite，效果对比用） | 见「5」 |

**这些接口的公共约定：**

| 项目 | 内容 |
| :-- | :-- |
| 方法 | `POST` |
| 请求格式 | `multipart/form-data`，**取第一个文件**（文件字段名不限）；`ExtractSeFreiPriceByPromptAsync` 另支持只传文字（见「3.2」），`ExtractInvoiceAsync` 另支持只传 `attachmentId`；`UploadAndExtractCtnNoAsync` **只允许一张图片**；`ExtractBillFeesAsync` 只收文件、上限 20MB，可选 `transportOrderId` |
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

上传船公司/订舱代理的**单票账单**（Invoice / Debit Note），识别提单号和费用行。提单号能匹配到系统业务时，返回费用添加 DTO 列表，**由用户决定是否添加**。本接口**不写费用**。

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
| **transportOrderId** | Guid | 当前业务id | 否 | 费用页已打开某一票时传入。**有值时必须与账单主提单号为同一票**，对不上报 `账单提单号与当前业务主提单号不一致`。不传则按识别出的提单号去匹配业务 |
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

识别结果按「提单号 → 匹配到的业务 → 费用列表」嵌套，不要把业务字段和费用字段拍平。

### 7.3.1 行级 `GeminiBillFeeExtractDto`

| 字段名 | 类型 | 含义 | 说明 |
| :-- | :-- | :-- | :-- |
| **mblNum** | string | 识别出的提单号 | 已去掉空格/横杠并转大写。能走到成功返回时恒有值 |
| **transportOrder** | object | 提单号匹配到的业务 | 见「7.3.2」，恒有值 |
| **orderFees** | object[] | 费用添加列表 | 见「7.3.3」。可能为空数组（认到提单号但对不出费用行） |

### 7.3.2 嵌套对象 `transportOrder`（`GeminiBillFeeTransportOrderDto`）

恒有值（对不上业务时接口会报错，不会返回）。

| 字段名 | 类型 | 含义 | 说明 |
| :-- | :-- | :-- | :-- |
| **id** | Guid | 业务id | 即 `TransportOrder.Id`，也是下面每条费用的 `transportOrderId` |
| **bizType** | enum | 业务类型 | 海运出口/海运进口/空运出口等 |
| **commissionNum** | string | 委托编号 |  |
| **mblNum** | string | 主提单号 | 库里原值，可能与外层识别值大小写/空格不同 |

### 7.3.3 嵌套数组 `orderFees[]`（`OrderFeeEditDto`）

每条就是费用批量编辑的新增项，`id` 恒为 `null`。`feeCode` / `currency` 是展示用嵌套对象，提交时以后端认的 `feeCodeId` / `currencyId` 为准。

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
| **settlement** | object | 结算对象（展示） | 本接口不回填，为 null；提交只用 `settlementId` |
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
        "industryCategory": 1,
        "settlementId": null,
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
        "settlement": null,
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

## 7.5 前端处理要点

1. 先展示 `transportOrder.commissionNum` / `mblNum`，确认对上了哪票业务。
2. 用表格展示 `orderFees`，让用户勾选要添加的行。
3. `feeCodeId` 或 `currencyId` 为 **-1** 的行标红，下拉改成系统费用代码/币别后再允许勾选提交。
4. `settlementId` 为空不拦录入保存；提交审核时现有费用接口仍会要求结算对象。
5. **不要把本接口成功当成费用已保存。**

## 7.6 失败文案

| 文案 | 原因 |
| :-- | :-- |
| `请上传账单文件` | 没传文件或文件是空的 |
| `账单文件大小 xMB，超过 20MB 上限，无法识别` | 文件过大 |
| `未能识别到提单号` | 账单上找不到提单号（发票号不会被当成提单号） |
| `业务不存在` | 传了 `transportOrderId` 但该业务不存在或已删除 |
| `账单提单号与当前业务主提单号不一致` | 传了 `transportOrderId`，但账单上的提单号对不上该票的主提单号 |
| `未找到提单号对应的业务` | 未传业务id，认到了提单号，但当前租户没有主提单号相同的业务 |
| `提单号对应多条业务，请人工核对` | 同一个主提单号命中多票 |
| `AI识别账单结果无法解析` | 模型返回不是合法 JSON，已重试仍失败 |
| `AI识别失败：…` | 外网服务器/模型调用失败（文案已中性化，不含供应商名） |
