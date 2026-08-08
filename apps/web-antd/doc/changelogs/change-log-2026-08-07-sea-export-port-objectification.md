---
title: 海运出口港口字段对接后端对象化并优化回显
module: 海运出口
author: auto-doc-sync
last_updated: 2026-08-07
---

# 1. 背景意图 (Background)

后端海运出口详情将港口从扁平 `*Name` / `*EdiCode` 升级为嵌套对象（`PortCodeSimpleDtoForOrder`，含 `portName`/`cnName`/`ediCode`/`lane`/`country`）。前端需同步类型与回填逻辑：编辑页港口下拉用完整港口对象注入 `selectedItems`，避免 PortSelect 二次拉详情；航线/国家改从目的港 `pod.lane` / `pod.country` 读取（与海运进口取自起运港不同）。

# 2. 核心逻辑变更 (Core Logic)

## 2.1 涉及文件

- `src/api/sea-export/sea-export-admin.ts`：新增 `PortCodeSimpleDtoForOrder` / `LaneSimpleDto` / `CountrySimpleDto`；`SeaExportDto` 增加 `pol`/`pod`/`pot1`/`pot2`/`receivePort`/`deliverPort`/`prepareAt`/`signingPort`，旧扁平字段标 `@deprecated`
- `src/views/sea-export-admin/basic-info-form/sea-export-detail-mapper.ts`：新增 `toPortObjectSelectedItems`；`flattenDetail` 的 `laneName`/`countryName` 改读 `pod.lane`/`pod.country`
- `src/views/sea-export-admin/basic-info-form/form.vue`：编辑回填六段港口、签单港、付费地点改用 `toPortObjectSelectedItems`
- `src/views/sea-export-admin/basic-info-form/README.md`：补充映射函数说明

## 2.2 回显策略

| 场景 | 行为 |
| :-- | :-- |
| 详情带港口对象 | `{ ...port, id }` 整对象注入 `selectedItems`，字段齐全时 PortSelect 不再二次拉详情 |
| 仅有 id、无对象 | 退化为 `{ id, portName: '' }` 占位，仍由组件懒加载兜底 |
| 航线/国家展示 | 海出界面读 `pod.lane.laneName`、`pod.country.countryName` |

# 3. 避坑指南 (Pitfalls)

- 旧扁平 `polName`/`podEdiCode`/`laneName` 等仍可能短暂存在于响应，但前端应以港口对象为准，勿再主路径依赖扁平字段
- 中转港对象字段名为 `pot1`/`pot2`（小写 t），与 id 字段 `poT1Id`/`poT2Id` 大小写不一致，映射时勿写错
- 海运出口航线/国家取自**目的港**；海运进口取自起运港，两套业务口径不要混用
