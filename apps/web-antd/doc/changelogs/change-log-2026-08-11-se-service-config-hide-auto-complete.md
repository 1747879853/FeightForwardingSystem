---
title: 港口服务项配置隐藏自动完成并恒传否
module: 基础资料
author: auto-doc-sync
last_updated: 2026-08-11
---

# 背景意图

「自动完成」后端业务逻辑尚未实现，继续在港口服务项配置弹窗暴露开关会造成误配；保存时应固定传否，避免写入无效配置。

# 核心逻辑变更

- 弹窗服务项明细移除「自动完成」开关 UI。
- 新增/编辑提交时 `autoComplete` 恒为 `false`；编辑回显亦强制为 `false`，不读详情原值。
- DTO 字段与接口契约保留，仅前端隐藏并写死。

# 避坑指南

- 后续若实现自动完成逻辑，需同时恢复开关 UI，并将 `toPayloadItemsForAdd/Edit` 改回读取 `row.autoComplete`。
- 客户「海运出口服务项目」Tab 仍可能只读展示历史 `autoComplete`；与港口配置页隐藏策略独立，按需再对齐。
