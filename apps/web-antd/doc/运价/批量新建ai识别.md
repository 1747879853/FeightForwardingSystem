---
title: 运价批量新建 AI 识别（文件解析 + 名称转id）
module: 运价
author: 后端
last_updated: 2026-07-16
---

# 1. 业务背景说明 (Background)

**白话解释：** 业务员手里常拿到船公司/代理发来的**运价报价文件**（PDF、图片、Excel 截图等），里面是一行行的目的港、箱型价格、有效期等信息。以前需要人工一条条录入到"运价新建"表单，效率低且易错。

本次新增 **AI 识别批量新建** 能力：上传一份运价报价文件，后端调用大模型（Gemini / 通义千问）识别出**多行运价数据**，并在识别结果基础上，把港口名、币别、箱型名等**文本自动模糊匹配成系统内的 id**，直接返回给前端做批量预填。匹配不到的 id 返回 `-1`，由前端提示用户手动补录，**匹配失败不报错**。

提供两套实现，出参结构完全一致，前端可按需选用或做对比：

- **Gemini：** `gemini-3.5-flash` 多模态，直接把文件 base64（gzip 压缩）随请求传入，支持图片/PDF。
- **通义千问：** `qwen-doc-turbo`，先上传文件到百炼文件服务（`file-extract`）解析，再用 `fileid://` 抽取。

---

# 2. 功能与操作说明 (Features & Operations)

- **Gemini 识别运价：** `GeminiAdmin/ExtractSeFreiPriceByPromptAsync` → 文件 base64+gzip 传给 `gemini-3.5-flash` → 解析出运价多行 → 名称模糊匹配 id → 返回 `List<GeminiSeFreiPriceDto>`。
- **千问识别运价：** `QwenAdmin/ExtractSeFreiPriceByPromptAsync` → 上传文件到百炼（`file-extract`）→ 等待解析完成 → `qwen-doc-turbo` + `fileid://` 抽取 → 名称模糊匹配 id → 返回 `List<GeminiSeFreiPriceDto>`。

流程：前端 `multipart/form-data` 上传文件（取第一个文件）→ 后端调用对应大模型识别 → 反序列化为运价列表 → 港口/币别/箱型多字段模糊匹配 id → 回填 id 后返回（保留原始名称字段）。

> 提示词已内置在后端，**前端无需传入提示词**，两个接口均**无请求体参数**，只需上传文件。

---

# 3. 接口说明 (API)

## 3.1 ExtractSeFreiPriceByPromptAsync（Gemini）

- **接口地址：** `POST /api/services/app/GeminiAdmin/ExtractSeFreiPriceByPromptAsync`
- **请求方式：** `multipart/form-data`，表单内放一个文件（取第一个文件）
- **支持文件类型：** PDF（`application/pdf`）、图片（`image/png`、`image/jpeg`、`image/webp`、`image/heic`、`image/heif`、`image/gif`、`image/bmp`）、纯文本（`text/plain`）；mime 类型优先取上传的 `ContentType`，缺失时按扩展名兜底
- **入参：** 无 DTO，文件从请求表单读取
- **出参：** `List<GeminiSeFreiPriceDto>`（见 3.3）

## 3.2 ExtractSeFreiPriceByPromptAsync（通义千问）

- **接口地址：** `POST /api/services/app/QwenAdmin/ExtractSeFreiPriceByPromptAsync`
- **请求方式：** `multipart/form-data`，表单内放一个文件（取第一个文件）
- **入参：** 无 DTO，文件从请求表单读取
- **出参：** `List<GeminiSeFreiPriceDto>`（见 3.3）
- **说明：** 千问强制返回 JSON 对象，提示词要求返回 `{ "list": [...] }`；后端做了兼容解析（内容为数组直接反序列化，为对象则取其中第一个数组字段），最终输出与 Gemini 一致

## 3.3 出参字段（GeminiSeFreiPriceDto）

| 字段 | JSON Key | 类型 | 说明 |
| :-- | :-- | :-- | :-- |
| 目的港名称 | `podName` | string | 大模型识别的卸货港名称（原始文本） |
| 目的港Id | `podId` | long | `podName` 模糊匹配港口表得到，**匹配不到为 `-1`** |
| 是否直航 | `isDirect` | bool? | true=直航，false=中转，null=未知 |
| 中转港1名称 | `pot1Name` | string | 中转港1（原始文本，可空） |
| 中转港1Id | `pot1Id` | long? | 名称为空则 `null`；有名称但匹配不到为 `-1` |
| 中转港2名称 | `pot2Name` | string | 中转港2（原始文本，可空） |
| 中转港2Id | `pot2Id` | long? | 名称为空则 `null`；有名称但匹配不到为 `-1` |
| 币别代码 | `currencyCode` | string | 识别到的币别 code（无则默认 USD） |
| 币别Id | `currencyId` | long | `currencyCode` 模糊匹配币别表得到，**匹配不到为 `-1`** |
| 有效期开始 | `validTimeStart` | DateTime? | ISO 8601 |
| 有效期结束 | `validTimeEnd` | DateTime? | ISO 8601 |
| 备注 | `remark` | string | 识别到的备注文本 |
| 箱型价格明细 | `seFreiPriceCtns` | array | 每行运价下的多个箱型价格（见下表） |

### 箱型价格明细（SeFreiPriceCtnDto）

| 字段 | JSON Key | 类型 | 说明 |
| :-- | :-- | :-- | :-- |
| 箱型名称 | `ctnName` | string | 识别到的箱型名（如 20GP、40HQ；识别时要求不带符号） |
| 箱型Id | `ctnCodeId` | long | `ctnName` 模糊匹配箱型表得到，**匹配不到为 `-1`** |
| 价格 | `price` | decimal? | 该箱型的运价 |

> 若模型未看到箱型名，提示词约定默认按列顺序回填：第一列 20GP、第二列 40GP、第三列 40HC、第四列 40NOR。

---

# 4. 名称→id 模糊匹配规则 (Field Mapping)

匹配策略统一为：先把待匹配文本与库内字段**归一化**（仅保留字母和数字并转大写，去除空格/标点/符号），先做**精确匹配**，未命中再做**双向包含匹配**（库值包含关键字 或 关键字包含库值）；仍未命中返回 `-1`（中转港名称为空时返回 `null`）。全程不抛异常。

归一化示例：`HO CHI MINH` → `HOCHIMINH`；`40'/HQ` → `40HQ`。

| 目标 | 参与匹配的字段 | 备注 |
| :-- | :-- | :-- |
| 港口（PODId/POT1Id/POT2Id） | `PortName`（英文名）、`CnName`（中文名）、`EdiCode`、`Explain`（说明） | 精确优先，含说明字段兜底 |
| 币别（CurrencyId） | 先按 `Symbol`（符号，原样去空格）匹配；再 `Code`、`CnName`、`EnName`、`Alias`；兜底 `Description` | 符号如 `$` 单独优先匹配 |
| 箱型（CtnCodeId） | `CtnName`（表现形式）、`EdiCode`、`CtnSize`、`CtnType` | 归一化后可兼容 `40'/HQ` 与 `40HQ` |

> 三张基础表（港口/币别/箱型）在单次请求内**一次性全量加载到内存**后做匹配，避免逐行查库。

---

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：匹配不到 id 返回 -1]** 港口/币别/箱型名称匹配不到系统数据时，对应 id 返回 `-1`（中转港名称为空返回 `null`），属正常情况，**不报错**。前端需在批量新建表单上高亮提示用户手动选择补录。

> [!IMPORTANT] **[卡点 2：识别准确性]** 大模型识别存在误差（尤其箱型名、币别、跨行合并的备注），结果仅作"预填"，前端务必允许用户校对修改后再提交批量新建。

> [!IMPORTANT] **[卡点 3：千问返回结构]** 千问 `response_format=json_object` 只能返回对象，故提示词要求 `{ "list": [...] }`；若模型偶发返回裸数组或换用别的包裹字段名，后端已做兼容（取第一个数组字段）。

---

# 6. 受影响的文件

| 文件 | 变更 |
| :-- | :-- |
| `App/AI/GeminiAdminAppService.cs` | 新增 `ExtractSeFreiPriceByPromptAsync()`（无参，内置提示词，gemini-3.5-flash）：文件 base64+gzip 上传识别 → 反序列化 → 调用 `SeFreiPriceMatchHelper` 回填 id；注入 PortCode/Currency/CtnCode 仓储；新增 `GetMimeType` 兜底 mime 判断 |
| `App/AI/IGeminiAdminAppService.cs` | 新增 `ExtractSeFreiPriceByPromptAsync()` 签名 |
| `App/AI/QwenAdminAppService.cs` | 新增 `ExtractSeFreiPriceByPromptAsync()`（无参，内置提示词，qwen-doc-turbo）：复用文件上传/等待解析流程 → `ParseSeFreiPriceList` 兼容解析 → 回填 id；注入 PortCode/Currency/CtnCode 仓储 |
| `App/AI/IQwenAdminAppService.cs` | 新增 `ExtractSeFreiPriceByPromptAsync()` 签名 |
| `App/AI/SeFreiPriceMatchHelper.cs` | 新增：共享静态匹配帮助类，港口/币别/箱型多字段模糊匹配 + `FillMatchedIds` 回填（Gemini/Qwen 共用，保证行为一致） |
| `App/AI/Dto/GeminiDto.cs` | 新增 `GeminiSeFreiPriceDto`（含 PodName/PODId、POT1/POT2、CurrencyCode/CurrencyId、有效期、Remark、SeFreiPriceCtns）与 `SeFreiPriceCtnDto`（CtnName/CtnCodeId/Price） |

---

# 7. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 | 🤖 代码解析与架构洞察 |
| :-- | :-- | :-- | :-- |
| 2026-07-16 | `Feature` | 新增运价"AI 识别批量新建"：Gemini/千问各一个接口，上传文件识别运价多行数据，并把港口/币别/箱型名称模糊匹配为系统 id（匹配不到返回 -1，不报错），返回 `List<GeminiSeFreiPriceDto>` 供前端批量预填 | 匹配逻辑抽为 `SeFreiPriceMatchHelper` 共享静态类，两服务复用；归一化仅保留字母数字并大写以兼容 `HO CHI MINH`/`40'/HQ` 等格式差异；三张基础表一次性全量载入内存匹配；千问 json_object 只能返回对象，提示词约定 `{list:[...]}` 并做兼容解析；实体类型名与 `CsprojBuilder.App.*` 命名空间冲突，使用 `Entites.` 前缀限定 |
