---
title: TextIn 业务联系单智能抽取（前端接口文档）
module: 外部Api对接 / TextIn合合信息
author: 后端
last_updated: 2026-09-14
---

# 1. 接口概览

上传一份单证（提单/订舱单/委托书等），后端调用 TextIn 智能抽取识别字段，并把识别出的**名称文本**匹配成系统内的 **id**，直接返回「新建业务联系单」表单可用的 `PreOrderAddDto`。匹配不到的 id 返回空，由前端提示用户手动补录，**匹配不到不报错**。

| 项目     | 内容                                                              |
| :------- | :---------------------------------------------------------------- |
| 方法     | `POST`                                                            |
| 接口地址 | `/api/services/app/TextInAdmin/ExtractPreOrderToAddDtoAsync`      |
| 请求格式 | `multipart/form-data`，取表单里的**第一个文件**（文件字段名不限） |
| 出参     | `PreOrderExtractAddDto`（见 3）                                   |
| 返回包装 | ABP 统一包一层 `result`                                           |
| 失败     | 统一抛 `UserFriendlyException`，前端按常规错误提示展示            |
| 耗时     | 首次识别通常 10~60 秒，前端务必给 loading 且不要设过短超时        |

---

# 2. 请求参数

| 字段名 | 位置 | 类型 | 必填 | 说明 |
| :-- | :-- | :-- | :-- | :-- |
| （文件） | form-data | File | 是 | 待识别的单证文件，取表单第一个文件。支持 png / jpg / jpeg / pdf / bmp / tiff / webp / doc / docx / xls / xlsx / ofd 等（以 TextIn 支持范围为准） |
| bizType | form-data 或 query | int | 否 | 业务类型：`0`=海运出口、`1`=海运进口、`2`=空运出口。不传默认 `0`；传枚举范围外的值报「业务类型不正确」 |

> [!IMPORTANT] `bizType` 是简单类型参数，**只能放 form 字段或 query，不能放 JSON body**（ABP 动态 WebApi 的绑定规则，同 `GeminiAdmin/ExtractSeFreiPriceByPromptAsync` 的 `text`）。放 JSON body 会绑不到值，被当作没传按海运出口处理。

**调用示例：**

```javascript
const form = new FormData();
form.append('file', file);
form.append('bizType', 2); // 空运出口
await axios.post(
  '/api/services/app/TextInAdmin/ExtractPreOrderToAddDtoAsync',
  form,
);
```

query 写法：`/api/services/app/TextInAdmin/ExtractPreOrderToAddDtoAsync?bizType=2`

---

# 3. 返回结构 (PreOrderExtractAddDto)

| 字段 | JSON Key | 类型 | 说明 |
| :-- | :-- | :-- | :-- |
| PreOrder | `preOrder` | `PreOrderExtractFormDto` | 新建业务联系单输入Dto，已尽量回填 id |
| Extract | `extract` | `TextInExtractResultDto` | 原始抽取结果，含字段文本与定位坐标 |

## 3.1 preOrder（新建业务联系单表单）

结构继承 `PreOrderAddDto`，仅 `preOrderCtns` 被替换为带箱型名的扩展结构。下表列出**本接口会回填**的字段：

| 字段 | JSON Key | 类型 | 来源抽取字段 | 说明 |
| :-- | :-- | :-- | :-- | :-- |
| 业务类型 | `bizType` | int | 入参 | 原样回传前端传入的 `bizType`，AI 不做判断 |
| 委托单位id | `clientId` | Guid | 委托单位 | 匹配 `Client.EnName`；匹配不到为 `00000000-0000-0000-0000-000000000000` |
| 主提单号 | `mblNum` | string | 主提单号 | 直接文本 |
| 货好时间 | `goodsCompleteTime` | DateTime? | 货好日期 | 日期解析 |
| 开船日期 | `etd` | DateTime? | 开船日期 | 日期解析 |
| 船公司id | `carrierId` | long? | 船公司简称 | 匹配 `Carrier.CnShortName` |
| 船名 | `vessel` | string | 船名 | 直接文本。仅海运出口/海运进口使用，空运出口前端忽略 |
| 航次 | `innerVoyno` | string | 航次 | 直接文本。仅海运出口/海运进口使用，空运出口前端忽略 |
| 收货地id | `receivePortId` | long? | 收货地名称 / 收货地代码 | 海运匹配 `PortCode`，空运匹配 `AirPort`，见 4 |
| 收货地备注 | `receivePortRemark` | string | 同上 | `港口名, 国家英文名` |
| 起运港id | `polId` | long? | 起运港名称 / 起运港代码 | 同上 |
| 起运港备注 | `polRemark` | string | 同上 | 同上 |
| 目的港id | `podId` | long? | 目的港名称 / 目的港代码 | 同上 |
| 目的港备注 | `podRemark` | string | 同上 | 同上 |
| 交货地id | `deliverPortId` | long? | 交货地名称 / 交货港代码 | 同上 |
| 交货地备注 | `deliverPortRemark` | string | 同上 | 同上 |
| 付费方式id | `codeFrtId` | long? | 付费方式 | 匹配 `CodeFrt` 的 EnName / CnName / EdiCode |
| 运输条款id | `codeServiceId` | long? | 运输条款 | 匹配 `CodeService.EnName` |
| 贸易条款 | `tradeTermsType` | int? | 贸易条款 | 按枚举名匹配（CIF/FOB/EXW/FCA…） |
| 收货人内容 | `consigneeContent` | string | 收货人 | 直接文本 |
| 发货人内容 | `shipperContent` | string | 发货人 | 直接文本 |
| 通知人内容 | `notifierContent` | string | 通知人 | 直接文本 |
| 件数 | `pkgs` | int? | 件数 | 数字解析，自动去千分位 |
| 包装id | `codePackageId` | long? | 包装 | 匹配 `CodePackage.Name` |
| 毛重KGS | `kgs` | decimal? | 毛重kgs | 数字解析，自动去千分位（`162 600` → `162600`） |
| 体积CBM | `cbm` | decimal? | 体积cbm | 数字解析 |
| 商品信息 | `preOrderCodeGoodss` | array | 品名 | 见 3.2 |
| 箱型箱量 | `preOrderCtns` | array | 集装箱信息 | 见 3.3 |
| 关联用户 | `preOrderUsers` | array | — | 恒为空数组，由前端按登录人/选择填充 |

**不回填、需要前端自行处理的字段：** `orgId`（必填，前端取当前组织）、`blType`（默认 `0` 整箱）、`cargoId`（默认 `0` 普通货）、`pot1Id`/`pot2Id` 及其备注、`remark`、`consigneeId`/`shipperId`/`notifierId`、`bookingAgentId`、`teamId`、`preOrderServices`、`preOrderFees`、`attachmentGroup`。

## 3.2 preOrderCodeGoodss 子项

| 字段 | JSON Key | 类型 | 说明 |
| :-- | :-- | :-- | :-- |
| 商品信息id | `codeGoodsId` | long | 品名文本按 逗号/顿号/分号/斜杠/换行 拆分后逐个匹配 `CodeGoods.EnName`，匹配不到的不生成行 |

## 3.3 preOrderCtns 子项 (PreOrderCtnExtractAddDto)

逐箱识别结果会**按箱型汇总**成「箱型 + 箱量」，业务联系单不记箱号封号。

| 字段 | JSON Key | 类型 | 说明 |
| :-- | :-- | :-- | :-- |
| 箱型id | `ctnCodeId` | long | 匹配 `CtnCode.CtnName`/`EdiCode`；匹配不到为 `0`，需前端补选 |
| 箱型名称 | `ctnCodeName` | string | **扩展字段**，匹配到取库内箱型名，否则回填识别原文（如 `20DC`） |
| 箱量 | `count` | int | 同箱型的箱数汇总 |
| 指导价 | `sugPrice` | decimal? | 恒为 null，单证上没有 |
| 卖价 | `price` | decimal? | 恒为 null |
| 货重 | `weight` | decimal? | 恒为 null |
| 备注 | `remark` | string | 恒为 null |

## 3.4 extract（原始抽取结果 TextInExtractResultDto）

| 字段 | JSON Key | 类型 | 说明 |
| :-- | :-- | :-- | :-- |
| 状态码 | `code` | int | TextIn 业务状态码，200 为成功 |
| 信息 | `message` | string | 成功或错误信息 |
| 版本 | `version` | string | 引擎版本号 |
| 耗时 | `duration` | int | 总耗时(ms) |
| 状态 | `status` | string | 处理状态，正常为 `finished` |
| 抽取字段 | `extractedSchema` | object | 中文字段名 -> 值，见 3.5 |
| 定位信息 | `citations` | object | 中文字段名 -> 定位对象，见 3.6 |
| 是否缓存 | `isFromCache` | bool | `true` 表示命中缓存、未重复调用 TextIn（不产生费用） |

## 3.5 extractedSchema 字段清单（业务联系单，27 个平铺字段 + 1 个数组字段）

| 字段名         | 类型   | 说明                                 |
| :------------- | :----- | :----------------------------------- |
| 船公司         | string | 船公司全称                           |
| 船公司简称     | string | 用于匹配 `carrierId`                 |
| 船名           | string | 回填 `vessel`                        |
| 航次           | string | 回填 `innerVoyno`                    |
| 主提单号       | string |                                      |
| 发货人         | string | 含地址、联系方式，跨页会合并         |
| 收货人         | string | 同上                                 |
| 通知人         | string | 同上                                 |
| 货好日期       | string |                                      |
| 开船日期       | string |                                      |
| 收货地名称     | string | 空运时为收货机场名                   |
| 收货地代码     | string | 空运时为机场三字码                   |
| 起运港代码     | string | 空运时为起运机场三字码               |
| 起运港名称     | string | 空运时为起运机场名                   |
| 目的港代码     | string | 空运时为目的机场三字码               |
| 目的港名称     | string | 空运时为目的机场名                   |
| 交货港代码     | string | 空运时为机场三字码                   |
| 交货地名称     | string | 空运时为交货机场名                   |
| 品名           | string | 多个品名同字段返回，后端拆分         |
| 件数           | string |                                      |
| 包装           | string | 不含数字                             |
| 毛重kgs        | string |                                      |
| 体积cbm        | string |                                      |
| 付费方式       | string | 如 FREIGHT PREPAID / FREIGHT COLLECT |
| 运输条款       | string |                                      |
| 贸易条款       | string |                                      |
| 委托单位       | string |                                      |
| **集装箱信息** | array  | 对象数组，逐箱一条，子字段见下       |

`集装箱信息` 每项的子字段（均为 string，抽不到为 null）：箱型、箱号、封号、件数、包装、尺码CBM、重量KGS、皮重KGS、净重KGS。业务联系单只用到其中的**箱型**做汇总，其余子字段仅在 `extract` 里返回供核对。

## 3.6 citations 定位结构

| 字段 | JSON Key | 类型 | 说明 |
| :-- | :-- | :-- | :-- |
| 字段值 | `value` | string | 抽取文本值 |
| 定位区域 | `boundingRegions` | array | 可能跨多处（跨页/跨行） |
| └ 页码 | `pageNumber` | int | 从 1 开始 |
| └ 坐标 | `position` | int[] | 四角点 8 个数值 `[x1,y1,x2,y2,x3,y3,x4,y4]` |
| └ 原文 | `text` | string | 该位置对应的原文文本 |

> `集装箱信息` 是数组字段，它的定位信息结构与平铺字段不同，后端只在 `value` 里放原始 JSON、`boundingRegions` 返回空数组，前端不要用它做高亮。

---

# 4. 空运与海运的港口区别（重要）

| bizType | 港口来源表 | 匹配顺序 |
| :-- | :-- | :-- |
| `0` 海运出口 / `1` 海运进口 | `PortCode`（海运港口） | 港口英文名 `PortName` 精确 → 多条时按国家 `CountryEnName` 收窄 → `EdiCode` → `PortName` 包含 |
| `2` 空运出口 | `AirPort`（空运港口/机场） | 三字码 `IataCode` → 英文名/中文名/城市/三字码精确 → 多条时按国家收窄 → 英文名/城市 包含 |

四个港口字段（收货地、起运港、目的港、交货地）都按上表切换来源。名称支持 `SHANGHAI, CHINA` 这种「地名 + 逗号 + 国家名」格式，按**最后一个逗号**拆分。

> [!IMPORTANT] **空运绝不能回填海运港口 id。** 两张表的 id 各自独立，混用会指向完全不相干的一条基础资料。前端下拉也要按 `bizType` 切换成机场数据源，否则会显示不出后端回填的 id。

---

# 5. 核心业务卡点

> [!IMPORTANT] **[卡点 1：id 匹配不到是正常情况]** 匹配不到时 id 返回空（`clientId` 为空 Guid、`ctnCodeId` 为 `0`），不报错。前端需在表单上高亮提示用户手动补录，`ctnCodeName` 等扩展名称字段可直接展示识别原文帮助用户确认。

> [!IMPORTANT] **[卡点 2：识别结果只是预填]** OCR/大模型存在误差，务必让用户核对后再提交新建。`extract.citations` 提供页码与坐标，可用于原文高亮溯源。

> [!IMPORTANT] **[卡点 3：缓存与费用]** 同一份文件（按内容 MD5 + 文件大小去重，与文件名无关）第二次上传直接返回缓存，不再调用 TextIn、不产生费用，`isFromCache` 为 `true`。缓存落在通用表 `App_AiExtractRecords`，本场景标识为 `Provider=TextIn`、`SceneCode=PreOrder`、`SchemaVersion=3`，与海运出口/进口的缓存互相独立。抽取字段或提示词调整后版本号会递增，旧缓存自动失效、需要重新识别一次。

> [!IMPORTANT] **[卡点 4：bizType 不能放 JSON body]** 见 2 的说明。另外传了范围外的值会直接报错，不会静默按海运出口处理。

---

# 6. 变更日志

| 日期 | 变更类型 | 说明 |
| :-- | :-- | :-- |
| 2026-09-14 | `Feature` | 抽取字段补「船名/航次」，回填 `vessel`/`innerVoyno`；`SchemaVersion` 升到 3（旧缓存失效）。车队 `teamId` 单证上通常没有，仍不抽取 |
| 2026-08-14 | `Feature` | 新增业务联系单智能抽取接口 `ExtractPreOrderToAddDtoAsync`；支持 `bizType`，空运出口的港口改走 `AirPort` 表 |
