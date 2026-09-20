---
title: 提成配置列表
module: 系统管理
author: auto-doc-sync
last_updated: 2026-09-20
---

# 1. 业务背景说明 (Background)

提成配置列表用于维护提成规则。路由 `/system/commission-config`，组件 `src/views/system/commission-config/index.vue`。

# 2. 功能与操作说明 (Features & Operations)

列表展示规则名称、生效期间、适用人员与组织等信息。生效期间由开始日期和结束日期组合展示；任一日期变化后重新查询，单元格和导出都读取最新值。

# 3. 状态流转说明 (Status Transitions)

本次只调整列表文本渲染，不改变提成配置状态流转。

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 字段含义 | 数据来源 | 联动规则 | 校验限制 |
| --- | --- | --- | --- | --- |
| effectiveStartDate / effectiveEndDate | 生效起止日期 | CommissionConfigDto | 组合显示年月，空值显示不限 | 本次不调整校验 |

# 5. 核心业务卡点 (Business Blockers)

生效期间列保留 `effectiveStartDate` 列键，但显示同时依赖结束日期；应使用 `rowTextColumn` 直接渲染，不能依赖单字段 formatter 缓存。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 业务功能变动 | 代码解析与架构洞察 |
| --- | --- | --- | --- |
| 2026-09-20 | `Fix` | 开始日期不变、仅修改结束日期时，生效期间正常刷新。 | 共享函数插槽实时计算；详见[变更记录](../../changelogs/change-log-2026-09-20-列表派生文本刷新.md)。 |
