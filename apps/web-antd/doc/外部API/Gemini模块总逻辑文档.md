---
title: Gemini 智能解析模块总逻辑文档
module: 外部Api对接 / Gemini
author: AI
last_updated: 2026-09-15
---

# 1. 业务背景说明 (Background)

**白话解释：** 货代日常要处理大量单证（提单、海运报价表、装箱单），人工录入慢且容易错。本模块把用户上传的 PDF/图片交给 Google Gemini 大模型识别，直接产出结构化数据，再由系统自动匹配成港口Id、币别Id、箱型Id，用户核对后即可落库。

Gemini 是**境外接口**，业务服务器不一定能直连，密钥也不适合散落在每台业务服务器上。因此从 2026-07-25 起，**"访问 Gemini"这一步被拆到独立的外网服务器 `Freight.GlobalServer`**：

- **业务服务器（本项目）**：接收上传文件、组装提示词、发起调用、**解析返回结果、做基础资料匹配**。
- **外网服务器（`Freight.GlobalServer`）**：只负责**把请求发出去、把响应原文取回来**，保管 Gemini 密钥，不理解任何业务语义。

> 与中转站 `Freight.Relay` 的区别：中转站解决的是"云当/飞驼等平台的 token 统一下发与推送统一接收"；外网服务器解决的是"境外接口的出站访问"。**两个项目职责不同，不要互相塞代码。**

# 2. 功能与操作说明 (Features & Operations)

- **海运报价解析（主力功能）：** 报价管理页上传船公司发来的报价文件（PDF/截图/Excel）**或直接粘贴报价文字**→ 系统解析出多行"目的港 + 箱型价格 + 有效期"→ 自动回填港口/币别/箱型Id → 用户核对未匹配项（Id 为 -1）后保存。接口：`ExtractSeFreiPriceByPromptAsync(string text = null)`。**传了 `text` 就按文字解析、不再读上传文件；没传 `text` 才读文件**；两者都没有报「请上传文件或输入需要解析的文字」。
- **提单数据提取：** 上传提单 PDF → 返回提单各字段的 JSON，供录入页预填。接口：`ExtractBillDataAsync`（模型 `gemini-3.5-flash`，思考等级 low）。
- **提单数据提取（轻量模型对比）：** 同上，但使用 `gemini-3.1-flash-lite`、思考等级 medium，当前提示词只取"发货人/收货人/通知人"，**用于效果与速度对比，不用于生产页面**。接口：`ExtractBillDataBy31FlashLiteAsync`。
- **发票识别：** 上传发票文件或传已有 `attachmentId` → 识别发票号与开票日期。接口：`ExtractInvoiceAsync`。
- **上传图片识别箱号：** 上传**一张**箱号照片 → 按 `UploadFile` 口径落成附件，同时识别箱号。识别失败或图里没有箱号时 **`ctnNo` 为 null，附件信息照常返回**。接口：`UploadAndExtractCtnNoAsync`。
- **单票账单识别费用：** 上传船公司/代理的单票账单（Invoice / Debit Note）→ 识别提单号与费用行（费用代码、币别、Unit=箱型名、Quantity=该箱型箱量、单价、金额）→ 返回 `OrderFeeEditDto` 列表，由用户决定是否添加。**本接口不写费用。** 未传 `transportOrderId`：必须识别到提单号并唯一匹配业务，否则报错。传了 `transportOrderId`：业务必须存在；认不出提单号、或识别提单号与该票对不上，都不报错，费用挂到该业务上，前端用返回的 `mblNum` 自己判断是否对得上。接口：`ExtractBillFeesAsync(Guid? transportOrderId = null)`。
- **识别客户开票信息：** 客户页开票信息页签上传客户发来的开票资料（开票信息表、聊天/邮件截图、营业执照）**或直接粘贴开票资料文字** → 识别抬头、纳税人识别号、开票地址、开票电话、手机、开票要求，以及**开票银行列表**（币别、开户银行、银行账号、账户名称、SwiftCode）→ 出参字段名与开票信息表一致，前端直接填回新增/编辑表单。**本接口不落库。** 银行有几条就返回几条；**每个币别的第一条置为默认**（开票信息新增/编辑接口要求每个币别有且仅有一个默认账户，按返回值直接提交即可过校验）；币别Id 匹配不到为 -1。接口：`ExtractClientInvoiceInfoAsync(string text = null)`。**传了 `text` 就按文字识别、不再读上传文件**；两者都没有报「请上传开票资料文件或输入需要识别的文字」。
- **单证抽取转新建Dto（海运出口 / 海运进口 / 空运出口 / 业务联系单）：** 上传提单、订舱确认、业务联系单 → 按字段清单抽取 → 抽出来的文本按名称匹配成各引用表的 Id → **直接返回对应业务「新建」接口的入参 Dto**，前端拿到就能填表单。**本组接口不落库。** 与 `TextInAdmin` 下同名的四个接口**入参与表单字段完全一致**（用的是同一批 Dto、同一套匹配口径），差别只有识别引擎，以及**不返回原文定位信息 `extract`**——返回值就是表单对象本身，没有外层包装，因此也没有页码与坐标、做不了原文高亮。接口：`ExtractSeaExportToAddDtoAsync` / `ExtractSeaImportToAddDtoAsync` / `ExtractAirExportToAddDtoAsync` / `ExtractPreOrderToAddDtoAsync(int bizType = 0)`，模型 `gemini-3.1-flash-lite`，文件上限 20MB。
- **外网服务器健康检查：** 浏览器访问 `http://<外网服务器地址>/` 显示"服务已正常启动并可访问"（与中转站一致）；`GET /health` 返回 `{"status":"ok","time":...}`。
- **外网服务器调用留痕：** 每个 Gemini 接口各自写入 `Logs/Gemini/{接口名}/{接口名}-yyyyMMdd.log`（如 generate → `Logs/Gemini/generate/`），含来源IP、请求时间、**当日第N次**(该接口独立内存计数)、模型、字节数、耗时、状态码；成功/失败均可附 Gemini 完整报文（`LogSuccessBody`/`LogFailureBody`，默认均开启）。不同接口文件夹与次数互不共享。

# 3. 状态流转说明 (Status Transitions)

本模块无业务单据状态，此处描述**一次解析调用的处理链路**（便于测试定位问题出在哪一段）。

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| 前端提交请求 | 报价接口、开票信息识别接口判断 `text` 是否为空白 | 已确定数据来源 | **`text` 非空白 → 文字分支**（提示词 + 文字，完全不读表单）；否则 → 文件分支。其余接口无此分流，仍只走文件 |
| 用户上传文件 | 前端提交 `multipart/form-data` | 业务端已收文件 | 文件分支先判 `Request.HasFormContentType` 再取 `Request.Form.Files` 第一个文件；无文件抛「请上传文件或输入需要解析的文字」（开票信息识别为「请上传开票资料文件或输入需要识别的文字」，提单接口为「请上传文件」） |
| 业务端已收文件 | `GetMimeType` + 转 Base64（Excel 走 `ExcelToHtmlTableHelper` 转 HTML 文本） | 请求体已组装 | 优先用浏览器上传的 `ContentType`，为空或 `application/octet-stream` 时按扩展名兜底 |
| 请求体已组装 | `GeminiGlobalServerClient` 序列化 + GZip | 已发往外网服务器 | `POST /global/gemini/generate?model=xxx`，头带 `X-Global-Token` 与 `Content-Encoding: gzip` |
| 已发往外网服务器 | 取当日序号 + 校验密钥 | 已转发 Gemini | 入口即按接口名内存自增「当日第N次」(跨日归 1，重启归 1)；密钥不符 401；缺 `model` 或空体 400；模型不做限制 |
| 已转发 Gemini | 拼接 `key` 后 POST；**仅 503** 按 `RetryCount` 重试；用尽后按 `FallbackModels` 链切换：3.5-flash → 3.1-flash-lite → 3-flash | 已取得响应 | 超时 504、网络异常 502；最终状态码汉化为 `message`（503 →「AI识别服务繁忙，请稍后重试」） |
| 已取得响应 | 业务端取 `candidates[0].content.parts[0].text` | 已拿到模型正文 | 非 2xx 抛「Gemini 请求失败(HTTP xxx)」；正文为空时报价接口返回空数组 |
| 已拿到模型正文 | 反序列化为 DTO | 已结构化 | 报价接口反序列化为 `List<GeminiSeFreiPriceDto>` |
| 已结构化 | `FillMatchedIdsAsync` 模糊匹配 | 返回前端 | 查全量港口/币别/箱型，回填Id，匹配不到置 -1，**原始名称字段保留** |

# 4. 核心字段说明 (Field Definitions)

## 4.1 业务端配置 (`CsprojBuilder.Web.Host/appsettings.json` → `GlobalServer` 节点)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 | 🔗 联动规则 | 🛡️ 校验限制 |
| :-- | :-- | :-- | :-- | :-- |
| **BaseUrl** | 外网服务器地址 | 运维配置 | 客户端拼接为 `{BaseUrl}/global/gemini/generate` | **必填**，为空时调用直接抛「未配置外网服务器地址(GlobalServer:BaseUrl)」 |
| **Token** | 访问外网服务器的全局通用密钥 | 运维配置 | **必须**与外网服务器 `GlobalServer:AccessToken` 完全一致 | 不一致返回 401「无效的 X-Global-Token」 |

> 具名 HttpClient `GlobalServer` 在 `Startup.cs` 注册，超时 **180 秒**（须大于外网服务器的 `Gemini:TimeoutSeconds`）。

## 4.2 外网服务器配置 (`Freight.GlobalServer/appsettings.json` → `GlobalServer` 节点)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 | 🔗 联动规则 | 🛡️ 校验限制 |
| :-- | :-- | :-- | :-- | :-- |
| **AccessToken** | 业务服务器访问本服务的全局通用密钥，所有业务服务器共用 | 运维自定义强随机串 | 与各业务端 `GlobalServer:Token` 一致；**与中转站 `Relay:AccessToken` 相互独立，刻意不共用** | **必填**，为空时**所有请求一律 401**（防止漏配导致裸奔） |
| **Gemini.ApiKey** | Gemini 接口密钥（机密） | Google AI Studio | 只在拼接 URL 时使用 | **必填**，为空抛「未配置 Gemini 密钥」；**任何日志都不记录** |
| **Gemini.BaseUrl** | Gemini 接口基地址 | 固定 | 拼接 `{BaseUrl}/{ApiVersion}/models/{model}:generateContent` | 默认 `https://generativelanguage.googleapis.com` |
| **Gemini.ApiVersion** | 接口版本段 | 固定 | 同上 | 默认 `v1beta` |
| **Gemini.TimeoutSeconds** | 调用 Gemini 的超时时间（秒） | 运维配置 | 应小于业务端 HttpClient 的 180 秒 | 默认 120；≤0 时按 120 处理 |
| **Gemini.RetryCount** | 遇官方 **503** 时的额外重试次数（不含首次） | 运维配置 | 仅 503 重试；其它状态码不重试 | 默认 `2`；`0` 表示不重试；配在 `appsettings.json` |
| **Gemini.RetryDelayMilliseconds** | 503 两次尝试之间的等待毫秒数 | 运维配置 | 与 `RetryCount` 配合 | 默认 `1000` |
| **Gemini.FallbackModels** | 原模型 503 重试用尽后按序切换的兜底模型列表 | 运维配置 | 每个模型各自走 `RetryCount`；仍 503 则下一个；不跳过与原模型同名项 | 默认 `gemini-3.5-flash` → `gemini-3.1-flash-lite` → `gemini-3-flash`；空列表不切换 |
| **Gemini.LogFolder** | Gemini 日志根文件夹名 | 运维配置 | 实际路径为 `Logs/{LogFolder}/{接口名}/{接口名}-yyyyMMdd.log` | 默认 `Gemini`；为空回退到 `Gemini` |
| **Gemini.LogSuccessBody** | 成功时是否记录 Gemini 完整报文 | 运维配置 | `[转发完成]` 末尾 `报文=` | 默认 `true` |
| **Gemini.LogFailureBody** | 失败时是否记录 Gemini 完整报文 | 运维配置 | 便于排查提示词/配额问题 | 默认 `true` |

## 4.3 外网服务器对外接口 `POST /global/gemini/generate`

| 字段名 | 📖 字段含义说明 | 🔌 位置 | 🛡️ 校验限制 |
| :-- | :-- | :-- | :-- |
| **model** | 模型名，如 `gemini-3.5-flash` | Query | **必填**，缺失返回 400；**取值不做限制**，由业务端决定 |
| **X-Global-Token** | 全局通用密钥 | Header | **必填**，不匹配返回 401（同时记系统日志与来源IP） |
| **Content-Type** | 固定 `application/json` | Header | 转发时原样使用 |
| **Content-Encoding** | 压缩方式，业务端固定用 `gzip` | Header | 可选；**本服务不解压**，原样带给 Gemini |
| **（请求体）** | 业务端组装好的 Gemini 请求体 | Body | **必填**，为空返回 400；已放开大小限制（IIS 另需配 `maxAllowedContentLength`） |

**返回：** Gemini 的状态码与报文**原样透传**；本服务自身的失败用 401/400/502(调用异常)/504(超时)，报文为 `{"message":"..."}`。

## 4.4 业务端调用客户端 `GeminiGlobalServerClient`

| 成员 | 📖 说明 | 🔗 联动规则 |
| :-- | :-- | :-- |
| **ModelFlash35** | 常量 `gemini-3.5-flash` | 换模型只改这里，外网服务器无需同步 |
| **ModelFlash31Lite** | 常量 `gemini-3.1-flash-lite` | 换模型只改这里，外网服务器无需同步 |
| **HttpClientName** | 常量 `GlobalServer` | 与 `Startup.cs` 注册的具名 HttpClient 一致 |
| **GenerateContentAsync** | 发请求、取回 **Gemini 响应原文** | 非 2xx 抛 `UserFriendlyException`，消息含 HTTP 状态码与原始报文 |
| **GenerateTextAsync** | 在上者基础上取 `candidates[0].content.parts[0].text` | 取不到返回 null，由调用方决定如何兜底 |

> 解析结果 DTO 字段（`GeminiSeFreiPriceDto` / `SeFreiPriceCtnDto`）见 `Gemini对接-前端对接.md` 第 3 章，此处不重复。

## 4.5 上传识别箱号出参 `GeminiCtnNoUploadDto`

继承通用上传 `UploadFileDto`，多一个箱号字段。完整字段表见 `Gemini对接-前端对接.md` 第 6 节。

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 | 🔗 联动规则 | 🛡️ 校验限制 |
| :-- | :-- | :-- | :-- | :-- |
| **filePath** / **fileUrl** / **fileName** / **attachmentId** | 附件落库结果 | 与 `UploadController.UploadFile` 相同口径；媒体类型为图片，路径 `image/yyyyMMdd/...` | 识别失败这四个字段仍有值 | 必须恰好一张图；png/jpg/jpeg/webp/heic/heif/gif/bmp 或 `image/*`；上限 **5MB** |
| **ctnNo** | 识别出的箱号 | AI 返回 JSON 的 `CtnNo`，去空格横杠后转大写 | 超时、解析失败、图里没有箱号均为 **null**，接口不抛错 | 可空；前端必须单独判断，不能把 `success=true` 当成一定识别到了 |

## 4.6 单票账单识别费用出参 `GeminiBillFeeExtractDto`

完整字段表见 `Gemini对接-前端对接.md` 第 7 节。这里只记匹配规则。

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 | 🔗 联动规则 | 🛡️ 校验限制 |
| :-- | :-- | :-- | :-- | :-- |
| **mblNum** | 识别出的提单号 | 模型 JSON 的 `MblNum`，去空格横杠后转大写 | 未传业务id时为空则报「未能识别到提单号」；传了业务id时认不出为 null，不报错 | 不能把发票号当成提单号 |
| **transportOrder** | 用于组装费用的业务简要 | 未传 id：按 `MblNum` 精确匹配。传了 id：按该票取，**不核对比单号** | 未传 id 时 0 条/多于 1 条报错；传了 id 但业务不存在报「业务不存在」 | 只匹配主提单号，不匹配订舱号、分提单号 |
| **orderFees** | 费用添加 DTO 列表 | 模型 `Fees` + 费用代码/币别/箱型匹配 + 业务会计期间汇率 | `paySide` 固定应付；`id` 恒为空；匹配不到的 Id 为 **-1** | 不落库；`FeeCodeId=-1` 不能直接提交 `BatchEditAsync` |
| **orderFees[].settlement** | 结算对象（完整客户对象） | `ResolveSettlementByIndustryCategory` 得到 `settlementId` 后按客户表回填 | 与 `settlementId` 成对；带不到时两者都为 null | 提交仍以 `settlementId` 为准，本对象只给展示 |
| **orderFees[].unit** | 单位 | 优先系统箱型名（40HC 可匹配 40HQ），否则账单箱型原文 | 对应费用 Unit | 最长 16 字符 |
| **orderFees[].quantity** | 数量 | 该箱型的箱量，不是 UNI/FIX | 金额 = 单价 × 数量 |  |

## 4.7 单证抽取出参（四个新建表单 Dto）

出参就是各业务「新建」接口的入参 Dto，完整字段表见 `Gemini对接-前端对接.md` 第 9 节。这里只记**名称→id 的匹配来源**与几个容易踩的口径。

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 | 🔗 联动规则 | 🛡️ 校验限制 |
| :-- | :-- | :-- | :-- | :-- |
| **carrierId** | 船公司 | 抽取"船公司简称" → `Carrier.CnShortName` 先精确再包含 | 匹配不到为 null | 不按全称匹配 |
| **polId / podId / deliverPortId / receivePortId** | 海运港口 | 港口名称 → `PortCode.PortName`；唯一命中即用，多条再按 `Country.CountryEnName`(去空格) 消歧；再按 `EdiCode`；最后 `PortName` 包含 | 同时回填 `xxxRemark` = `PortName, CountryEnName` | 名称形如 `QINGDAO, CHINA` 时按**最后一个逗号**拆港口/国家 |
| **polId / potId / podId**（空运） | 机场 | 三字码 → `AirPort.IataCode`；再按 `EnName`/`CnName`/`City` 精确；最后 `EnName`/`City` 包含 | 业务联系单按入参 `bizType` 选表：`2` 走 `AirPort`，其余走 `PortCode` | **空运绝不能查海运港口表**，会匹配到另一张表的 id |
| **clientId** | 委托单位 | 委托单位 → `Client.EnName` 先精确再包含 | 匹配不到为 **`Guid.Empty`**（不是 null） | 前端要把 `Guid.Empty` 当成"没匹配上" |
| **codeIssueTypeId / codePackageId / codeServiceId / codeFrtId / codeGoodsId** | 签单方式 / 包装 / 运输条款 / 付费方式 / 品名 | 分别匹配 `CodeIssueType.BillType`+`EnName`、`CodePackage.Name`、`CodeService.EnName`、`CodeFrt.EnName`+`CnName`+`EdiCode`、`CodeGoods.EnName` | 品名按 逗号/顿号/分号/斜杠/换行 拆开逐个匹配，**匹配不到的整条丢弃** | 逐箱明细里的包装只认**完全相等**，不做包含匹配 |
| **ctnCodeId / ctnCodeName** | 箱型 | `CtnCode.CtnName`/`EdiCode`，归一化后比对（去引号空格、`DC`=`GP`、`HC`=`HQ`） | 匹配不到 id 为 **0**，`ctnCodeName` 带回识别原文 | 箱型带数量(`40HQ*2`)时拆成多条，明细只挂第一条 |
| **tradeTermsType** | 贸易条款 | 按枚举名忽略大小写精确匹配，再做包含匹配 | 匹配不到为 null |  |
| **etd** | 开船/到港/起飞日期 | 海运出口取"开船日期"、海运进口取"到港日期"、空运出口取"起飞日期" | 空运另有 `eta` 取"预抵日期" | 三种业务共用同一列，不要按字面理解 |
| **bubbleRatio** | 泡比（空运） | 毛重 ÷ 体积，6 位小数 | 缺一侧或体积为 0 时为 null |  |
| **airExportOrderCtns[].volumeWeight / chargeWeight** | 体积重 / 计费重 | 单据上给了以单据为准；没给才算：体积重 = 单件体积×167×件数，计费重 = max(体积重, 单件重量×件数) 按 0.5kg 向上进位 | `cbm` 没给且长宽高齐全时按 长×宽×高÷1000000 补算 | 重量与长宽高都是**单件**口径，体积重/计费重是整行合计 |

## 4.8 客户开票信息识别出参 `GeminiClientInvoiceInfoDto`

完整字段表见 `Gemini对接-前端对接.md` 第 10 节。这里只记清洗与默认值口径。

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 | 🔗 联动规则 | 🛡️ 校验限制 |
| :-- | :-- | :-- | :-- | :-- |
| **header** | 发票抬头（公司全称） | 模型 `Header`，去首尾空白 | 银行 `accountName` 缺失时取它兜底 | 取全称不取简称；`ClientInvoiceInfo.Header` 是 `nvarchar(max)`，**不截断** |
| **taxNum** | 纳税人识别号 | 模型 `TaxNum`，只保留字母数字后转大写 |  | 截断到 **128**（同列长） |
| **address** / **tel** / **mobile** | 开票地址 / 开票电话 / 手机 | 模型同名字段，去首尾空白 | 提示词要求「地址及电话」写在一起时拆成两个字段；**按号码形态而非标签分流**——11位纯数字进 `mobile`，带区号/7-8位进 `tel`，标签写「电话号码」但值是手机号时 `tel` 为 null；「开户行地址」「邮寄地址」被明确排除在 `address` 之外 | 分别截断到 **256 / 128 / 64** |
| **require** | 开票要求 | 模型 `Require` | **多条要求由模型按原文顺序用中文分号拼成一段**，出参是字符串不是数组 | 截断到 **2048**（同列长，2026-09-15 由 128 放宽正是因为拼接后常超） |
| **clientInvoiceBanks** | 开票银行列表 | 模型 `ClientInvoiceBanks` | 识别不到为**空数组**；`bankName`/`bankAccount`/`swiftCode` 全为 null 的行被丢弃 | 有几条返回几条，不合并；三种真实写法（开户行只写一次+多币别账号、币别写在标签括号里、同时列了多方账号）的拆分规则写在提示词里，见卡点 16 |
| **clientInvoiceBanks[].bankAccount** | 银行账号 | 模型 `BankAccount`，只保留字母数字后转大写 |  | 截断到 128 |
| **clientInvoiceBanks[].accountName** | 账户名称 | 模型 `AccountName`，为空时**取 `header`** |  | 截断到 128 |
| **clientInvoiceBanks[].currencyId** | 币别Id | `CurrencyCode` 过 `TransportOrderMatchHelper.MatchCurrencyId`（符号→code→中英文名→别称备注→模糊） | 与 `currency` 展示对象成对；`currencyCode` 为 null 时必然 -1 | 匹配不到为 **-1** |
| **clientInvoiceBanks[].isDefault** | 是否默认 | 按 `currencyId` 分组，**每组第一条为 true** | 与开票信息 `AddAsync`/`EditAsync` 的「每个币别有且仅有一个默认账户」校验对齐 | 未匹配上的银行全归到 `-1` 这一组，也只有第一条为 true |
| **clientInvoiceBanks[].sortId** | 排序id | 按识别顺序**倒序**赋值（第一条最大） | 列表接口按 `IsDefault` 降序再 `SortId` 降序排，照此提交展示顺序与原文一致 |  |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：外网服务器不可用，所有解析功能全部不可用]** 本项目已**不再保留直连 Gemini 的兜底路径**（密钥已从业务代码移除）。外网服务器宕机/地址配错 → 前端三个解析接口全部报错。排查顺序：`GET /health` → 业务端 `GlobalServer:BaseUrl` → 外网服务器 `Logs/global-yyyyMMdd.log`。

> [!IMPORTANT] **[卡点 2：两端密钥不一致 → 401]** 业务端 `GlobalServer:Token` 与外网服务器 `GlobalServer:AccessToken` 任一改动而另一端没跟着改 → 前端报「Gemini 请求失败(HTTP 401)」。外网服务器 `AccessToken` 配成空串时**所有请求一律 401**，属于有意为之的防漏配设计。

> [!IMPORTANT] **[卡点 3：外网服务器不限制模型，密钥是唯一防线]** 传什么 `model` 就转发什么，换模型只改业务端常量、无需动外网服务器。代价是密钥泄露后对方可借道调用任意模型消耗配额，异常时查对应接口目录（如 `Logs/Gemini/generate/`）里的模型名与「当日第N次」。

> [!IMPORTANT] **[卡点 4：IIS 请求体大小限制拦大文件]** 代码已放开 Kestrel/ANCM 限制并给接口打了 `[DisableRequestSizeLimit]`，但 IIS 请求筛选默认约 30MB 会先拦截，表现为上传大 PDF 报 404.13。需在外网服务器站点 `web.config` 配 `requestLimits maxAllowedContentLength`。

> [!IMPORTANT] **[卡点 5：匹配不到的Id是 -1，不是 null，前端必须处理]** `podId`/`currencyId`/`ctnCodeId` 匹配不到时为 **-1**（`pot1Id`/`pot2Id` 在名称为空时才是 null）。直接把 -1 存库会产生脏数据，录入页必须标红要求人工选择。

> [!IMPORTANT] **[卡点 6：解析耗时长，前端超时别设太短]** 单证解析通常 10~60 秒（日志实测简单请求约 5 秒，整份 PDF 更久）。链路超时为：前端 > 业务端 180 秒 > 外网服务器 120 秒。前端设 30 秒会出现"页面报超时但后端其实成功了"。

> [!IMPORTANT] **[卡点 7：报价解析的 `text` 不能放 JSON body，且文字优先于文件]** `text` 是简单类型参数，ABP 动态 WebApi 不会给它加 `[FromBody]`，只能从 **form 字段**或 **query 参数**绑定；发 `{"text":"..."}` 的 JSON body 会绑不到值，被当成没传文字转而去找文件，报「请上传文件或输入需要解析的文字」。另外**文字与文件同时传时以文字为准、文件被静默忽略**，测试"换了文件结果没变"时先确认文字框是否还有残留内容。

> [!IMPORTANT] **[卡点 8：箱号识别失败不抛错，前端必须处理 `ctnNo` 为 null]** `UploadAndExtractCtnNoAsync` 先落附件再识别。AI 超时、解析失败、图里没有箱号时接口仍成功，只是 `ctnNo` 为 `null`。前端不能把 `success=true` 当成一定识别到了箱号。

> [!IMPORTANT] **[卡点 9：账单识别不落库，提单号对不上就报错，费用代码 -1 不能直接提交]** `ExtractBillFeesAsync` 只返回 `OrderFeeEditDto` 列表。未传 `transportOrderId` 时：认不出提单号、或主提单号匹配 0 条/多条业务，接口失败。传了 `transportOrderId` 时：业务不存在才报错；认不出提单号、或识别提单号与该票对不上，都不报错，费用挂到该业务上，前端用 `mblNum` 自己判断。`feeCodeId`/`currencyId` 为 -1 时必须让用户改完再调 `BatchEditAsync`。

> [!IMPORTANT] **[卡点 10：账单识别报错时缓存不落库，这是有意为之，不要当成缓存没写]** 缓存行挂在当前工作单元上、靠 AppService 结束时自动 `SaveChanges` 落库，而 AppService 默认开事务。 `ExtractBillFeesAsync` 是**先写缓存、后做提单号匹配**，所以卡点 9 那四种报错会把刚写的缓存行一起回滚，表里查不到这份文件的 md5，重传时会重新识别。
>
> **这是期望行为**：走到这几种报错基本就是传错了文件、或这份账单本身没有费用，这种结果不值得记住。排查时别误判成「缓存代码漏了」——去 `App_AiExtractRecords` 查不到记录，先看那次调用是不是报错结束的。代价是同一份文件在报错后反复上传会各花一次 AI 调用，按现有口径接受。

> [!IMPORTANT] **[卡点 11：单证抽取"匹配不到"的表示方式有三种，不是统一的 null]** 报价解析里匹配不到是 **-1**；单证抽取这四个接口里，普通 `xxxId` 是 **null**、委托单位 `clientId` 是 **`Guid.Empty`**、逐箱明细的 `ctnCodeId` 是 **0**。三种都必须由前端标出来让用户补选，**直接提交新建接口会产生脏数据**（`Guid.Empty` 与 `0` 都能通过非空校验，尤其容易漏）。

> [!IMPORTANT] **[卡点 12：业务联系单的 `bizType` 决定港口查哪张表，传错会静默匹配到另一张表]** `ExtractPreOrderToAddDtoAsync` 的四个港口字段（收货地/起运港/目的港/交货地）走同一套匹配：`bizType=2`（空运出口）查机场表 `AirPort`，其余查海运港口表 `PortCode`。抽取本身不判断业务类型，`bizType` 完全由前端传。传错**不报错**，只是回填的 id 属于另一张表，表单上看着有值、保存后指向的却是错的港口。另外 `bizType` 是简单类型参数，只能走 form 字段或 query，放 JSON body 绑不到值（同卡点 7）。

> [!IMPORTANT] **[卡点 13：Gemini 与 TextIn 的识别缓存各存一份，同一份文件两边各花一次钱]** 缓存行按「服务商 + 场景 + 模型 + 提示词版本 + 内容MD5 + 字节数」去重，Gemini 侧写的是 `ProviderGemini`，所以在 TextIn 识别过的文件换到 Gemini 接口**不会命中**，反之亦然。对比两家识别效果时这是期望行为；但不要据此以为"缓存没生效"。同一个接口重复传同一份文件才会命中。

> [!IMPORTANT] **[卡点 14：识别结果超长按列长静默截断，不报错也不提示]** `ExtractClientInvoiceInfoAsync` 出参的每个字段都按 `ClientInvoiceInfo` / `ClientInvoiceBank` 的列长截断： `require` 2048、`address` 256、`taxNum`/`tel` 与银行各字段 128、`mobile` 64；只有 `header` 因为列是 `nvarchar(max)` 不截。
>
> 这样做是为了让识别结果能**直接提交**给 `AddAsync`/`EditAsync`——那两个接口对这些字段都有长度校验，不截断的话用户点了识别、填完表单，保存时才被拦住，更难解释。
>
> 最容易撞上限的是 `require`（多条要求拼成一段），所以 **2026-09-15 把该列由 128 放宽到 2048**，正常开票要求已经装得下。剩下几个字段的上限本身就宽于真实数据，截断只会在模型把整段话塞错字段时发生——出现截断先怀疑是不是填错字段了，而不是上限太小。

> [!IMPORTANT] **[卡点 15：开票银行的默认标记是「每个币别一条」，不是「整份资料只有一条」]** 需求口径是"第一个银行设为默认"，但开票信息 `AddAsync`/`EditAsync` 校验的是**每个币别有且仅有一个默认账户**，只给第一条置默认时，一份「人民币 + 美元」的资料提交后会报「币别USD未设置默认银行账户」。所以实现上是**按 `currencyId` 分组、每组第一条置 `isDefault=true`**：单币别时等价于"第一条默认"，多币别时才会出现多个 true。前端看到两条都是 `true` 不是 bug，先看它们的 `currencyId` 是否不同。另外币别没匹配上的银行 `currencyId` 全是 -1、会被归成同一组，用户改完币别后**默认标记要由前端按新币别重算**，否则可能出现同币别两个默认。

> [!IMPORTANT] **[卡点 16：开票资料里"一个开户行 + 多个币别账号"最容易被识别成一条，提示词专门写了拆分规则]** 真实开票资料的银行段有三种写法会让模型少返回或错配，提示词里逐条写死了，改提示词时**不要把这三条删掉**：
>
> 1. **开户银行只写一次，下面按币别列账号**（`银行账户：兴业银行义乌分行营业部` 后跟 `RMB：3560101…` `USD：3560114…`）→ 必须按账号拆成多条，每条都把那个开户银行名**下发**进 `BankName`。不写这条规则时模型往往只返回一条，或把两个账号拼成一串。
> 2. **币别写在标签的括号里**（`开户银行（人民币）名称` / `开户银行（美元）账号`）→ 括号里的币别就是该条的币别，名称与账号要按币别配对，否则会出现"人民币的开户行 + 美元的账号"这种错配，界面上完全看不出来。
> 3. **同时列了多方账号**（资料里除客户自己的账号外，还标了 `销方账号` / `收款方账号`）→ 只取归属于 `Header` 这家公司的账户。取错会把我方或第三方的收款账号存成客户的开票银行。
>
> 同源的还有两条排除规则：`开户行地址` / `邮寄地址` 不能进 `Address`，`营业执照注册号` 不能进 `TaxNum`——这几个标签在"客户信息采集表"这类模板里和正主挨着放，不排除就会串。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 | 🤖 代码解析与架构洞察 |
| :-- | :-- | :-- | :-- |
| 2026-09-15 | `Breaking` | 开票要求 `require` 的长度上限 **128 → 2048**（`ClientInvoiceInfo.Require` 列一起放宽），出参截断口径随之改到 2048 | 多条开票要求拼成一段后 128 根本不够，原先会静默丢尾部内容。改动只有三处：实体注解 `[StringLength]`、`ClientInvoiceInfoAdminAppService` 的 Add/Edit 两处入参校验与文案、本服务 `DeserializeClientInvoiceInfo` 里的截断长度。列变长是兼容改动，已存值不受影响；卡点 14 已按新上限重写 |
| 2026-09-15 | `Feature` | 新增 `ExtractClientInvoiceInfoAsync(string text = null)`：上传开票资料文件**或直接传文字**，识别客户开票信息（抬头/纳税人识别号/开票地址/开票电话/手机/开票要求）与**开票银行列表**（币别/开户银行/银行账号/账户名称/SwiftCode），不落库。银行有几条返回几条；开票要求多条时用中文分号拼成一段；**每个币别的第一条置 `isDefault`**；币别Id 匹配不到为 -1 | 出参 `GeminiClientInvoiceInfoDto` / `GeminiClientInvoiceBankDto` 的字段名**逐个对齐 `ClientInvoiceInfo` / `ClientInvoiceBank` 的列名**，前端可直接填回 `ClientInvoiceInfoAddDto`，不需要映射层。"文字优先于文件"的分流与缓存键计算照抄 `ExtractSeFreiPriceByPromptAsync`（两者是仓库里唯一两个支持文字入参的识别接口）；文件读取另写 `ReadUploadedClientInvoiceInfoFileAsync` 以便复用 `DocFileMaxBytes` 的 20MB 上限并给出"文件或文字"的报错文案。反序列化阶段顺手做字段清洗：`taxNum`/`bankAccount` 走 `NormalizeAiAlphaNum` 只留字母数字转大写，其余走 `NormalizeAiText` 去空白并把字面 `null` 归一为 null，再**按实体列长截断**（见卡点 14），使结果可直接提交给新增接口。币别匹配复用 `TransportOrderMatchHelper.MatchCurrencyId`、展示对象复用 `OrderFeeSimpleDtoMapper.ToCurrency`（匹配不到时三个名字都填识别原文，与账单识别同口径）。默认标记没按需求字面的"第一条默认"实现，而是**按币别分组取每组第一条**，否则多币别资料提交时会被开票信息接口的"每个币别有且仅有一个默认账户"校验拦住（见卡点 15）。缓存场景 `ClientInvoiceInfo` + 版本 `1`，模型 `gemini-3.1-flash-lite`，解析失败重试 3 次；按数据访问规范把**币别回填放在写缓存之前**，避免回填环节抛错把已花钱的识别结果一起回滚。提示词不是凭想象写的：拿 `文档/外部Api对接/Gemini/客户开票信息ai识别文件/` 下三份真实资料（一份 txt、两份客户信息采集表 xls）逐字段核了一遍，据此补出标签变体（税务识别号/税务登记证号/社会统一信用代码、企业名称、营业地址）、排除项（开户行地址、邮寄地址、营业执照注册号）、中英文双份取中文、`RMB`→`CNY`，以及银行段的三条拆分规则（见卡点 16）——这三条都是真实资料里存在、而模型默认会做错的写法 |
| 2026-09-14 | `Feature` | 新增单证抽取四个接口 `ExtractSeaExportToAddDtoAsync` / `ExtractSeaImportToAddDtoAsync` / `ExtractAirExportToAddDtoAsync` / `ExtractPreOrderToAddDtoAsync(int bizType = 0)`：上传单证 → AI 抽取 → 名称转 id → 返回对应业务「新建」接口的入参 Dto（不落库）。与 `TextInAdmin` 下同名接口出入参一致，但**不返回 `extract`**，返回值就是表单对象本身 | 对标 `TextInAdminAppService` 的同名接口，**按"各自留一份"的方式实现，不抽公共类、不改 TextIn 侧任何代码**（两家的字段清单与提示词会各自独立演进，共用一份反而会互相牵制）。字段清单、四个 `Build*FormAsync`、`Resolve*` 名称转 id、箱型/货物明细解析全部落在 `GeminiAdminAppService` 内，表单 Dto 直接复用 `TextIn/Dto` 下那四个（前端换识别服务商不用改解析）。TextIn 是 schema 驱动、Gemini 没有 schema 概念，所以字段清单改为**拼进提示词**并要求模型按**中文字段名原样**返回扁平 JSON，这样出参结构与 TextIn 的 `extracted_schema` 对齐、后续解析逻辑可原样照搬。模型 `gemini-3.1-flash-lite`（`response_mime_type=application/json`），解析失败重试 3 次；四个场景各自的 `SceneCode` + `SchemaVersion` 走内容缓存，**名称转 id 每次重跑**。按数据访问规范把写缓存放在组装表单**之后**，避免组装环节抛错把已花钱的识别结果一起回滚（与 `ExtractBillFeesAsync` 的旧顺序相反，见卡点 10） |
| 2026-09-07 | `Enhancement` | `ExtractBillFeesAsync` 传了 `transportOrderId` 时不再核对比单号：业务存在即返回该票与识别出的 `mblNum`（认不出为 null）；识别提单号与该票对不上也不报错，费用挂到传入的业务上。未传业务id 仍必须识别到提单号并唯一匹配业务 | 去掉「账单提单号与当前业务主提单号不一致」。前端用返回的 `mblNum` 与当前业务比对 |
| 2026-09-06 | `Enhancement` | `ExtractInvoiceAsync` 出参新增 `sellerTaxNo`（销售方纳税人识别号）与 `totalAmount`（价税合计），原有 `invoiceNo`/`invoiceDate` 与接口地址、入参均不变；四个字段都可能为 null | 字段名沿用进项发票 `InputInvoice` 的列名（`SellerTaxNo`/`TotalAmount`），前端可直接填回表单不用映射。提示词补两条消歧规则：税号必须取销售方栏、只有一个税号且归属不明时返回 null；价税合计只返回纯数字（禁货币符号与千分位），不取不含税金额/税额/明细行，大写金额栏只用于核对。**`InvoiceSchemaVersion` 由 1 提到 2**，否则老文件会一直命中只有两个字段的旧缓存。`TotalAmount` 声明为 `decimal?`，模型若返回带逗号或货币符号的字符串会反序列化失败并触发 3 次重试后报错，故提示词对格式写得很死 |
| 2026-09-06 | `Refactor` | 无。四个识别场景的去重口径、接口出入参全部不变 | 删除共用服务 `AiExtractCacheManager`，Gemini 与 TextIn 各自注入 `IRepository<AiExtractRecord, long>` 直接查 `App_AiExtractRecords`；`ProviderGemini` 常量与 `BuildSourceKey`（字节/文字两个重载）下沉为类内私有成员，读走 `AsNoTracking`，写沿用「同键只改 `SourceSize`+`ResultJson`、无则插入」。落库口径澄清：只判断模型输出能否反序列化，不判断认得对不对，所以 `Fees` 空数组、发票两字段全 null、报价空列表都会落库；只有箱号做了内容判断（`ctnNo` 为 null 不写）。报错结束的调用整个事务回滚、不留记录，属期望行为（见卡点 10） |
| 2026-09-06 | `Feature` | 新增 `ExtractBillFeesAsync`：上传单票账单识别提单号与费用，匹配到业务后返回费用添加 DTO 列表（不落库）。可传 `transportOrderId`，与账单主提单号不一致时报错。认不出提单号或对不上业务报错。费用行回填完整 `settlement` 客户对象，不只是 id | 提示词按船公司 Invoice 抽 MblNum + Fees（FeeName/CurrencyCode/CtnName/箱量/单价/金额）。业务按 `TransportOrder.MblNum` 去空格忽略大小写精确匹配。费用代码/币别/箱型匹配在 `TransportOrderMatchHelper`（费用代码含括号内缩写及备注别名；币别含别称与备注；箱型 40HC↔40HQ）。应付、汇率、税率按现有费用规则回填；结算对象 id 由 `ResolveSettlementByIndustryCategory` 解析后再批量查客户填 `settlement`。模型原始 JSON 走内容缓存，Id 匹配每次重跑。详见 `Gemini对接-账单识别费用-2026-09-06.md` |
| 2026-09-04 | `Feature` | 新增 `UploadAndExtractCtnNoAsync`：上传一张图片并识别箱号。出参在 `UploadFileDto` 上增加 `ctnNo`；识别失败 `ctnNo` 为 null，附件仍返回 | 落库照抄 `UploadController.UploadFile`（`IStoreProvider` + `CreateOrUpdateAttachmentAsync`），媒体类型用图片、上限 5MB、只允许一张。识别走外网服务器 `gemini-3.1-flash-lite`，失败吞掉异常只记日志；命中内容缓存则跳过 AI。箱号去空格横杠后转大写 |
| 2026-08-13 | `Enhancement` | 海运报价解析支持**直接粘贴文字**：新增可选入参 `text`，传文字用文字、不传文字用上传文件；两者都没有时文案改为「请上传文件或输入需要解析的文字」；前端原有文件上传调用不受影响 | 文件组装逻辑抽为私有方法 `BuildPartsFromUploadedFileAsync(prompt)`，主方法只保留"文字/文件"分流，Excel 转 HTML 与 base64 内联两条老路径原样保留；文字分支不触碰 `Request.Form`，文件分支补 `HasFormContentType` 判断，接口在非 multipart 请求下也不会抛框架异常；提示词、模型、10 次重解析、`FillMatchedIdsAsync` 回填与出参结构均未变 |
| 2026-07-27 | `Enhancement` | 海运报价解析支持上传 **Excel**；后端 EPPlus 转 HTML 表格(保留合并单元格)后以文本发给 Gemini | 新增 `ExcelToHtmlTableHelper`；`ExtractSeFreiPriceByPromptAsync` 对 xlsx/xls 走文本分支，PDF/图片仍走 `inline_data` |
| 2026-07-27 | `Enhancement` | 外网服务器遇 Gemini **503** 自动重试；用尽后按链切换 3.5-flash → 3.1-flash-lite → 3-flash；失败文案汉化为「AI识别…」 | `RetryCount`/`RetryDelayMilliseconds`/`FallbackModels`；`GeminiForwarder` 按模型链依次重试并累计 `AttemptCount`；日志记请求模型/实际模型/是否兜底 |
| 2026-07-25 | `Feature` | 前端三个解析接口地址/入参/出参**均不变**；后端出站链路由"业务服务器直连 Gemini"改为"经外网服务器 `Freight.GlobalServer` 转发" | 新增 `src/Freight.GlobalServer`（.NET 8，独立发布，IIS 进程内托管）承担境外出站；密钥从 `GeminiAdminAppService` 硬编码字段迁至外网服务器配置；业务端新增 `GeminiGlobalServerClient` 收口"请求发出/响应取回"，三处重复的 GZip+HTTP+JObject 代码收敛为一行调用；`Startup` 具名 HttpClient `Gemini`(120s) → `GlobalServer`(180s)。**拆分边界：提示词组装与返回后的反序列化、基础资料模糊匹配全部留在业务项目**，外网服务器不感知业务语义，改提示词/改DTO无需重新发布外网服务器 |

# 7. 代码位置与受影响文件

## 7.1 本次客户开票信息识别（2026-09-15）

| 文件 | 改动 |
| :-- | :-- |
| `src/CsprojBuilder.Application/App/AI/IGeminiAdminAppService.cs` | 新增 `ExtractClientInvoiceInfoAsync(string text = null)` 声明 |
| `src/CsprojBuilder.Application/App/AI/GeminiAdminAppService.cs` | 新增 `#region 识别客户开票信息`（提示词 `ClientInvoiceInfoExtractPrompt` + public 方法）；新增常量 `SceneClientInvoiceInfo` / `ClientInvoiceInfoSchemaVersion`；私有区新增 `ReadUploadedClientInvoiceInfoFileAsync`、`DeserializeClientInvoiceInfo`、`FillClientInvoiceBankMatchAsync`、`NormalizeAiText`、`NormalizeAiAlphaNum`、`Truncate`。**构造函数未动**（币别仓储 `_currencyRepository` 早已注入） |
| `src/CsprojBuilder.Application/App/AI/Dto/GeminiDto.cs` | 新增 `GeminiClientInvoiceInfoDto` / `GeminiClientInvoiceBankDto`；补 `using CsprojBuilder.App.Currency.Dto;`（银行的 `Currency` 展示对象用 `CurrencySimpleDto`） |
| `src/CsprojBuilder.Application/App/AI/TransportOrderMatchHelper.cs` | **未改**，币别匹配直接复用 `MatchCurrencyId` |
| `src/CsprojBuilder.Core/Entites/ClientInvoiceInfo.cs` | `Require` 的 `[StringLength]` 由 128 改为 **2048** |
| `src/CsprojBuilder.Application/App/ClientInvoiceInfo/ClientInvoiceInfoAdminAppService.cs` | `AddAsync` / `EditAsync` 两处开票要求长度校验与报错文案由 128 改为 **2048**；其余逻辑未动，识别结果仍由前端填回表单后走原有 `AddAsync` / `EditAsync` / `BatchEditAsync` |
| `文档/外部Api对接/Gemini/Gemini对接-前端对接.md` | 第 10 节（含接口清单与公共约定两处补充） |
| `文档/客户/客户开票信息总逻辑.md` | 功能说明加 AI 识别预填一条；`require` 字段限制改 2048；变更日志两行 |

**接口文件 ↔ 文档映射：** `IGeminiAdminAppService.cs` ↔ `文档/外部Api对接/Gemini/Gemini对接-前端对接.md`

**数据库变更：** `App_ClientInvoiceInfos.Require` 由 `nvarchar(128)` 改为 `nvarchar(2048)`（列变长，兼容改动，已存值不受影响）。缓存沿用 `App_AiExtractRecords`，只新增 `SceneCode = ClientInvoiceInfo`，表结构与索引未动

## 7.2 单证抽取转新建Dto（2026-09-14）

| 文件 | 改动 |
| :-- | :-- |
| `src/CsprojBuilder.Application/App/AI/IGeminiAdminAppService.cs` | 新增四个抽取接口声明 |
| `src/CsprojBuilder.Application/App/AI/GeminiAdminAppService.cs` | 新增四个 public 接口 + `#region 单证抽取字段定义`（四套字段清单、集装箱/货物明细子字段、`DocExtractModel`）+ 私有实现（`ExtractDocSchemaAsync`、`BuildDocExtractPrompt`、`ParseDocSchema`、四个 `Build*FormAsync`、`Resolve*` 名称转 id、箱型与空运明细解析）；构造函数新增注入 `CodeIssueType`/`CodePackage`/`CodeService`/`CodeGoods`/`CodeFrt`/`AirPort` 六个仓储 |
| `src/CsprojBuilder.Application/App/ExternalApi/TextIn/Dto/*.cs` | **未改**，四个表单 Dto 直接复用 |
| `src/CsprojBuilder.Application/App/ExternalApi/TextIn/TextInAdminAppService.cs` | **未改**，两边各留一份实现 |
| `文档/外部Api对接/Gemini/Gemini对接-前端对接.md` | 第 9 节 |

**接口文件 ↔ 文档映射：** `IGeminiAdminAppService.cs` ↔ `文档/外部Api对接/Gemini/Gemini对接-前端对接.md`

**数据库变更：** 无。缓存沿用 `App_AiExtractRecords`，四个新场景只是新增 `SceneCode`（`SeaExport` / `SeaImport` / `AirExport` / `PreOrder`），表结构与索引未动

## 7.3 账单识别费用（2026-09-06）

| 文件 | 改动 |
| :-- | :-- |
| `src/CsprojBuilder.Application/App/AI/IGeminiAdminAppService.cs` | 新增 `ExtractBillFeesAsync` |
| `src/CsprojBuilder.Application/App/AI/GeminiAdminAppService.cs` | 实现识别、提单号匹配、组装费用添加 DTO；费用行按结算对象id回填 `settlement` |
| `src/CsprojBuilder.Application/App/AI/Dto/GeminiDto.cs` | `GeminiBillFeeExtractDto` 及模型原始输出 DTO |
| `src/CsprojBuilder.Application/App/AI/TransportOrderMatchHelper.cs` | 业务字段匹配：费用代码（含备注别名）/币别（含别称、备注）/箱型 |
| `文档/外部Api对接/Gemini/Gemini对接-前端对接.md` | 第 7 节 |
| `文档/外部Api对接/Gemini/Gemini对接-账单识别费用-2026-09-06.md` | 变更记录 |

**接口文件 ↔ 文档映射：** `IGeminiAdminAppService.cs` ↔ `文档/外部Api对接/Gemini/Gemini对接-前端对接.md`

**数据库变更：** 无

## 7.4 取消缓存管理器（2026-09-06）

| 文件 | 改动 |
| :-- | :-- |
| `src/CsprojBuilder.Application/App/AI/AiExtractCacheManager.cs` | **删除** |
| `src/CsprojBuilder.Application/App/AI/GeminiAdminAppService.cs` | 改注入 `IRepository<Entites.AiExtractRecord, long>`；新增私有 `TryGetCacheResultJsonAsync` / `SaveCacheResultJsonAsync` / `BuildSourceKey` 两个重载；新增常量 `ProviderGemini` |
| `src/CsprojBuilder.Application/App/ExternalApi/TextIn/TextInAdminAppService.cs` | 同上改注入仓储；`TryGetCachedResultAsync` / `SaveExtractCacheAsync` 改为直接查表；新增常量 `ProviderTextIn` / `ModelTextInV3` |

**数据库变更：** 无。表 `App_AiExtractRecords` 结构、唯一索引、各场景 `SceneCode` / `SchemaVersion` 全部未动
