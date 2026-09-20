---
title: 监装列表状态多选
date: 2026-09-20
module: sea-exports
---

# 背景意图

后端 `cbcd036d` 给管理端列表查询补了 `statuses`：`List<LoadingOrderStatus>`，Query 重复传参。产品要求监装状态支持多选，筛选用新字段，不再打单选 `status`。

# 核心逻辑变更

- 检索「监装状态」改为多选 Select，表单字段 `statuses`。
- `GetPagedListAsync` 增加 `paramsSerializer: 'repeat'`，发出 `statuses=1&statuses=2`。
- 空数组不下发；旧单选 `status` 显式置空，避免与 `statuses` 同时生效。
- 行展示仍读 DTO 的 `status`，列 field 不改。

# 避坑指南

- 不要用逗号拼一个 `statuses` 值，ABP `[FromQuery] List` 绑不上。
- 师傅端 `GetMyPagedListAsync` 仍是单选必填 `status`，这次没改。
- 远程需先部署含 `Statuses` 的后端，否则多选参数会被忽略。
