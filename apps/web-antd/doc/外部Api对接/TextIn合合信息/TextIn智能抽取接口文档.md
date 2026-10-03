---
title: TextIn 智能抽取（海运出口）对接
module: 外部Api对接
author: 后端
last_updated: 2026-06-18
---

# 1. 业务背景说明 (Background)

**白话解释：** 用户上传一份海运出口相关单证（提单/订舱单等），系统**不保存原文件**，按文件**内容 MD5** 判断是否已抽取过：已抽取则直接返回缓存结果，未抽取则调用 TextIn 接口解析，并将抽取结果写入缓存表。同一文件**改名后** MD5 与文件大小不变，仍会命中缓存、不重复调用 API。

- v3 文档：https://docs.textin.com/api-reference/endpoint/extract-v3
- v2 文档：https://www.textin.com/document/legacy/open_kie_vlm_engine

---

# 2. 功能与操作说明 (Features & Operations)

- **海运出口智能抽取 v3：** `ExtractSeaExportAsync` → TextIn v3 schema 模式
- **海运出口智能抽取 v2：** `ExtractSeaExportV2Async` → TextIn v2 **prompt 模式**（从 `llm_json` / `raw_json` 提取目标字段）

流程：前端 `multipart/form-data` 上传文件 → 后端计算 MD5 → 命中缓存则直接返回 → 未命中则调用对应版本 API → 缓存结果。v3 与 v2 **缓存相互独立**（`ExtractType` 分别为 `SeaExport` / `SeaExportV2`）。

### 去重规则

| 项       | 说明                                                     |
| :------- | :------------------------------------------------------- |
| 去重主键 | 文件内容 `FileMd5` + `ExtractType` + `SchemaVersion`     |
| 辅助校验 | `FileSize`（字节），与 MD5 一并校验                      |
| 改名影响 | **无影响**。MD5 和文件大小只由文件内容决定，与文件名无关 |
| 字段变更 | `SchemaVersion` 递增后，旧缓存自动失效，会重新调用 API   |

---

# 3. 接口说明 (API)

## ExtractSeaExportAsync（v3）

- **接口地址：** `POST /api/services/app/TextInAdmin/ExtractSeaExportAsync`
- **TextIn API：** `POST /ai/service/v3/entity_extraction`
- **请求方式：** `multipart/form-data`（表单文件上传，取第一个文件）
- **缓存标识：** `ExtractType=SeaExport`，`SchemaVersion=2`
- **支持格式：** png, jpg, jpeg, pdf, bmp, tiff, webp, doc, docx, xls, xlsx, ofd 等（以 TextIn 支持范围为准）

## ExtractSeaExportV2Async（v2）

- **接口地址：** `POST /api/services/app/TextInAdmin/ExtractSeaExportV2Async`
- **TextIn API：** `POST /ai/service/v2/entity_extraction`（**prompt 模式**）
- **请求体：** `{ "file": "base64...", "prompt": "..." }`（不传 fields）
- **响应解析：** 从 `result.llm_json` 提取字段值，从 `result.raw_json` 提取定位；仅保留 31 个目标中文字段
- **请求方式：** `multipart/form-data`（表单文件上传，取第一个文件）
- **缓存标识：** `ExtractType=SeaExportV2`，`SchemaVersion=2`
- **支持格式：** 同 v3

### 请求参数（两个接口相同）

| 参数 | 位置      | 类型 | 必填 | 说明                                     |
| :--- | :-------- | :--- | :--- | :--------------------------------------- |
| file | form-data | file | 是   | 待解析的单证文件，仅取表单中的第一个文件 |

### 返回字段（TextInExtractResultDto）

| 字段名 | 类型 | 说明 |
| :-- | :-- | :-- |
| code | int | TextIn 业务状态码，200 为成功 |
| message | string | 成功或错误信息 |
| version | string | 引擎版本号 |
| duration | int | 总耗时(ms) |
| status | string | 处理状态 |
| extractedSchema | object | 抽取出的海运出口字段（字段名 -> 值） |
| citations | object | 字段定位信息（字段名 -> 定位对象，见下） |
| isFromCache | bool | 是否来自缓存（true=未调用 TextIn API，直接返回历史结果） |

### citations 子对象（TextInFieldCitationDto）

| 字段名          | 类型   | 说明                                 |
| :-------------- | :----- | :----------------------------------- |
| value           | string | 字段值                               |
| boundingRegions | array  | 字段在原文中的位置区域（可能跨多处） |

### boundingRegions 子项（TextInBoundingRegionDto）

| 字段名 | 类型 | 说明 |
| :-- | :-- | :-- |
| pageNumber | int | 页码（从 1 开始） |
| position | int[] | 位置坐标，四个角点的 8 个数值 [x1,y1,x2,y2,x3,y3,x4,y4] |
| text | string | 该位置对应的原文文本 |

### 海运出口抽取字段 schema

`extractedSchema` 与 `citations` 的字段 key 均为**中文**，共 31 个：

| 字段名     |
| :--------- |
| 船公司     |
| 船名       |
| 航次       |
| 船代       |
| 订舱编号   |
| 主提单号   |
| 签单方式   |
| 签单地点   |
| 签单日期   |
| 发货人     |
| 收货人     |
| 通知人     |
| 货好日期   |
| 开船日期   |
| 起运港代码 |
| 起运港名称 |
| 目的港代码 |
| 目的港名称 |
| 品名       |
| 唛头       |
| 货物描述   |
| 件数       |
| 包装       |
| 毛重kgs    |
| 体积cbm    |
| 运输条款   |
| 贸易条款   |
| 委托单位   |
| 交货港代码 |
| 交货地名称 |
| 箱型箱量   |

### 缓存表 App_AiExtractRecords（2026-08-14 起，原 App_TextInExtractRecords）

TextIn 与 Gemini 等各识别服务**共用同一张缓存表**。

| 字段名 | 类型 | 说明 |
| :-- | :-- | :-- |
| Id | bigint | 主键 |
| Provider | nvarchar(32) | 识别服务商：`TextIn` / `Gemini` |
| SceneCode | nvarchar(64) | 识别场景：`SeaExport` / `SeaImport` / `PreOrder` / `SeFreiPrice` |
| SchemaVersion | nvarchar(32) | 抽取字段或提示词版本，递增后旧缓存自动失效 |
| SourceMd5 | nvarchar(32) | 输入内容 MD5，文件取文件内容、文字取文字内容 |
| SourceSize | bigint | 输入内容字节数 |
| ResultJson | nvarchar(max) | 识别结果 JSON |

唯一索引：`(SourceMd5, Provider, SceneCode, SchemaVersion)`

> 需自行执行 EF Migration 创建该表。

> [!IMPORTANT] **缓存写入走独立工作单元，不要改成跟随外层事务。** `SaveExtractCacheAsync` 的 `UnitOfWorkManager.Begin` 带 `Scope = RequiresNew` + `IsTransactional = false`，单独提交这一行。原因：写缓存发生在私有方法 `ExtractByFieldsV3Async` 里，而公开方法 `ExtractSeaExportToAddDtoAsync` / `ExtractSeaImportToAddDtoAsync` / `ExtractAirExportToAddDtoAsync` / `ExtractPreOrderToAddDtoAsync` 在它之后还要做名称→Id 匹配与 DTO 组装，那一段抛错会被公开方法的 `catch (Exception)` 包成「xx抽取转换异常」并回滚外层事务。若并入外层工作单元，**已经付过钱的抽取结果会跟着回滚**，用户重传同一份文件又要再调一次 TextIn。缓存独立提交后，重传会命中缓存直接返回，报错照旧但不再重复花钱。

---

# 4. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：鉴权信息]** 鉴权信息从 `appsettings.json` 的 `TextIn:AppId` / `TextIn:SecretCode` 读取（通过 `AppConfigurationManager.AppSettings`）。上线前需把占位符替换为真实的 `x-ti-app-id` / `x-ti-secret-code`；未配置时接口会抛出 “未配置 TextIn 鉴权信息” 的友好提示。

> [!IMPORTANT] **[卡点 2：HttpClient 注册]** 依赖 `Startup` 中注册的命名 HttpClient `"TextIn"`（BaseAddress = `https://api.textin.com`，超时 120s）。

---

# 5. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 | 🤖 代码解析与架构洞察 |
| :-- | :-- | :-- | :-- |
| 2026-06-18 | `Feature` | 新增 TextIn 海运出口智能抽取对接接口（上传不入库，返回字段+定位） | 新建 `App/ExternalApi/TextIn/` 模块（外部Api对接文件夹）；复用 Gemini 的表单文件读取 + Base64 模式；在 `Startup` 注册命名 HttpClient `TextIn` |
| 2026-06-18 | `Feature` | 新增抽取结果缓存：按文件内容 MD5 去重，改名仍命中缓存 | 新增实体 `TextInExtractRecord` / 表 `App_TextInExtractRecords`；返回 `isFromCache` 标识 |
| 2026-06-18 | `Feature` | 新增 TextIn v2 海运出口抽取接口 `ExtractSeaExportV2Async`，保留 v3 接口 | v2 使用自定义 key（fields）模式；v3/v2 缓存独立（`SeaExport` / `SeaExportV2`） |
| 2026-08-09 | `Enhancement` | `ExtractSeaExportToAddDtoAsync` 起运港/目的港回填 `pOLRemark`/`pODRemark`（`PortName, CountryEnName`） | 详见 `TextIn智能抽取转新建Dto.md` 4.4.1 |

---

# 6. 修改文件清单

| 文件 | 路径 | 修改类型 |
| :-- | :-- | :-- |
| 抽取结果DTO | `Application/App/ExternalApi/TextIn/Dto/TextInExtractResultDto.cs` | 新增 |
| 接口 | `Application/App/ExternalApi/TextIn/ITextInAdminAppService.cs` | 新增 |
| 服务实现 | `Application/App/ExternalApi/TextIn/TextInAdminAppService.cs` | 新增 |
| HttpClient 注册 | `Web.Host/Startup/Startup.cs` | 新增 `TextIn` 命名客户端 |
| 配置 | `Web.Host/appsettings.json` | 新增 `TextIn` 节点（AppId / SecretCode） |
| 缓存实体 | `Core/Entites/TextInExtractRecord.cs` | 新增 |
| DbContext | `EntityFrameworkCore/CsprojBuilderDbContext.cs` | 新增 DbSet 与唯一索引 |
