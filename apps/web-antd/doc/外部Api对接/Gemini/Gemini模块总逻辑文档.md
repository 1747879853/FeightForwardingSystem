---
title: Gemini 智能解析模块总逻辑文档
module: 外部Api对接 / Gemini
author: AI
last_updated: 2026-09-29
---

# 1. 业务背景说明 (Background)

**白话解释：** 货代日常要处理大量单证（提单、海运报价表、装箱单），人工录入慢且容易错。本模块把用户上传的 PDF/图片交给 Google Gemini 大模型识别，直接产出结构化数据，再由系统自动匹配成港口Id、币别Id、箱型Id，用户核对后即可落库。

Gemini 是**境外接口**，业务服务器不一定能直连，密钥也不适合散落在每台业务服务器上。因此从 2026-07-25 起，**"访问 Gemini"这一步被拆到独立的外网服务器 `Freight.GlobalServer`**：

- **业务服务器（本项目）**：接收上传文件、组装提示词、发起调用、**解析返回结果、做基础资料匹配**。
- **外网服务器（`Freight.GlobalServer`）**：只负责**把请求发出去、把响应原文取回来**，保管 Gemini 密钥，不理解任何业务语义。

> 与中转站 `Freight.Relay` 的区别：中转站解决的是"云当/飞驼等平台的 token 统一下发与推送统一接收"；外网服务器解决的是"境外接口的出站访问"。**两个项目职责不同，不要互相塞代码。**

# 2. 功能与操作说明 (Features & Operations)

- **海运报价解析（主力功能）：** 报价管理页上传船公司发来的报价文件（PDF/截图/Excel）**或直接粘贴报价文字**→ 系统解析出多行"目的港 + 箱型价格 + 有效期"→ 自动回填船公司/港口/币别/箱型Id → 用户核对未匹配项（Id 为 -1）后保存。**每行只有一个目的港**：同一个单元格里写了多个目的港（中英文逗号、顿号或换行隔开）时拆成多行，该行的箱型价格与其余字段每行照抄（见卡点 17）。接口：`ExtractSeFreiPriceByPromptAsync(string text = null)`。**传了 `text` 就按文字解析、不再读上传文件；没传 `text` 才读文件**；两者都没有报「请上传文件或输入需要解析的文字」。 **按个人设置反填默认值：** 当前登录人在个人设置里存过 `DefaultFreightRate`（运价默认值）时，识别结果会按它再加工一遍——设置里的**默认航线**下的港口优先匹配（先在这些航线里匹配完，包含命中也压过其他航线的精确命中）；船公司、起运港、币别**匹配不到**时填默认值；是否直达、备注**没识别出来**时填默认值；是否推荐、订舱代理、起运港/目的港免用箱天数、目的港免堆期/免箱期、航程、约号这几项 AI 本来就不识别，直接取默认值。**没有这条个人设置就完全不做默认值处理**，结果与改动前一致。字段对应关系见 4.9。
- **提单数据提取：** 上传提单 PDF → 返回提单各字段的 JSON，供录入页预填。接口：`ExtractBillDataAsync`（模型 `gemini-3.5-flash`，思考等级 low）。
- **提单数据提取（轻量模型对比）：** 同上，但使用 `gemini-3.1-flash-lite`、思考等级 medium，当前提示词只取"发货人/收货人/通知人"，**用于效果与速度对比，不用于生产页面**。接口：`ExtractBillDataBy31FlashLiteAsync`。
- **发票识别：** 上传发票文件或传已有 `attachmentId` → 识别发票号与开票日期。接口：`ExtractInvoiceAsync`。
- **上传图片识别箱号：** 上传**一张**箱号照片 → 按 `UploadFile` 口径落成附件，同时识别箱号。识别失败或图里没有箱号时 **`ctnNo` 为 null，附件信息照常返回**。接口：`UploadAndExtractCtnNoAsync`。
- **单票账单识别费用：** 上传船公司/代理的单票账单（Invoice / Debit Note）→ 识别提单号与费用行（费用代码、币别、Unit=箱型名、Quantity=该箱型箱量、单价、金额）→ 返回 `OrderFeeEditDto` 列表，由用户决定是否添加。**本接口不写费用。** 未传 `transportOrderId`：必须识别到提单号并唯一匹配业务，否则报错。传了 `transportOrderId`：业务必须存在；认不出提单号、或识别提单号与该票对不上，都不报错，费用挂到该业务上，前端用返回的 `mblNum` 自己判断是否对得上。费用行的结算对象按费用代码的默认付费客户类型（行业类别）从这票业务上带：业务是件杂货时额外读件杂货扩展表，订舱代理、目的港代理取件杂货上的值，**地面代理取件杂货的 `GroundAgentId`**。接口：`ExtractBillFeesAsync(Guid? transportOrderId = null)`。
- **识别客户开票信息：** 客户页开票信息页签上传客户发来的开票资料（开票信息表、聊天/邮件截图、营业执照）**或直接粘贴开票资料文字** → 识别抬头、纳税人识别号、开票地址、开票电话、手机、开票要求，以及**开票银行列表**（币别、开户银行、银行账号、账户名称、SwiftCode）→ 出参字段名与开票信息表一致，前端直接填回新增/编辑表单。**本接口不落库。** 银行有几条就返回几条；**每个币别的第一条置为默认**（开票信息新增/编辑接口要求每个币别有且仅有一个默认账户，按返回值直接提交即可过校验）；币别Id 匹配不到为 -1。接口：`ExtractClientInvoiceInfoAsync(string text = null)`。**传了 `text` 就按文字识别、不再读上传文件**；两者都没有报「请上传开票资料文件或输入需要识别的文字」。
- **单证抽取转新建Dto（海运出口 / 海运进口 / 空运出口 / 业务联系单）：** 上传提单、订舱确认、业务联系单 → 按字段清单抽取 → 抽出来的文本按名称匹配成各引用表的 Id → **直接返回对应业务「新建」接口的入参 Dto**，前端拿到就能填表单。**本组接口不落库。** 与 `TextInAdmin` 下同名的四个接口**入参与表单字段完全一致**（用的是同一批 Dto、同一套匹配口径），差别只有识别引擎，以及**不返回原文定位信息 `extract`**——返回值就是表单对象本身，没有外层包装，因此也没有页码与坐标、做不了原文高亮。接口：`ExtractSeaExportToAddDtoAsync` / `ExtractSeaImportToAddDtoAsync` / `ExtractAirExportToAddDtoAsync` / `ExtractPreOrderToAddDtoAsync(int bizType = 0)`（`bizType`：0 海运出口、1 海运进口、2 空运出口、3 件杂货），模型 `gemini-3.1-flash-lite`，文件上限 20MB。
- **单证抽取转新建件杂货：** 上传订舱确认、提单 → 直接返回「新建件杂货」接口的入参 `BreakBulkAddDto`（已按名称回填 id），**本接口不落库**。件杂货单证与海运出口是同一类，**复用海运出口的抽取字段清单、识别场景 `SeaExport` 与提示词版本**，同一份文件在海运出口、件杂货两个接口之间第二次调用直接命中缓存、不再调 AI（见卡点 18）。件杂货没有船公司、装运方式、服务项目、集装箱，这几项不回填。没有 TextIn 版（TextIn 已标记弃用，本次也没接件杂货）。接口：`ExtractBreakBulkToAddDtoAsync`，模型 `gemini-3.1-flash-lite`，文件上限 20MB。
- **外网服务器健康检查：** 浏览器访问 `http://<外网服务器地址>/` 显示"服务已正常启动并可访问"（与中转站一致）；`GET /health` 返回 `{"status":"ok","time":...}`。
- **外网服务器调用留痕：** 每个 Gemini 接口各自写入 `Logs/Gemini/{接口名}/{接口名}-yyyyMMdd.log`（如 generate → `Logs/Gemini/generate/`），含来源IP、请求时间、**当日第N次**(该接口独立内存计数)、模型、字节数、耗时、状态码；成功/失败均可附 Gemini 完整报文（`LogSuccessBody`/`LogFailureBody`，默认均开启）。不同接口文件夹与次数互不共享。

# 3. 状态流转说明 (Status Transitions)

本模块无业务单据状态，此处描述**一次解析调用的处理链路**（便于测试定位问题出在哪一段）。

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| 前端提交请求 | 报价接口、开票信息识别接口判断 `text` 是否为空白 | 已确定数据来源 | **`text` 非空白 → 文字分支**（提示词 + 文字，完全不读表单）；否则 → 文件分支。其余接口无此分流，仍只走文件 |
| 用户上传文件 | 前端提交 `multipart/form-data` | 业务端已收文件 | 文件分支先判 `Request.HasFormContentType` 再取 `Request.Form.Files` 第一个文件；无文件抛「请上传文件或输入需要解析的文字」（开票信息识别为「请上传开票资料文件或输入需要识别的文字」，提单接口为「请上传文件」） |
| 业务端已收文件 | `GetMimeType` + 转 Base64（Excel 走 `ExcelToHtmlTableHelper` 转 HTML 文本） | 请求体已组装 | 优先用浏览器上传的 `ContentType`，为空或 `application/octet-stream` 时按扩展名兜底。**Gemini 只收 pdf/json、text/\* 与图片音视频的 mime_type，Excel 直传必被拒**，所以 xlsx/xls 一律先转 HTML 文本；转换时按**文件头**判走哪条读取路径（OLE2 头 → NPOI 读 xls，ZIP 头 → EPPlus 读 xlsx），不按扩展名 |
| 请求体已组装 | `GeminiGlobalServerClient` 序列化 + GZip | 已发往外网服务器 | `POST /global/gemini/generate?model=xxx`，头带 `X-Global-Token` 与 `Content-Encoding: gzip` |
| 已发往外网服务器 | 取当日序号 + 校验密钥 | 已转发 Gemini | 入口即按接口名内存自增「当日第N次」(跨日归 1，重启归 1)；密钥不符 401；缺 `model` 或空体 400；模型不做限制 |
| 已转发 Gemini | 拼接 `key` 后 POST；**仅 503** 按 `RetryCount` 重试；用尽后按 `FallbackModels` 链切换：3.5-flash → 3.1-flash-lite → 3-flash | 已取得响应 | 超时 504、网络异常 502；最终状态码汉化为 `message`（503 →「AI识别服务繁忙，请稍后重试」） |
| 已取得响应 | 业务端取 `candidates[0].content.parts[0].text` | 已拿到模型正文 | 非 2xx 抛「Gemini 请求失败(HTTP xxx)」；正文为空时报价接口返回空数组 |
| 已拿到模型正文 | 反序列化为 DTO | 已结构化 | 报价接口反序列化为 `List<GeminiSeFreiPriceDto>` |
| 已结构化 | `FillMatchedIdsAsync` 读个人设置 → 模糊匹配 → 默认值反填 | 已回填 | 报价接口：先读当前登录人的个人设置 `DefaultFreightRate`（没有或解析不了就当没配置）；再查全量港口/币别/箱型/船公司，港口按设置里的默认航线优先，回填Id，匹配不到置 -1；最后按设置反填默认值（见 4.9）。**原始名称字段保留** |
| 已回填 | 报价接口写缓存 `App_AiExtractRecords` | 返回前端 | 缓存的是**模型原始输出**，不含回填的 Id 与默认值；回填做完才写缓存，写缓存之后不再有会抛错的代码。命中缓存时跳过调用 AI，但读个人设置、匹配、反填照样每次重跑 |

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

> 解析结果 DTO 字段（`GeminiSeFreiPriceDto` / `SeFreiPriceCtnDto`）见 `Gemini对接-前端对接.md` 第 3 章，此处不重复；按个人设置反填的默认值字段（`recommend`、`bookingAgentId`/`bookingAgent`、免用箱/免堆/免箱天数、`voyage`、`contractNo`）以本文 4.9 为准。

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
| **orderFees[].settlementId** | 结算对象id | 费用代码默认付费客户类型（`DefaultCreditName` 的行业类别字母）→ `ResolveSettlementByIndustryCategory`：发货人/收货人/通知人/报关行/车队/委托单位/仓库/保险公司取业务表；场站取海运出口；订舱代理、目的港代理取海运出口或件杂货上的值；**地面代理只取件杂货 `GroundAgentId`** | 业务是件杂货时才多查一次件杂货扩展表；类别为空、不支持、或业务上没填该往来单位时为 null | 录入状态允许为空 |
| **orderFees[].settlement** | 结算对象（完整客户对象） | `ResolveSettlementByIndustryCategory` 得到 `settlementId` 后按客户表回填 | 与 `settlementId` 成对；带不到时两者都为 null | 提交仍以 `settlementId` 为准，本对象只给展示 |
| **orderFees[].unit** | 单位 | 优先系统箱型名（40HC 可匹配 40HQ），否则账单箱型原文 | 对应费用 Unit | 最长 16 字符 |
| **orderFees[].quantity** | 数量 | 该箱型的箱量，不是 UNI/FIX | 金额 = 单价 × 数量 |  |

## 4.7 单证抽取出参（五个新建表单 Dto）

出参就是各业务「新建」接口的入参 Dto，完整字段表见 `Gemini对接-前端对接.md` 第 9 节。这里只记**名称→id 的匹配来源**与几个容易踩的口径。

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 | 🔗 联动规则 | 🛡️ 校验限制 |
| :-- | :-- | :-- | :-- | :-- |
| **件杂货表单** | `ExtractBreakBulkToAddDtoAsync` 的出参 `BreakBulkAddDto` | 字段清单、场景 `SeaExport`、提示词版本全部复用海运出口 | 回填口径与海运出口表单一致（船名/航次/船代/签单方式地点日期/起运港目的港交货地 + 业务表字段）；船公司、装运方式、服务项目、集装箱不回填，`transportOrder.orderCtns` 为 null | 业务表是通用的 `TransportOrderAddDto`，`bizType` 固定 `3`；`orderUsers` 为空数组，新建接口要求销售有且只有一个 |
| **carrierId** | 船公司 | 抽取"船公司简称" → `Carrier.CnShortName` 先精确再包含 | 匹配不到为 null；件杂货表单没有这个字段；业务联系单 `bizType=3` 时恒为 null | 不按全称匹配 |
| **polId / podId / deliverPortId / receivePortId** | 海运港口 | 港口名称 → `PortCode.PortName`；唯一命中即用，多条再按 `Country.CountryEnName`(去空格) 消歧；再按 `EdiCode`；最后 `PortName` 包含 | 同时回填 `xxxRemark` = `PortName, CountryEnName` | 名称形如 `QINGDAO, CHINA` 时按**最后一个逗号**拆港口/国家 |
| **polId / potId / podId**（空运） | 机场 | 三字码 → `AirPort.IataCode`；再按 `EnName`/`CnName`/`City` 精确；最后 `EnName`/`City` 包含 | 业务联系单按入参 `bizType` 选表：`2` 走 `AirPort`，其余（0/1/3，含件杂货）走 `PortCode` | **空运绝不能查海运港口表**，会匹配到另一张表的 id |
| **clientId** | 委托单位 | 委托单位 → `Client.EnName` 先精确再包含 | 匹配不到为 **`Guid.Empty`**（不是 null） | 前端要把 `Guid.Empty` 当成"没匹配上" |
| **codeIssueTypeId / codePackageId / codeServiceId / codeFrtId / codeGoodsId** | 签单方式 / 包装 / 运输条款 / 付费方式 / 品名 | 分别匹配 `CodeIssueType.BillType`+`EnName`、`CodePackage.Name`、`CodeService.EnName`、`CodeFrt.EnName`+`CnName`+`EdiCode`、`CodeGoods.EnName` | 品名按 逗号/顿号/分号/斜杠/换行 拆开逐个匹配，**匹配不到的整条丢弃** | 逐箱明细里的包装只认**完全相等**，不做包含匹配 |
| **ctnCodeId / ctnCodeName** | 箱型 | `CtnCode.CtnName`/`EdiCode`，归一化后比对（去引号空格、`DC`=`GP`、`HC`=`HQ`） | 匹配不到 id 为 **0**，`ctnCodeName` 带回识别原文；件杂货表单不取集装箱，业务联系单 `bizType=3` 时 `preOrderCtns` 恒为空数组 | 箱型带数量(`40HQ*2`)时拆成多条，明细只挂第一条 |
| **tradeTermsType** | 贸易条款 | 按枚举名忽略大小写精确匹配，再做包含匹配 | 匹配不到为 null |  |
| **etd** | 开船/到港/起飞日期 | 海运出口与件杂货取"开船日期"、海运进口取"到港日期"、空运出口取"起飞日期" | 空运另有 `eta` 取"预抵日期" | 各业务共用同一列，不要按字面理解 |
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

## 4.9 海运报价的个人设置默认值（`DefaultFreightRate`）

**设置从哪来：** 表 `App_UserSettings`，条件 `CreatorUserId = 当前登录人` 且 `Name = DefaultFreightRate`，取 `Setting` 列（前端存的 json）。同名多条（历史脏数据）取 `CreationTime` 最新的、时间相同取 `Id` 大的，与个人设置编辑接口保留的那条一致。**没有这条、内容为空、或 json 解析不了，一律按"没配置"处理**：只做名称匹配，不报错；解析失败记一条 `Warn` 日志（带用户id与原文）。

json 属性按名称**忽略大小写**对应，例如 `polId` → `POLId`、`poddem` → `PODDEM`。前端一并存的 `currencyLabel`、`carrierLabel`、`polLabel`、`bookingAgentLabel`、`laneLabels` 只给前端回显用，**后端不读**。

| json 键 | 📖 字段含义说明 | 🔌 反填到出参 | 🔗 什么时候填 | 🛡️ 校验限制 |
| :-- | :-- | :-- | :-- | :-- |
| **laneIds** | 默认航线id列表 | 不输出，只影响港口匹配 | 起运港、目的港、中转港1/2 **四个港口字段都生效**：先在这些航线的港口里匹配完（精确、再包含），一条都没有才去其余港口 | 默认航线里的包含命中**压过**其他航线的精确命中；默认航线内部仍是精确先于包含。默认航线外的港口照样能匹配上（见卡点 20） |
| **carrierId** | 默认船公司 | `carrierId` | 船公司名称匹配结果为 **-1** 时 | 船公司表里查不到（已删除）就不填，保持 -1 |
| **polId** | 默认起运港 | `polId` | 起运港名称匹配结果为 **-1** 时 | 港口表里查不到就不填，保持 -1 |
| **currencyId** | 默认币别 | `currencyId` | 币别匹配结果为 **-1** 时 | 币别表里查不到就不填，保持 -1。**提示词让 AI 没看到币别时返回 USD，所以这一项很少生效**（见卡点 19） |
| **isDirect** | 默认是否直达 | `isDirect` | AI 返回 **null** 时 | 识别出了中转港（`pot1Name`/`pot2Name` 有值）而默认值是直达时不填，保持 null；默认值是中转时照常填 |
| **remark** | 默认备注 | `remark` | AI 识别出的备注为空时 | 识别出了备注就不用默认值，两者不拼接 |
| **recommend** | 默认是否推荐 | `recommend` | AI 不识别，**直接取默认值** |  |
| **bookingAgentId** | 默认订舱代理（客户id，前端按字符串存） | `bookingAgentId` + 展示对象 `bookingAgent` | AI 不识别，**直接取默认值** | 与运价保存时的订舱代理校验同口径：解析不成 Guid、客户查不到、或客户行业类别不含 `o`(订舱代理) 时**两项都为 null**，不影响其余默认值 |
| **polFreeDays** | 起运港免用箱天数 | `polFreeDays` | AI 不识别，直接取默认值 |  |
| **podFreeDays** | 目的港免用箱天数 | `podFreeDays` | AI 不识别，直接取默认值 |  |
| **poddem** | 目的港免堆期天数 | `poddem` | AI 不识别，直接取默认值 |  |
| **poddet** | 目的港免箱期天数 | `poddet` | AI 不识别，直接取默认值 |  |
| **voyage** | 航程 | `voyage` | AI 不识别，直接取默认值 | 对应运价的 `Voyage`（航程），不是船名航次 `VesselVoyage` |
| **contractNo** | 约号 | `contractNo` | AI 不识别，直接取默认值 |  |

**出参因此新增的字段**（`GeminiSeFreiPriceDto`，名称与运价 `SeFreiPrice` 的列名一致，可直接填回运价新建表单）：`recommend`(bool?)、`bookingAgentId`(Guid?)、`polFreeDays`/`podFreeDays`/`poddem`/`poddet`(int?)、`voyage`/`contractNo`(string)，以及订舱代理展示对象 `bookingAgent`（`ClientSimpleDto`：客户id/简称/代码/全称/英文名/失信标记与备注/企业类型/客户性质/共享类型/审核状态/税率/归属公司id，`orgs` 恒为 null）。**没配置个人设置时这些字段全为 null**；千问识别接口返回同一个 DTO，这些字段也恒为 null。

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：外网服务器不可用，所有解析功能全部不可用]** 本项目已**不再保留直连 Gemini 的兜底路径**（密钥已从业务代码移除）。外网服务器宕机/地址配错 → 前端三个解析接口全部报错。排查顺序：`GET /health` → 业务端 `GlobalServer:BaseUrl` → 外网服务器 `Logs/global-yyyyMMdd.log`。

> [!IMPORTANT] **[卡点 2：两端密钥不一致 → 401]** 业务端 `GlobalServer:Token` 与外网服务器 `GlobalServer:AccessToken` 任一改动而另一端没跟着改 → 前端报「Gemini 请求失败(HTTP 401)」。外网服务器 `AccessToken` 配成空串时**所有请求一律 401**，属于有意为之的防漏配设计。

> [!IMPORTANT] **[卡点 3：外网服务器不限制模型，密钥是唯一防线]** 传什么 `model` 就转发什么，换模型只改业务端常量、无需动外网服务器。代价是密钥泄露后对方可借道调用任意模型消耗配额，异常时查对应接口目录（如 `Logs/Gemini/generate/`）里的模型名与「当日第N次」。

> [!IMPORTANT] **[卡点 4：IIS 请求体大小限制拦大文件]** 代码已放开 Kestrel/ANCM 限制并给接口打了 `[DisableRequestSizeLimit]`，但 IIS 请求筛选默认约 30MB 会先拦截，表现为上传大 PDF 报 404.13。需在外网服务器站点 `web.config` 配 `requestLimits maxAllowedContentLength`。

> [!IMPORTANT] **[卡点 5：匹配不到的Id是 -1，不是 null，前端必须处理]** `carrierId`/`polId`/`podId`/`currencyId`/`ctnCodeId` 匹配不到时为 **-1**（`pot1Id`/`pot2Id` 在名称为空时才是 null）。直接把 -1 存库会产生脏数据，录入页必须标红要求人工选择。当前登录人配了个人设置 `DefaultFreightRate` 时，`carrierId`/`polId`/`currencyId` 匹配不到会先换成设置里的默认值，默认值也用不上才是 -1（见 4.9、卡点 19）；`podId` 与 `ctnCodeId` 没有默认值，照旧。

> [!IMPORTANT] **[卡点 6：解析耗时长，前端超时别设太短]** 单证解析通常 10~60 秒（日志实测简单请求约 5 秒，整份 PDF 更久）。链路超时为：前端 > 业务端 180 秒 > 外网服务器 120 秒。前端设 30 秒会出现"页面报超时但后端其实成功了"。

> [!IMPORTANT] **[卡点 7：报价解析的 `text` 不能放 JSON body，且文字优先于文件]** `text` 是简单类型参数，ABP 动态 WebApi 不会给它加 `[FromBody]`，只能从 **form 字段**或 **query 参数**绑定；发 `{"text":"..."}` 的 JSON body 会绑不到值，被当成没传文字转而去找文件，报「请上传文件或输入需要解析的文字」。另外**文字与文件同时传时以文字为准、文件被静默忽略**，测试"换了文件结果没变"时先确认文字框是否还有残留内容。

> [!IMPORTANT] **[卡点 8：箱号识别失败不抛错，前端必须处理 `ctnNo` 为 null]** `UploadAndExtractCtnNoAsync` 先落附件再识别。AI 超时、解析失败、图里没有箱号时接口仍成功，只是 `ctnNo` 为 `null`。前端不能把 `success=true` 当成一定识别到了箱号。

> [!IMPORTANT] **[卡点 9：账单识别不落库，提单号对不上就报错，费用代码 -1 不能直接提交]** `ExtractBillFeesAsync` 只返回 `OrderFeeEditDto` 列表。未传 `transportOrderId` 时：认不出提单号、或主提单号匹配 0 条/多条业务，接口失败。传了 `transportOrderId` 时：业务不存在才报错；认不出提单号、或识别提单号与该票对不上，都不报错，费用挂到该业务上，前端用 `mblNum` 自己判断。`feeCodeId`/`currencyId` 为 -1 时必须让用户改完再调 `BatchEditAsync`。

> [!IMPORTANT] **[卡点 10：账单识别报错时缓存不落库，这是有意为之，不要当成缓存没写]** 缓存行挂在当前工作单元上、靠 AppService 结束时自动 `SaveChanges` 落库，而 AppService 默认开事务。 `ExtractBillFeesAsync` 是**先写缓存、后做提单号匹配**，所以卡点 9 那四种报错会把刚写的缓存行一起回滚，表里查不到这份文件的 md5，重传时会重新识别。
>
> **这是期望行为**：走到这几种报错基本就是传错了文件、或这份账单本身没有费用，这种结果不值得记住。排查时别误判成「缓存代码漏了」——去 `App_AiExtractRecords` 查不到记录，先看那次调用是不是报错结束的。代价是同一份文件在报错后反复上传会各花一次 AI 调用，按现有口径接受。

> [!IMPORTANT] **[卡点 11：单证抽取"匹配不到"的表示方式有三种，不是统一的 null]** 报价解析里匹配不到是 **-1**；单证抽取这五个接口里（含件杂货），普通 `xxxId` 是 **null**、委托单位 `clientId` 是 **`Guid.Empty`**、逐箱明细的 `ctnCodeId` 是 **0**。三种都必须由前端标出来让用户补选，**直接提交新建接口会产生脏数据**（`Guid.Empty` 与 `0` 都能通过非空校验，尤其容易漏）。

> [!IMPORTANT] **[卡点 12：业务联系单的 `bizType` 决定港口查哪张表，传错会静默匹配到另一张表]** `ExtractPreOrderToAddDtoAsync` 的四个港口字段（收货地/起运港/目的港/交货地）走同一套匹配：`bizType=2`（空运出口）查机场表 `AirPort`，其余查海运港口表 `PortCode`。 `bizType=3`（件杂货）同样查 `PortCode`，另外不回填船公司、`preOrderCtns` 恒为空数组——件杂货没有船公司和集装箱，单证上即使有也丢掉。抽取本身不判断业务类型，`bizType` 完全由前端传。传错**不报错**，只是回填的 id 属于另一张表，表单上看着有值、保存后指向的却是错的港口。另外 `bizType` 是简单类型参数，只能走 form 字段或 query，放 JSON body 绑不到值（同卡点 7）。

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

> [!IMPORTANT] **[卡点 17：报价里一格写了多个目的港会拆成多行，但"港口, 国家"这类逗号不能拆]** 报价表常把价格相同的几个港口挤在一个单元格里（`HAMBURG, ROTTERDAM, ANTWERP`、`汉堡、鹿特丹`，或一格里换行列好几个港）。提示词要求按**中英文逗号、顿号、换行**拆成多行，一个目的港一行、按原文顺序排列；拆出来的每行**除目的港外其余字段都照抄原行**，尤其 20GP/40GP/40HC/40NOR 的价格每一行都要有，不能只给第一个。文字报价里一行列了多个目的港同样拆。
>
> 不拆的后果是**静默错**而不是报错：整串 `podName` 进 `FillMatchedIdsAsync` 后，港口匹配是去掉标点再做双向包含， `HAMBURGROTTERDAM` 会模糊命中汉堡，于是只剩一行、`podId` 看着有值，鹿特丹那一行直接丢了。
>
> 反过来拆错了同样是静默错，所以提示词里写死了三种**不能拆**的写法，改提示词时**不要删**：
>
> 1. **逗号后面是国家或州名**（`QINGDAO, CHINA`、`LOS ANGELES, CA`）——美线报价几乎都是"城市, 州"的写法。误拆出来的 `CA` 会被模糊匹配到名字里带 `CA` 的随便一个港口，比匹配不到（-1）更难发现。
> 2. **同一港口的中英文名或港口代码写在一起**（`汉堡 HAMBURG`，或上下两行）——拆了就是两行重复的汉堡。
> 3. **换行后面是中转港或码头说明**（`VIA SINGAPORE`）——那是中转港，不是另一个目的港。
>
> 斜杠 `/` **不算分隔符**：`HO CHI MINH/CAT LAI` 是"港口/码头"的写法，按斜杠拆会多出一行假目的港；所以 `HAM/RTM/ANR` 这种用斜杠列多港的写法目前**不保证拆开**。
>
> 测试注意：提示词版本 `SeFreiPriceSchemaVersion` 已由 2 提到 3，**改动前识别过的文件第一次重传会真实调一次 AI**（慢一些），之后恢复命中缓存。不提版本号的话老文件会一直返回拆分前的旧结果，看起来像是提示词没生效。

> [!IMPORTANT] **[卡点 18：件杂货抽取与海运出口共用一份识别缓存，改海运出口的字段清单会连带影响件杂货]** `ExtractBreakBulkToAddDtoAsync` 直接用海运出口的字段清单 `SeaExportFields`、场景 `SeaExport` 与版本 `SeaExportSchemaVersion`，缓存键与海运出口完全相同。所以：
>
> 1. 同一份文件先按海运出口识别、再按件杂货识别（或反过来），第二次**直接命中缓存、不调 AI**，响应明显变快，不是没识别；
> 2. 以后给海运出口加减字段或改提示词，件杂货的识别结果会跟着变；提 `SeaExportSchemaVersion` 让旧缓存失效时，件杂货的旧缓存也一起失效；
> 3. 件杂货接口写进 `App_AiExtractRecords` 的记录 `SceneCode` 是 `SeaExport`，没有单独的件杂货场景，排查时按这个场景查。
>
> 模型照样会按海运出口的清单把船公司、集装箱明细抽出来，只是件杂货组装表单时不取。要让件杂货的字段清单独立演进，必须新开场景和版本号。

> [!IMPORTANT] **[卡点 19：个人设置的默认值只补「没识别到 / 没匹配上」的字段，不纠正「匹配错」的]** 船公司、起运港、币别只有匹配结果是 **-1** 才换成默认值。港口与船公司的匹配是去标点后双向包含，模糊命中了一条**错的**记录时 id 不是 -1，默认值不会盖上去——测"识别错了为什么没用默认值"时，先看 `carrierName`/`polName` 原文是不是被模糊命中到了别的记录。
>
> 反过来，填上默认值之后该字段就不再是 -1，前端"未匹配标红"不会亮，用户看到的是一个正常的选中值，**分不出是识别出来的还是默认带出来的**，要对照 `carrierName`/`polName`/`currencyCode` 原文（没识别到时为 null）才能判断。
>
> 币别最特殊：提示词写死了"没看到币别返回 USD"，只要币别表里有 USD 就能匹配上，**个人设置里的默认币别只在识别出的币别匹配不到时才生效**。"报价没写币别、期望带出默认 CNY"实际拿到的是 USD，这是现行口径，不是 bug。要让默认币别在报价没写币别时生效，得改提示词去掉默认 USD，并提 `SeFreiPriceSchemaVersion` 让旧缓存失效。
>
> 默认值指向的数据已经不在（船公司、港口、币别查不到，订舱代理查不到或已不是订舱代理）就不填，保持 -1/null 让用户手工选，不会把失效 id 带到保存时才报「不存在」。

> [!IMPORTANT] **[卡点 20：默认航线整表优先，里面的包含命中压过其他航线的精确命中]** 四个港口字段的匹配顺序从高到低是：
>
> 1. 默认航线港口的**精确**匹配（英文名/中文名/EDI代码归一化后相等）
> 2. 默认航线港口的**包含**匹配（双向包含，另加说明字段）
> 3. 其余港口的精确匹配
> 4. 其余港口的包含匹配
>
> 所以默认航线里只有包含命中、别的航线有精确命中时，**取默认航线的包含命中**。默认航线一条都对不上，才落到其余港口，那里仍是精确先于包含。
>
> 代价是一次很松的包含也会赢：识别出 `QINGDAO`，默认航线里某个港口的说明字段写着 QINGDAO，就会取它，不会去取其他航线里英文名正好是 QINGDAO 的港口。
>
> 默认航线对起运港、目的港、中转港1/2 **全部生效**。起运港名字只要能对上默认航线里的港口（精确或包含），就取默认航线下的那一条。

> [!IMPORTANT] **[卡点 21：默认值按「当前登录人」每次现算，不进缓存；千问接口不反填]** 缓存表存的是模型原始输出，默认值和 Id 一样每次重新算，所以改了个人设置后同一份文件重传**立刻按新设置反填**（命中缓存也一样）；同一份文件换个账号识别，结果按各自的个人设置来，不一样是正常的。本次**没有**提 `SeFreiPriceSchemaVersion`，改动前识别过的文件照常命中缓存，不会重新花钱。
>
> 个人设置的 json 坏了（手工改库、前端存错类型）按"没配置"处理，只记日志，接口照常返回；`bookingAgentId` 不是 Guid（比如存成一串数字）只丢这一项。测试没看到默认值时，先查 `App_UserSettings` 里当前账号 `Name = DefaultFreightRate` 那条在不在、`Setting` 是不是合法 json、有没有被软删除。
>
> 千问 `QwenAdmin/ExtractSeFreiPriceByPromptAsync` 返回同一个 `GeminiSeFreiPriceDto`，但**没有接个人设置**：默认值字段恒为 null，港口也不按默认航线优先。两个接口从此在默认值上口径不一致。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 | 🤖 代码解析与架构洞察 |
| :-- | :-- | :-- | :-- |
| 2026-09-29 | `Fix` | 默认航线的港口优先级改为整表优先：默认航线里的包含匹配压过其他航线的精确匹配。顺序为默认航线精确、默认航线包含、其余港口精确、其余港口包含；默认航线一条都对不上才去其余港口 | 原先把默认航线港口排到列表最前，但 `MatchPortId` 先扫完全表的精确档，默认航线的包含命中盖不过其他航线的精确命中。改为先对默认航线港口跑完 `MatchPortId`（精确再包含），返回 -1 再对其余港口跑一遍；`MatchPortId` 未改。见卡点 20 |
| 2026-09-29 | `Feature` | 海运报价解析按当前登录人的个人设置 `DefaultFreightRate` 反填默认值：设置里默认航线下的港口优先匹配（起运港/目的港/中转港都生效，同名港口取默认航线下的）；船公司、起运港、币别匹配不到时填默认值；是否直达、备注没识别出来时填默认值（识别出中转港时不套默认的直达）；是否推荐、订舱代理、起运港/目的港免用箱天数、目的港免堆期/免箱期、航程、约号直接取默认值。出参新增 `recommend`、`bookingAgentId`/`bookingAgent`、`polFreeDays`、`podFreeDays`、`poddem`、`poddet`、`voyage`、`contractNo`。没有该个人设置时结果与改动前一致；接口地址与入参不变 | 设置按 `CreatorUserId + Name` 取 `App_UserSettings.Setting`，同名多条取创建时间最新的（与个人设置编辑接口去重时保留的那条一致），反序列化为 `DefaultFreightRateSettingDto`，解析失败按未配置处理只记日志；`bookingAgentId` 用字符串接收再 `Guid.TryParse`，免得一个坏值让整份设置反序列化失败、其余默认值跟着丢。默认航线的匹配顺序以卡点 20 为准（同日后续把「同档内优先」改成了「默认航线整表优先」）；`MatchPortId` 本身没改，新参数可选，千问不传、行为不变。默认值反填全部写在 `FillMatchedIdsAsync` 里（命中缓存与新识别两处调用共用），船公司/港口/币别的默认 id 先在已全量加载的列表里核对存在，订舱代理多查一次客户表并按运价保存同口径校验行业类别含 `o`，避免带着失效 id 到保存时才报错。默认值和 Id 一样不进缓存、每次现算，所以**没提** `SeFreiPriceSchemaVersion`（提示词与模型输出结构都没变，提了只会让老文件白白重新花钱）。按数据访问规范把新识别路径改成「回填 → 写缓存 → 返回」（原来写缓存在回填之前），写缓存之后不再有会抛错的代码；四张基础资料的全量查询改为 `AsNoTracking`。千问接口未同步 |
| 2026-09-27 | `Feature` | 件杂货接入：①新增 `ExtractBreakBulkToAddDtoAsync`，上传单证返回新建件杂货入参 `BreakBulkAddDto`（不落库），回填船名、航次、船代、签单方式/地点/日期、起运港/目的港（含备注）、交货地，以及业务表的主提单号、订舱编号、唛头、货物描述、收发通内容、件数、毛重、体积、货好日期、开船日期、贸易条款、运输条款、包装、委托单位、品名；船公司、装运方式、服务项目、集装箱不回填；报错前缀「件杂货抽取转换异常」。②业务联系单识别 `bizType` 新增 `3`=件杂货：不回填船公司，箱型箱量恒为空列表，港口按海运港口匹配。③账单识别费用在件杂货业务上按行业类别带结算对象：订舱代理、目的港代理取件杂货上的值，地面代理取件杂货 `GroundAgentId` | 件杂货单证与海运出口同类，抽取直接复用 `SeaExportFields` + `CtnListField` + `SceneSeaExport` + `SeaExportSchemaVersion`，**没有新开缓存场景**：同一份文件两边互相命中缓存，代价是字段清单与版本号被两边共用（见卡点 18）。表单组装在 `SaveDocSchemaCacheAsync` 之前，组装抛错不会把已花钱的识别结果回滚掉，与其余四个抽取接口同一顺序。出参直接用件杂货模块的 `BreakBulkAddDto`（业务表是通用的 `TransportOrderAddDto`），不是 `TextIn/Dto` 下的抽取表单，所以 `transportOrder.orderCtns` 为 null 而不是空数组。账单识别：`BuildBillFeeExtractDtoAsync` 只在 `BizType == BreakBulk` 时多查一次 `App_BreakBulks`；基类 `ResolveSettlementByIndustryCategory` 加可选参数 `breakBulk`，订舱代理、目的港代理改为「海运出口 ?? 件杂货」，新增 `地面代理 → breakBulk.GroundAgentId`（一票只会是其中一种业务）。TextIn 已标记 `[Obsolete]`，本次未接件杂货；业务联系单传 `3` 时 TextIn 版仍会按海运回填船公司与箱型箱量 |
| 2026-09-26 | `Enhancement` | 海运报价解析：同一个单元格里写了多个目的港（中英文逗号、顿号或换行隔开）时拆成多行，一个目的港一行、按原文顺序，该行的箱型价格（20GP/40GP/40HC/40NOR）与其余字段每行照抄；文字报价一行列了多个目的港同样拆。"港口, 国家/州"、同一港口的中英文名或代码写在一起、换行后面是中转港或码头这三种不拆。接口地址、入参、出参结构都不变，只是返回行数会变多 | 只改提示词 `SeFreiPriceExtractPrompt`，在目的港规则段后加三句（拆行、照抄、不拆的例外）。**拆行交给模型做，后端没有加按分隔符切 `PodName` 的代码**：同一个分隔符在不同写法里含义不同（`LOS ANGELES, CA` 的逗号后面是州名、`汉堡`换行`HAMBURG` 是双语），只有看得到版面和上下文的模型分得清，后端拿到的已经是拼好的字符串，按字符切必然误拆。不拆与拆错的后果都是静默错（见卡点 17），根源是港口匹配走去标点后的双向包含。拆分示例特意写成 `HAMBURG, ROTTERDAM`（逗号后带空格），与不拆示例 `QINGDAO, CHINA` 格式一致，避免模型把"逗号后有没有空格"当成判据。`SeFreiPriceSchemaVersion` 由 2 提到 3 使旧缓存失效。千问 `QwenAdminAppService.SeFreiPricePrompt` 是独立的一份提示词，**本次未同步**，两边在多目的港上的识别口径从此不一致 |
| 2026-09-15 | `Enhancement` | 上传 **xls(Excel 97-2003)** 的识别接口不再报「文件无法读取」，与 xlsx 一样能识别；文件内容既不是 xlsx 也不是 xls 时报错改为「文件内容不是 xlsx 或 xls 工作簿，请确认不是改了扩展名的网页或文本文件」，原「请确认文件为有效的 xlsx 格式」文案取消 | `IsExcelFile` 一直放行 `.xls`，但 `ExcelToHtmlTableHelper` 只有 EPPlus 一条路径，而 EPPlus 只认 OOXML，真正的 BIFF8 二进制工作簿必抛异常——等于**声明支持、实际不支持**。改为**按文件头分流**（OLE2 头 `D0CF11E0…` → NPOI `HSSFWorkbook`，ZIP 头 `PK\x03\x04` → EPPlus），不按扩展名：导出系统把 xlsx 存成 `.xls`、把网页表格存成 `.xls` 都很常见，扩展名根本不可信。两条读取路径各自裁出「单元格文本矩阵 + 合并区」的 `SheetTable` 后共用同一个 HTML 渲染，合并单元格的 rowspan/colspan 口径不变，**xlsx 的输出与改动前完全一致**。xls 的公式格只取缓存结果不做求值（求值遇到不支持的函数会整本抛异常，而识别只要显示值）；读 xls 前注册 `CodePagesEncodingProvider`，否则 .NET 8 不带 GBK，中文 xls 直接读失败。新增包 `NPOI 2.7.6`(Apache-2.0)、`System.Text.Encoding.CodePages 8.0.0`。**为什么必须转、不能直传**：Gemini 支持的 mime_type 只有 `application/pdf`、`application/json`、`text/*` 与图片音视频，Excel 的 mime_type 会被判不支持；而本服务 `GetMimeType` 的兜底分支会把认不出的扩展名当 `application/pdf` 发出去，直传 Excel 属于必错路径（要么 400、要么把二进制当 PDF 解析出垃圾） |
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

## 7.1 海运报价按个人设置反填默认值（2026-09-29）

| 文件 | 改动 |
| :-- | :-- |
| `src/CsprojBuilder.Application/App/AI/GeminiAdminAppService.cs` | 构造函数注入 `IRepository<Entites.UserSetting, long>`；新增常量 `DefaultFreightRateSettingName`；`FillMatchedIdsAsync` 先读当前登录人的个人设置、把默认航线传给匹配、匹配完按默认值反填，四张基础资料查询改为 `AsNoTracking`；`ExtractSeFreiPriceByPromptAsync` 新识别路径改为先回填再写缓存；补 `using Abp.Runtime.Session;`、`using CsprojBuilder.App.Client.Dto;` |
| `src/CsprojBuilder.Application/App/AI/SeFreiPriceMatchHelper.cs` | `FillMatchedIds` 新增可选参数 `preferLaneIds`：先在这些航线的港口里匹配完（精确、再包含），一条都没有才去其余港口；`MatchPortId` 未改 |
| `src/CsprojBuilder.Application/App/AI/Dto/GeminiDto.cs` | `GeminiSeFreiPriceDto` 新增 `Recommend`/`BookingAgentId`/`POLFreeDays`/`PODFreeDays`/`PODDEM`/`PODDET`/`Voyage`/`ContractNo` 与展示对象 `BookingAgent`，更新各 Id 字段注释；新增 `DefaultFreightRateSettingDto`（个人设置 json 的反序列化结构）；补 `using CsprojBuilder.App.Client.Dto;` |
| `src/CsprojBuilder.Application/App/AI/IGeminiAdminAppService.cs` | 只改 `ExtractSeFreiPriceByPromptAsync` 的注释，签名未变 |
| `src/CsprojBuilder.Application/App/AI/QwenAdminAppService.cs` | **未改**，千问不做默认值反填 |
| `src/CsprojBuilder.Application/App/UserSetting/*` | **未改**，个人设置仍原样存储 `Setting`，结构只在识别侧解析 |
| `文档/外部Api对接/Gemini/Gemini对接-前端对接.md` | **未改**（本次不涉及前端），出参新增字段记在本文 4.9 |

**接口文件 ↔ 文档映射：** 接口地址、入参未变，`IGeminiAdminAppService.cs` 只改注释；出参新增字段以本文 4.9 为准

**数据库变更：** 无。只读 `App_UserSettings`，表结构未动；缓存表 `App_AiExtractRecords` 的 `SceneCode = SeFreiPrice` 仍写 `SchemaVersion = 4`

## 7.2 件杂货接入（2026-09-27）

| 文件 | 改动 |
| :-- | :-- |
| `src/CsprojBuilder.Application/App/AI/IGeminiAdminAppService.cs` | 新增 `ExtractBreakBulkToAddDtoAsync` 声明；`ExtractPreOrderToAddDtoAsync` 注释补 `3=件杂货` |
| `src/CsprojBuilder.Application/App/AI/GeminiAdminAppService.cs` | 新增 `#region 件杂货单证抽取`（public `ExtractBreakBulkToAddDtoAsync`，复用海运出口字段清单、场景与版本，组装 `BreakBulkAddDto`）；构造函数注入 `IRepository<Entites.BreakBulk, Guid>`；`BuildBillFeeExtractDtoAsync` 在业务是件杂货时查件杂货扩展表并传给 `ResolveSettlementByIndustryCategory`；`BuildPreOrderFormAsync` 在 `bizType == BreakBulk` 时 `CarrierId` 置 null、`PreOrderCtns` 置空列表；`ResolvePortByBizTypeAsync` 注释补件杂货走 `PortCode` |
| `src/CsprojBuilder.Application/CsprojBuilderAppServiceBase.cs` | `ResolveSettlementByIndustryCategory` 加可选参数 `breakBulk`：订舱代理、目的港代理取「海运出口 ?? 件杂货」，新增地面代理取 `breakBulk.GroundAgentId` |
| `src/CsprojBuilder.Core/CsprojBuilderEnum.cs` | `BizType` 新增 `BreakBulk = 3` |
| `src/CsprojBuilder.Application/App/BreakBulk/Dto/BreakBulkDto.cs` | **件杂货模块新增**，本模块只把 `BreakBulkAddDto` 当出参用，字段口径见 `文档/件杂货/件杂货模块总逻辑文档.md` |
| `src/CsprojBuilder.Application/App/ExternalApi/TextIn/TextInAdminAppService.cs` | **未改**。已标记 `[Obsolete]`，不接件杂货 |
| `文档/外部Api对接/Gemini/Gemini对接-前端对接.md` | 顶部更新说明、接口清单、7.3.2/7.3.3 结算对象口径；第 9 节新增 9.7 件杂货出参，原 9.7~9.10 顺延为 9.8~9.11 |

**接口文件 ↔ 文档映射：** `IGeminiAdminAppService.cs` ↔ `文档/外部Api对接/Gemini/Gemini对接-前端对接.md`（件杂货抽取在 9.7）

**数据库变更：** 无。件杂货抽取写缓存用的是海运出口的 `SceneCode = SeaExport`、`SchemaVersion = 1`，`App_AiExtractRecords` 没有新场景

## 7.3 海运报价多目的港拆行（2026-09-26）

| 文件 | 改动 |
| :-- | :-- |
| `src/CsprojBuilder.Application/App/AI/GeminiAdminAppService.cs` | 提示词常量 `SeFreiPriceExtractPrompt` 在目的港规则段后新增三句：一格多个目的港拆成多行、拆出的行照抄箱型价格与其余字段、三种不拆的例外；`SeFreiPriceSchemaVersion` 由 `"2"` 改为 `"3"`。方法体、出参 DTO、`SeFreiPriceMatchHelper` 均未动 |
| `src/CsprojBuilder.Application/App/AI/QwenAdminAppService.cs` | **未改**，千问的 `SeFreiPricePrompt` 仍不拆行 |
| `文档/外部Api对接/Gemini/Gemini对接-前端对接.md` | 顶部更新说明加一条；3.3 `podName` 行补拆行口径；3.4 下的文字识别提示改写 |

**接口文件 ↔ 文档映射：** 接口地址、入参、出参均未变，`IGeminiAdminAppService.cs` 未改

**数据库变更：** 无。缓存表 `App_AiExtractRecords` 结构未动，只是 `SceneCode = SeFreiPrice` 的新记录写 `SchemaVersion = 3`，版本 2 的旧记录不再被读取

## 7.4 Excel 读取支持 xls（2026-09-15）

| 文件 | 改动 |
| :-- | :-- |
| `src/CsprojBuilder.Application/App/AI/ExcelToHtmlTableHelper.cs` | 重写。`ConvertToHtml` 改为按文件头分流；新增 `ReadXlsxSheets`(EPPlus)、`ReadXlsSheets` + `BuildXlsSheetTable`(NPOI)、`GetCellText`、`EnsureCodePagesRegistered`、`StartsWith` 与私有结构 `SheetTable`；原 `AppendSheetAsHtmlTable` 改为渲染 `SheetTable`，**HTML 输出格式未变** |
| `src/CsprojBuilder.Application/App/AI/GeminiAdminAppService.cs` | `BuildPartsFromFileBytes` 的 Excel 报错文案改为「Excel 文件无法读取：{原因}」（具体原因由助手给出）；`IsExcelFile` 的注释补上「Gemini 不收 Excel 的 mime_type」这一前提。**分流逻辑与调用点未动** |
| `src/CsprojBuilder.Application/CsprojBuilder.Application.csproj` | 新增 `NPOI 2.7.6`、`System.Text.Encoding.CodePages 8.0.0` |
| `文档/外部Api对接/Gemini/Gemini对接-前端对接.md` | 第 10 节报错表的 Excel 那一行改文案 |

**接口文件 ↔ 文档映射：** 接口地址、入参、出参均未变，`IGeminiAdminAppService.cs` 未改

**数据库变更：** 无

## 7.5 客户开票信息识别（2026-09-15）

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

## 7.6 单证抽取转新建Dto（2026-09-14）

| 文件 | 改动 |
| :-- | :-- |
| `src/CsprojBuilder.Application/App/AI/IGeminiAdminAppService.cs` | 新增四个抽取接口声明 |
| `src/CsprojBuilder.Application/App/AI/GeminiAdminAppService.cs` | 新增四个 public 接口 + `#region 单证抽取字段定义`（四套字段清单、集装箱/货物明细子字段、`DocExtractModel`）+ 私有实现（`ExtractDocSchemaAsync`、`BuildDocExtractPrompt`、`ParseDocSchema`、四个 `Build*FormAsync`、`Resolve*` 名称转 id、箱型与空运明细解析）；构造函数新增注入 `CodeIssueType`/`CodePackage`/`CodeService`/`CodeGoods`/`CodeFrt`/`AirPort` 六个仓储 |
| `src/CsprojBuilder.Application/App/ExternalApi/TextIn/Dto/*.cs` | **未改**，四个表单 Dto 直接复用 |
| `src/CsprojBuilder.Application/App/ExternalApi/TextIn/TextInAdminAppService.cs` | **未改**，两边各留一份实现 |
| `文档/外部Api对接/Gemini/Gemini对接-前端对接.md` | 第 9 节 |

**接口文件 ↔ 文档映射：** `IGeminiAdminAppService.cs` ↔ `文档/外部Api对接/Gemini/Gemini对接-前端对接.md`

**数据库变更：** 无。缓存沿用 `App_AiExtractRecords`，四个新场景只是新增 `SceneCode`（`SeaExport` / `SeaImport` / `AirExport` / `PreOrder`），表结构与索引未动

## 7.7 账单识别费用（2026-09-06）

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

## 7.8 取消缓存管理器（2026-09-06）

| 文件 | 改动 |
| :-- | :-- |
| `src/CsprojBuilder.Application/App/AI/AiExtractCacheManager.cs` | **删除** |
| `src/CsprojBuilder.Application/App/AI/GeminiAdminAppService.cs` | 改注入 `IRepository<Entites.AiExtractRecord, long>`；新增私有 `TryGetCacheResultJsonAsync` / `SaveCacheResultJsonAsync` / `BuildSourceKey` 两个重载；新增常量 `ProviderGemini` |
| `src/CsprojBuilder.Application/App/ExternalApi/TextIn/TextInAdminAppService.cs` | 同上改注入仓储；`TryGetCachedResultAsync` / `SaveExtractCacheAsync` 改为直接查表；新增常量 `ProviderTextIn` / `ModelTextInV3` |

**数据库变更：** 无。表 `App_AiExtractRecords` 结构、唯一索引、各场景 `SceneCode` / `SchemaVersion` 全部未动
