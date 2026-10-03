---
title: TextIn 智能抽取转新建海运出口Dto（名称转id）
module: 外部Api对接
author: 后端
last_updated: 2026-08-09
---

# 1. 业务背景说明 (Background)

**白话解释：** 原 `ExtractSeaExportAsync` 抽取出来的全是**文本**（船公司名、港口名、委托单位名、箱型箱量字符串等），而前端“新建海运出口”表单需要的是各种**id**（船公司id、港口id、委托单位id…）。本次在 `TextInAdmin` 控制器新增一个方法 `ExtractSeaExportToAddDtoAsync`：上传同一份文件，内部复用 `ExtractSeaExportAsync` 完成识别，再加一步**名称→id 转换**，直接返回前端可用的 `SeaExportAddDto`，匹配不到的 id 留空由前端补录。

---

# 2. 功能与操作说明 (Features & Operations)

- **抽取并转换为新建Dto：** `ExtractSeaExportToAddDtoAsync` → 复用 v3 抽取（含其缓存）→ 名称匹配 id → 返回 `SeaExportAddDto`。

流程：前端 `multipart/form-data` 上传文件 → 后端调用 `ExtractSeaExportAsync` 得到字段文本 → 按各引用表名称字段匹配 id → 组装 `SeaExportAddDto` 返回。

---

# 3. 接口说明 (API)

## ExtractSeaExportToAddDtoAsync

- **接口地址：** `POST /api/services/app/TextInAdmin/ExtractSeaExportToAddDtoAsync`
- **请求方式：** `multipart/form-data`，表单内放一个文件（取第一个文件）
- **入参：** 无 DTO，文件从请求表单读取（与 `ExtractSeaExportAsync` 一致）
- **出参：** `SeaExportExtractAddDto`，包含两部分：

| 字段 | JSON Key | 类型 | 说明 |
| :-- | :-- | :-- | :-- |
| SeaExport | `seaExport` | `SeaExportExtractFormDto` | 新建海运出口输入Dto（箱型箱量含 `ctnName`、`codePackageName`） |
| Extract | `extract` | `TextInExtractResultDto` | 原始抽取结果：`extractedSchema`（字段抽取文本）、`citations`（**定位信息**，按中文字段名索引，含 `value`/`boundingRegions[].pageNumber`/`position`/`text`）、`isFromCache` 等 |

> 说明：识别本身复用 v3（命中文件内容 MD5 缓存时不重复调用 TextIn）。`extract.citations` 即每个字段在原文中的页码与坐标定位，前端可据此做高亮/溯源校对。

### 定位信息结构（citations）

`citations` 为 `字段中文名 -> 定位` 字典，每项：

| 字段 | JSON Key | 类型 | 说明 |
| :-- | :-- | :-- | :-- |
| 字段值 | `value` | string | 抽取文本值 |
| 定位区域 | `boundingRegions` | array | 可能跨多处 |
| └ 页码 | `pageNumber` | int | 从 1 开始 |
| └ 坐标 | `position` | int[] | 四角点 8 个数值 [x1,y1,x2,y2,x3,y3,x4,y4] |
| └ 原文 | `text` | string | 该位置对应的原文文本 |

---

# 4. 名称→id 匹配规则 (Field Mapping)

匹配策略：取输入名称去空白后，先在引用表对应**名称字段**做**精确匹配**（数据库默认大小写不敏感），未命中再做**包含匹配**；仍未命中则该 id 返回空。

## 4.1 海运出口（SeaExport）字段

| 抽取字段 | 目标字段 | 类型 | 匹配的引用表/名称字段 |
| :-- | :-- | :-- | :-- |
| 船名 | `vessel` | string | 直接文本，无需匹配 |
| 航次 | `innerVoyno` | string | 直接文本，无需匹配 |
| 船公司简称 | `carrierId` | long? | `Carrier`：**CnShortName**（船公司简称）；匹配不到不报错，返回空 |
| 船代 | `shipAgentId` | Guid? | `Client`：**EnName**（英文名） |
| 签单方式 | `codeIssueTypeId` | long? | `CodeIssueType`：BillType/EnName |
| 签单地点 | `signingPortId` | long? | `PortCode`：**PortName**（港口英文名称） |
| 签单日期 | `signingTime` | DateTime? | 日期解析 |
| 起运港名称/起运港代码 | `pOLId` / `pOLRemark` | long? / string | `PortCode`：**PortName** + 国家；见 4.4；备注见 4.4.1 |
| 目的港名称/目的港代码 | `pODId` / `pODRemark` | long? / string | `PortCode`：**PortName** + 国家；见 4.4；备注见 4.4.1 |
| 交货地名称/交货港代码 | `deliverPortId` | long? | `PortCode`：**PortName** + 国家；见 4.4 |

> 注：本次新增抽取字段 **船公司简称**；船公司id 改为**通过船公司简称匹配 `Carrier.CnShortName`**（原“船公司”全名仍会抽取返回文本，但不再用于匹配 id）。

## 4.2 业务（TransportOrder）字段（放入 `transportOrder` 子对象）

| 抽取字段 | 目标字段 | 类型 | 匹配的引用表/名称字段 |
| :-- | :-- | :-- | :-- |
| （固定） | `bizType` | enum | 固定为 `SeaExport` |
| 主提单号 | `mblNum` | string | 直接文本 |
| 订舱编号 | `bookingNum` | string | 直接文本 |
| 委托单位 | `clientId` | Guid | `Client`：**EnName**（英文名，匹配不到为 `Guid.Empty`） |
| 收货人 | `consigneeContent` | string | 直接文本 |
| 发货人 | `shipperContent` | string | 直接文本 |
| 通知人 | `notifierContent` | string | 直接文本 |
| 唛头 | `marks` | string | 直接文本 |
| 货物描述 | `goodsDes` | string | 直接文本 |
| 件数 | `pKGS` | int? | 数字解析 |
| 毛重kgs | `kgs` | decimal? | 数字解析 |
| 体积cbm | `cbm` | decimal? | 数字解析 |
| 货好日期 | `goodsCompleteTime` | DateTime? | 日期解析 |
| 开船日期 | `eTD` | DateTime? | 日期解析 |
| 包装 | `codePackageId` | long? | `CodePackage`：Name |
| 运输条款 | `codeServiceId` | long? | `CodeService`：**EnName**（英文名） |
| 贸易条款 | `tradeTermsType` | enum? | 按**枚举名**匹配（CIF/FOB/EXW/FCA…，忽略大小写，支持包含匹配） |
| 品名 | `orderCodeGoodss` | list | 按 逗号/顿号/分号/斜杠/换行 拆分，逐个匹配 `CodeGoods`：**EnName**（英文名） |
| 箱型箱量 | `orderCtns` | list | 见 4.3 / 4.5 |

## 4.3 箱型箱量解析说明（简写格式）

- 先按 空格/逗号/顿号/分号/加号 拆分为多段；
- 每段再按 `*` `x` `X` `×` 拆为“数量 + 箱型名”，纯数字一侧识别为数量（如 `40HQ*2`、`2*40HQ`、`1X40HC`），无分隔默认数量为 1；
- 箱型名匹配 `CtnCode.CtnName`（或 EdiCode），匹配成功则按数量展开为多条 `OrderCtnAddDto`；匹配不到的段跳过。

## 4.5 集装箱详细信息解析说明

当识别文本同时包含 `CBM` 与 `KGS` 字段时，按**详细格式**解析（优先于简写格式）。每条记录固定 7 个字段，以空格分隔，顺序如下：

| 顺序 | 字段 | 映射目标 | 说明 |
| :-- | :-- | :-- | :-- |
| 1 | 箱型 | `ctnCodeId` | 匹配 `CtnCode.CtnName`/`EdiCode`，逻辑同简写格式 |
| 2 | 箱号 | `ctnNo` | 直接文本 |
| 3 | 封号 | `sealNo` | 直接文本 |
| 4 | 件数 | `pKGS` | 整数 |
| 5 | 包装 | `codePackageId` | **完全相等**匹配 `CodePackage.Name` |
| 6 | 尺码 | `volume` | 去掉末尾 `CBM` 后解析数字 |
| 7 | 重量 | `grossWeight` | 去掉末尾 `KGS` 后解析数字 |

示例：`20GP WFLU2012939 WFL214471 1974 ROLLS 28.000CBM 12905.200KGS`

- 多箱记录按换行分隔，同一行内也可连续排列多组 7 字段；
- 箱型匹配不到则跳过该条；包装匹配不到时 `codePackageId` 留空，其余字段仍回填；
- 返回使用 `OrderCtnExtractAddDto`（继承 `OrderCtnAddDto`），额外携带 `ctnName`（箱型名）、`codePackageName`（包装名）；匹配到基础数据时取库内名称，否则回填识别文本。

## 4.4 港口名称匹配说明

抽取的港口名称常见格式为 `QINGDAO, CHINA`（港口名 + 逗号 + 国家名），匹配规则如下：

1. 以**最后一个逗号**为分割线，前半部分为港口名，后半部分为国家名；
2. 港口名去首尾空白后，精确匹配 `PortCode.PortName`；
3. 若仅匹配出**一条**港口记录，直接返回该港口 id，**不再校验国家**；
4. 若匹配出**多条**港口记录，国家名去掉所有空格后，与关联国家表 `Country.CountryEnName` 去掉空格后的字符串精确匹配，用于缩小范围；
5. 仍未命中时，依次尝试 `EdiCode` 精确匹配、 `PortName` 包含匹配。

### 4.4.1 起运港/目的港备注回填

匹配到港口后，同步回填备注字段（匹配不到港口时备注也为空）：

| 目标字段 | JSON Key | 取值来源 | 格式 |
| :-- | :-- | :-- | :-- |
| 起运港备注 | `pOLRemark` | 命中港口的 `PortCode.PortName` + 关联 `Country.CountryEnName` | `PortName, CountryEnName`（如 `QINGDAO, CHINA`） |
| 目的港备注 | `pODRemark` | 同上 | 同上 |

> 缺一侧时只返回有值的一侧；两边都空则返回 `null`。签单地点、交货地本次不回填备注。

---

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：匹配不到 id]** 名称匹配不到时对应 id 返回空（`clientId` 返回 `Guid.Empty`），属正常情况，需前端在表单上提示用户手动选择补录。

> [!IMPORTANT] **[卡点 2：识别准确性]** OCR/大模型抽取存在误差，转换结果仅作“预填”，前端务必允许用户校对修改后再提交新建。

---

# 6. 受影响的文件

| 文件 | 变更 |
| :-- | :-- |
| `App/ExternalApi/TextIn/TextInAdminAppService.cs` | 新增 `ExtractSeaExportToAddDtoAsync` 及取值/解析/名称匹配id 私有方法；注入 Carrier/PortCode/Client/CodeIssueType/CodePackage/CodeService/CodeGoods/CtnCode 仓储；返回 `SeaExportExtractAddDto`（含定位信息） |
| `App/ExternalApi/TextIn/ITextInAdminAppService.cs` | 新增 `ExtractSeaExportToAddDtoAsync` 签名 |
| `App/ExternalApi/TextIn/Dto/SeaExportExtractAddDto.cs` | 新增：包装 `SeaExportAddDto` + `TextInExtractResultDto`(含 citations 定位信息) |

---

# 7. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 | 🤖 代码解析与架构洞察 |
| :-- | :-- | :-- | :-- |
| 2026-06-27 | `Feature` | TextIn 新增“抽取并转换为新建海运出口Dto”接口，识别复用 `ExtractSeaExportAsync`，加一步名称→id 转换返回 `SeaExportAddDto` | 引用表名称字段：船公司CnName、港口PortName/CnName、委托单位/船代Name、签单方式BillType、包装Name、运输条款CnName、品名Name、箱型CtnName；实体类型名与 `CsprojBuilder.App.*` 命名空间冲突，需用 `Entites.` 前缀限定 |
| 2026-06-30 | `Feature` | 新增抽取字段“船公司简称”；船公司id 改为按船公司简称匹配 `Carrier.CnShortName`；港口改为匹配英文名 `PortCode.PortName`；品名/运输条款/委托单位(及船代)改为匹配英文名 `EnName`；贸易条款按枚举名匹配 | schema 版本(V3/V2)由 2→3 使旧缓存失效；新增字段后大模型需重新抽取 |
| 2026-07-08 | `Enhancement` | 港口名称支持 `港口名, 国家名` 格式：按最后逗号拆分，PortName 唯一命中时直接返回，多条时再按国家英文名(去空格)筛选 | `ResolvePortIdAsync` 先查 PortName 计数，count=1 跳过国家匹配 |
| 2026-07-08 | `Enhancement` | 箱型箱量支持详细格式解析：箱型 箱号 封号 件数 包装 尺码CBM 重量KGS；包装按 `CodePackage.Name` 完全相等匹配 | `ResolveOrderCtnsAsync` 检测 CBM+KGS 走详细解析，否则保留简写格式 |
| 2026-07-08 | `Enhancement` | 抽取返回箱型箱量扩展 `OrderCtnExtractAddDto`，携带 `ctnName`、`codePackageName` 供前端展示 | 新建 `OrderCtnExtractAddDto`/`TransportOrderExtractAddDto`/`SeaExportExtractFormDto` 继承原 Dto |
| 2026-08-09 | `Enhancement` | 起运港/目的港匹配成功后回填 `pOLRemark`/`pODRemark`，取港口表 `PortName` + `CountryEnName` | 新增 `ResolvePortAsync`/`BuildPortRemark`；`ResolvePortIdAsync` 复用前者仅取 Id |
