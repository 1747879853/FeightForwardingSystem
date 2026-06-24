---
title: 附件类型默认展示模块改用 ModuleType 枚举
module: 基础资料
author: auto-doc-sync
last_updated: 2026-06-24
---

# 1. 背景意图 (Background)

附件类型新增/编辑弹窗中「默认展示模块」下拉选项原先来自 `CommonLookup/GetModuleTypes`，与系统枚举管理（`system/enumeration`）中自定义的 `ModuleType` 枚举维护入口不一致。现统一改为读取 `ModuleType` 枚举项。

# 2. 核心逻辑变更 (Core Changes)

## 2.1 `src/api/common/lookup.ts`

- 移除对 `CommonLookup/GetModuleTypes` 的依赖。
- 通过 `getEnumItems('ModuleType')` 加载枚举项，提供 `getModuleTypeOptions`、`getModuleTypeLabelMap` 等工具函数。
- 下拉仅展示 `enable !== false` 的枚举项。

## 2.2 表单与列表

- `AttachmentDtlTypeAdmin/modules/form.vue`：默认展示模块多选改用 `getModuleTypeOptions()`。
- 列表列展示仍通过 `getModuleTypeLabelMap()` 映射显示名，数据源与表单一致。

## 2.3 枚举缓存

- `init-enum.ts` 预加载列表新增 `ModuleType`，便于应用启动时缓存。

# 3. 避坑指南 (Pitfalls)

- 枚举项在 `system/enumeration` 中维护后，若列表显示名未更新，可刷新页面或调用 `clearModuleTypeLabelCache()` 后重新加载。
- `moduleType` 提交值仍为枚举项的 `value` 数值，与后端子表 `AttachmentDefaultModule.moduleType` 一致。

# 4. 变更日志 (Changelog)

| 日期 | 变更类型 | 业务功能变动 |
| :-- | :-- | :-- |
| 2026-06-24 | `Fix` | 默认展示模块选项改为 system/enumeration 中 ModuleType 枚举 |
