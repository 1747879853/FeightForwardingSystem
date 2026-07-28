---
title: 附件类型列表默认展示模块按枚举文本回显
module: 基础资料
author: auto-doc-sync
last_updated: 2026-07-28
---

# 1. 背景意图 (Background)

`/basic-data/attachment-dtl-type` 列表「默认展示模块」列显示原始数字（如 `110001`），未转成模块中文名（客户、海运出口、付费申请等）。

根因：列 formatter 闭包捕获了空的 `Map` 实例；映射异步加载后即使替换列定义，在 `keepAlive` 场景下仍可能继续用空 Map 回退为数字。正确字典来源是系统枚举 `ModuleType`（`value` 即为 `110001` 等），不是 `CommonLookup/GetModuleTypes`（后者仅含系统模块）。

# 2. 核心逻辑变更 (Core Changes)

## 2.1 `AttachmentDtlTypeAdmin/data.ts` + `list.vue`

- 引入可变 `moduleTypeLabelMapHolder`，formatter 每次读 `holder.map`。
- `onMounted` 先 `getModuleTypeLabelMap()` 写入 holder，再 `query`；`autoLoad: false` 避免空映射首屏。

## 2.2 `api/common/lookup.ts`

- 继续以 `getEnumItems('ModuleType')` 构建映射/选项。
- `formatModuleTypeLabel` 对值做 `Number` 归一化；空映射不写入模块级缓存。

# 3. 避坑指南 (Pitfalls)

- 不要用 `CommonLookup/GetModuleTypes` 映射业务模块码（它不含 110001/120001 等）。
- 列 formatter 不要直接闭包某个 `Map` 实例；用 holder 或 slot，保证加载后能读到新映射。
- 路由 `keepAlive` 时改映射逻辑后需整页刷新才能验证。

# 4. 变更日志 (Changelog)

| 日期       | 变更类型 | 业务功能变动                               |
| :--------- | :------- | :----------------------------------------- |
| 2026-07-28 | `Fix`    | 列表默认展示模块显示 ModuleType 枚举中文名 |
