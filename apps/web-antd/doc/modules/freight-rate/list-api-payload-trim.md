---
title: 运价列表接口可裁剪字段
module: 航线管理 / 运价查询
author: 前端
last_updated: 2026-10-01
---

# 运价列表 `GetPagedListAsync` 多余字段裁剪说明

## 1. 目的

缩小 `SeFreiPriceAdmin/GetPagedListAsync` 返回体积，加快运价列表加载。  
本文依据前端 **列表展示、Excel 导出、生成报价、勾选进批量编辑** 的实际读字段整理。

| 项 | 值 |
| :-- | :-- |
| 接口 | `POST /api/services/app/SeFreiPriceAdmin/GetPagedListAsync` |
| 前端入口 | `apps/web-antd/src/views/freight-rate/list.vue` |
| 相关代码 | `data.ts`、`ctn-editable-cell.vue`、`build-freight-quote-text.ts`、`export-freight-rate-excel.ts` |

> **注意**
>
> - 双击进编辑弹窗走 `DetailAsync`，**详情接口不要跟着列表一起砍**。
> - 勾选「更新」进批量编辑时，前端目前 **直接使用列表行数据**，不另拉详情；裁剪前需确认批量编辑仍够用，或改为按 id 拉详情后再砍编辑专用字段。

---

## 2. 主表可整段去掉（列表链路未用）

| 字段 | 说明 |
| :-- | :-- |
| `lane` | 列表 / 导出 / 报价 / 批量编辑均未读 |
| `creatorUserId` | 只展示 `creatorUserName` |
| `lastModifierUserId` | 无列、无逻辑 |
| `lastModificationTime` | 无列、无逻辑 |
| `isValid` | 仅作**查询条件**，行上不展示；过期用 `validTimeEnd` 判断 |

---

## 3. 关联对象可瘦身（体积最大，优先做）

### 3.1 `carrier`

| 建议 | 字段 |
| :-- | :-- |
| **保留** | `id`、`code`、`cnShortName`、`cnName`、`enName`、`logo.url` |
| **可砍** | `otherCode`、`countryId`、`ediCode`、`remark`、`country`；`logo` 除 `url` 外全部（如 `attachmentId`、`friendlyFileName`、`fileLength`、创建人等） |

### 3.2 `pol` / `pod` / `poT1` / `poT2`

| 建议 | 字段 |
| :-- | :-- |
| **保留** | `id`、`portName`、`cnName`、`ediCode`；嵌套 `country.countryName`、`country.countryEnName` |
| **可砍** | `countryName`、`chau`、`explain`、`portType`、`countryId`、`laneId`、`laneCode`、`laneName`、`lane`、`statisticalArea`、`status` |

### 3.3 `country`（主表国家）

| 建议 | 字段 |
| :-- | :-- |
| **保留** | `countryName`、`countryEnName`、`code` |
| **可砍** | 其它。若与 `pod.country` 重复，可只保留主表 `country` 或只保留 `pod.country` 一侧 |

### 3.4 `currency`

| 建议     | 字段                           |
| :------- | :----------------------------- |
| **保留** | `id`、`code`、`name`、`symbol` |
| **可砍** | 已较精简，几乎不用再砍         |

### 3.5 `bookingAgent`

| 建议     | 字段                                                        |
| :------- | :---------------------------------------------------------- |
| **保留** | `id`、`name`                                                |
| **可砍** | `code`、`fullName`、`industryCategories` 及客户其它扩展字段 |

### 3.6 `seFreiPriceCtns[].ctnCode`

| 建议 | 字段 |
| :-- | :-- |
| **保留** | `id`、`ctnName` |
| **可砍** | `ctnSize`、`ctnType`、`cabinetType`、`ediCode`、`ctnWeight`、`cnExplain`、`enExplain`、`afrCode`、`limitWeight`、`teu`、`orderNo`、`status`、`isDefault`、`remark` |

### 3.7 `seFreiPriceFees[].feeCode`

| 建议 | 字段 |
| :-- | :-- |
| **保留** | `cnName`、`enName`（兜底可用 `feeCodeId`） |
| **可砍** | `code`、`currencyId`、`defaultUnit`、`defaultUnitName`、`isSea`、`isAir`、`isTrucking`、`isWms`、`enable`、`remark` 等 |

### 3.8 `seFreiPriceFees[].currency`

| 建议     | 字段           |
| :------- | :------------- |
| **保留** | `code`、`name` |
| **可砍** | 其它           |

---

## 4. 子表行内冗余

| 位置 | 可去掉 | 说明 |
| :-- | :-- | :-- |
| `seFreiPriceCtns[]` | `seFreiPriceId`；列表不展示的 `remark` | 主表已有 `id` |
| `seFreiPriceFees[]` | `seFreiPriceId` | 同上 |
| `seFreiPriceDays[]` | `id`、`seFreiPriceId` | 列表只用 `etd` / `closeDocTime` / `closingTime` |
| `seFreiPriceWeekDays[]` | `id`、`seFreiPriceId` | 列表只用开船 / 截单 / 截关的周几 + 时刻 |
| `seFreiPriceCtnFees[]` | （无整段可删） | 字段均参与附加费列拼装 |

箱型上以下字段 **必须保留**：

- `id`、`ctnCodeId`
- `cost`、`sugPrice`
- `costDelta`、`sugDelta`（列表涨跌徽标）
- 精简后的 `ctnCode`

---

## 5. 列表仍需保留的主表字段（勿砍）

- `id`
- `recommend`（列表无列，但勾选进批量编辑会带过去；若批量改前改为拉详情，才可从列表去掉）
- `carrierId`、`polId`、`podId`、`isDirect`、`poT1Id`、`poT2Id`
- `polFreeDays`、`podFreeDays`、`poddem`、`poddet`
- `voyage`、`vesselVoyage`、`contractNo`
- `validTimeStart`、`validTimeEnd`
- `remark`、`currencyId`、`bookingAgentId`
- `creationTime`、`creatorUserName`
- 上述精简后的关联对象
- 子表：`seFreiPriceCtns`、`seFreiPriceFees`、`seFreiPriceDays`、`seFreiPriceWeekDays`

---

##
