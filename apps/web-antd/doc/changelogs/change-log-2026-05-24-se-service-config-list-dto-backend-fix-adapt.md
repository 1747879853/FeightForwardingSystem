# 海运出口港口服务项配置 — 前端适配后端列表 DTO 重构

**日期：** 2026-05-24  
**变更类型：** Fix  
**影响模块：** 基础资料 / 海运出口港口服务项配置

---

## 背景意图

后端修复了 `GetPagedListAsync` 的两个 Bug：

1. **列表重复显示**：原实现以 `SeServiceConfigItem`（服务项子表）为分页主体，`SelectMany` 展开后每个服务项生成一行，导致新建 1 个主配置 + 2 个服务项后列表出现 2 行。
2. **软删除数据泄露**：`.Include()` 加载子项后，内存遍历未过滤 `IsDeleted = 1` 的记录。

后端将列表接口返回结构从 `SeServiceConfigItemListDto`（子项级别）切换为新增的 `SeServiceConfigListDto`（主配置级别），并在所有子集合遍历处补充 `!IsDeleted` 过滤。

前端本次变更与之对齐。

---

## 核心逻辑变更

### 1. API 类型定义（`se-service-config-admin.ts`）

| 变更项 | 内容 |
| --- | --- |
| `SeServiceConfigItemListDto` | 移除 `polId`、`portName`、`pol` 字段（已提升到父级 DTO） |
| 新增 `SeServiceConfigListDto` | 主配置级别 DTO，包含 `id`、`polId`、`pol`、`sortId`、`remark`、`serviceItemCount`、`serviceTypes`（类型数组）、`seServiceConfigItems`（子项列表）、`creationTime` 等 |
| `PagedListOfSeServiceConfigItemListDto` | 重命名为 `PagedListOfSeServiceConfigListDto`，`items` 元素类型变为 `SeServiceConfigListDto` |
| `getSeServiceConfigPagedList` 返回类型 | 由 `PagedListOfSeServiceConfigItemListDto` 改为 `PagedListOfSeServiceConfigListDto` |

### 2. 列表列定义（`data.ts`）

从"每行 = 一个服务项"切换为"每行 = 一个主配置"：

| 字段               | 说明                                              |
| ------------------ | ------------------------------------------------- |
| `pol`              | 起运港，优先取 `portName`，兼容 `cnName`          |
| `serviceTypes`     | 所有服务项类型名称，逗号分隔（通过枚举 Map 转换） |
| `serviceItemCount` | 服务项数量（仅计算未删除）                        |
| `sortId`           | 排序                                              |
| `creationTime`     | 创建时间                                          |

删除了原来子项级别的 `userAttribute`、`autoComplete`、`manualAllowed`、`reminder` 等列。

### 3. 列表页（`list.vue`）

| 变更项 | 原值 | 新值 |
| --- | --- | --- |
| 行类型 | `SeServiceConfigItemListDto` | `SeServiceConfigListDto` |
| 编辑时传入 id | `row.seServiceConfigId` | `row.id` |
| 删除时传入 id | `row.seServiceConfigId` | `row.id` |
| `getRowName` 兜底 | `row.seServiceConfigId` | `row.id` |
| 编辑时传入港口信息 | `row.portName \|\| row.pol?.portName` | `row.pol?.portName` |
| 列表 query handler | 额外做 serviceTypeText 映射 | 直接返回接口结果（枚举映射下沉到列定义的 formatter） |

### 4. i18n（`zh-CN/system.json`、`en-US/system.json`）

新增 `serviceItemCount` 翻译键（中文：服务项数量，英文：Service Item Count）。

---

## 影响范围

| 影响项 | 说明 |
| --- | --- |
| 列表 `totalCount` 语义 | 由"服务项总数"变为"主配置总数" |
| 列表行数 | 原每个服务项占一行，现每个主配置占一行，含 `seServiceConfigItems` 子列表（按需展开） |
| ServiceType 筛选 | 原筛选子项行，现筛选"包含该服务类型的主配置" |
| 软删除子项 | 后端已过滤，前端不再看到 `IsDeleted = 1` 的子项 |
| 新增/编辑/删除接口 | 无变更 |

---

## 避坑指南

1. **编辑弹窗传参变更**：原来通过 `row.seServiceConfigId` 获取主配置 ID，现在直接使用 `row.id`，切勿混用。
2. **`SeServiceConfigItemListDto` 仍存在**：它作为 `SeServiceConfigListDto.seServiceConfigItems` 的子集合元素，若需展开展示子项（如折叠行）仍可使用，但不再带 `polId`/`pol` 字段。
3. **枚举映射位置**：`serviceTypes` 是 `number[]`，前端在列的 `formatter` 中用 `serviceTypeMap` 转换，无需在 `query` handler 中处理。
