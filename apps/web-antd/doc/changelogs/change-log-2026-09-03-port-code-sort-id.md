---
title: 港口管理接入排序号
module: 基础资料
author: auto-doc-sync
date: 2026-09-03
---

# 背景意图

港口增加人工排序号后，管理页需支持维护和列头排序，并在用户未选择排序列时主动按排序号降序查询；业务单据中的港口下拉继续采用后端既定顺序，不由前端传排序参数。

# 核心逻辑变更

- 港口新增、编辑、详情与管理列表 DTO 增加 `sortId`；表单默认值为 `0`，编辑时回显详情值。
- 港口管理列表增加「排序」列，默认排序改为 `sortId DESC`；用户点击其他列后仍按该列远程排序。
- `getPortCodePagedList` 在未传 `Sorting` 时默认补 `sortId DESC`，管理列表、分页 `PortSelect` 及运价批量新增等调用方统一生效。
- 修复搜索或重置筛选条件后默认排序箭头消失：`reload` 完成后重新同步 `sortConfig.defaultSort` 到列头状态。
- `PortCode/GetListAsync` 精简列表 DTO 增加单字母字段 `s` 表示 `sortId`；请求不增加 `sorting`，下拉按接口返回顺序渲染。

# 避坑指南

- `PortCodeAdmin/GetPagedListAsync` 未传 `sorting` 时后端仍按创建时间降序，管理页首次查询不可省略默认排序。
- `PortCodeAdmin/GetPagedListAsync` 的管理列表和分页 `PortSelect` 都由前端传 `sorting`；只有 `PortCode/GetListAsync` 全量列表由后端固定排序。
- 单据内嵌的 `PortCodeSimpleDto` 不包含 `sortId`，无需扩展或映射。
