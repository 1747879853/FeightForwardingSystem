---
title: 海运出口列表列头排序字段映射（DTO → 实体路径）
module: 海运出口
author: auto-doc-sync
last_updated: 2026-07-11
---

# 海运出口列表列头排序字段映射（DTO → 实体路径）

## 背景意图

海运出口列表 `GetPagedList` 的 `sorting` 参数作用于 **`SeaExport` 实体**（数据库查询层），而非返回的 `SeaExportDto`。此前列头默认对所有列启用远程排序，点击「订舱代理」「船公司」「港口」等以 DTO 后填充 `*Name` 命名的列时，后端 `QueryableSortingExtensions.ApplySorting` 会在实体上反射找不到属性而抛错（如「无法在类型『SeaExport』上找到属性『BookingAgentName』」），触发前端「该列不支持排序」提示并回退默认排序，体验不佳。

本次将这些展示列的排序路径映射到真实实体导航属性，并对无法排序的计算/集合/后填充列显式关闭排序。

## 核心逻辑变更

### 1. `list.vue`：扩充 `createPagedListQuery` 的 `fieldMap`

将 DTO 列字段映射到实体排序路径（`resolveSortingField` 优先读 `fieldMap`）：

| 列（DTO 字段） | sorting 路径 | 来源 |
| :-- | :-- | :-- |
| `transportOrder.clientName` | `TransportOrder.Client.Name` | 原有 |
| `transportOrder.codeSourceName` | `TransportOrder.CodeSource.CnName` | 文档确认 |
| `transportOrder.codeFrtName` | `TransportOrder.CodeFrt.CnName` | 文档确认 |
| `carrierCode`（船公司） | `Carrier.CnName` | 文档确认 |
| `bookingAgentName` | `BookingAgent.Name` | 文档确认 |
| `polName` | `POL.PortName` | 文档确认 |
| `podName` | `POD.PortName` | 文档确认 |
| `codeIssueTypeName` | `CodeIssueType.BillType` | 文档确认 |
| `laneName` | `POD.Lane.LaneName` | 文档确认（取目的港关联航线） |
| `receivePortName` | `ReceivePort.PortName` | 按 EF `[ForeignKey("XxxId")]→Xxx` 约定推断 |
| `poT1Name` | `POT1.PortName` | 同上 |
| `poT2Name` | `POT2.PortName` | 同上 |
| `deliverPortName` | `DeliverPort.PortName` | 同上 |

### 2. `data.ts`：对不可排序列显式 `sortable: false`

按后端「DTO 计算/集合/后填充字段不可参与实体排序」的口径关闭以下列的列头排序，避免点击后报错回退：

- 计算列：`transportOrder.totalCtn`（按箱型分组拼接）、`transportOrder.teu`（关联 `CtnCode.TEU` 求和）
- `OrderUsers` 集合派生：`operationUserName`、`saleUserName`、`customerServiceUserName`、`documentationUserName`、`businessUserName`
- 集合/后填充：`companys`、`creatorUserNickName`
- 带 content 兜底的 DTO `*Name`：`transportOrder.shipperName`、`transportOrder.consigneeName`、`transportOrder.notifierName`
- 文档点名不可排：`transportOrder.codePackageName`

（`businessStatus`、`receiveFeeStatus`、`payFeeStatus`、`yundangTrackStatus` 原本即为 `sortable: false`。）

## 避坑指南

1. **排序作用于实体不是 DTO**：新增可排序列时，若列字段是 DTO 后填充的 `*Name`，必须在 `fieldMap`（或列 `sortField`）里映射到实体导航路径，否则后端反射报错。
2. **端口导航属性命名**：`receivePortId/poT1Id/poT2Id/deliverPortId` 对应实体导航属性推断为 `ReceivePort/POT1/POT2/DeliverPort`，端口名属性统一为 `PortName`。若后端实际命名不同需按实调整；即便不符，前端也仅回退 `CreationTime DESC` 不崩。
3. **Dynamic LINQ 大小写不敏感**：`camelToPascal` 自动生成的路径（如 `TransportOrder.Etd`）能命中实体 `ETD`，无需为真实实体字段单独配 `fieldMap`。
4. **计算/聚合列必须 `sortable: false`**：否则点击列头会 500 并回退默认排序。
