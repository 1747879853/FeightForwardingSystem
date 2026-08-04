---
title: 附件类型列表业务联系单模块码回显中文名
module: 基础资料
author: auto-doc-sync
last_updated: 2026-08-04
---

# 1. 背景意图 (Background)

`/basic-data/attachment-dtl-type` 列表「默认展示模块」对 `160050`（业务联系单 / PreOrder）只显示原始数字，无中文名。

根因：系统枚举 `ModuleType` 未及时补齐该项，而业务联系单附件已按后端 `ModuleType.PreOrder = 160050` 写入默认模块；`formatModuleTypeLabel` 找不到映射时回退为数字。另：`getEnumItems` 走 localStorage 缓存，即使后来在枚举管理补齐，附件类型页仍可能读到旧 ModuleType。

# 2. 核心逻辑变更 (Core Changes)

## 2.1 `api/common/lookup.ts`

- 新增 `KNOWN_MODULE_TYPE_FALLBACKS`：`160050 → 业务联系单`（与 `PRE_ORDER_MODULE_TYPE_ID` 对齐）；仅在枚举完全缺失该 value 时补入，不覆盖枚举 `displayName`。
- `getModuleTypeEnumItems` 改为直连 `getItemsByName('ModuleType')`，绕过 localStorage 枚举缓存。
- 列表映射与表单下拉均经 `buildModuleTypeLabelMap` 合并兜底，编辑弹窗可选「业务联系单」。

## 2.2 文案

- `system.permission.modulePreOrder`：中/英「业务联系单 / Business Contact Form」。

# 3. 避坑指南 (Pitfalls)

- 长期仍应在「系统管理 → 枚举」的 `ModuleType` 中补齐 `value=160050`、`displayName=业务联系单`；兜底只防漏配。
- 枚举改完后若内存映射仍旧，可刷新页面（`moduleTypeLabelCache` 为进程内缓存）或调用 `clearModuleTypeLabelCache()`。
- 不要用 `CommonLookup/GetModuleTypes` 映射业务模块码。

# 4. 变更日志 (Changelog)

| 日期       | 变更类型 | 业务功能变动                                   |
| :--------- | :------- | :--------------------------------------------- |
| 2026-08-04 | `Fix`    | 附件类型默认模块 `160050` 回显为「业务联系单」 |
