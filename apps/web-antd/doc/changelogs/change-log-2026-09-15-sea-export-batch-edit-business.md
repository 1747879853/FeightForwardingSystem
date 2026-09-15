---
title: 海运出口列表批量修改业务
date: 2026-09-15
module: sea-exports
---

# 背景意图

TAPD #1000972：海运出口列表需支持多选后批量修改业务字段，仅更新弹窗中已填写内容，留空不覆盖原值；需 `Admin.SeaExport.Edit` 权限。

# 核心逻辑变更

1. **列表入口：** `list.vue` 工具栏直接展示「批量修改」（需 `Admin.SeaExport.Edit`）；未勾选 toast 提示；仅提交 `isEditable === true` 的票 id。
2. **弹窗：** `modules/batch-edit-business-modal.vue` 分基础信息 / 港口 / 干系人三区，一行三列；提交 `PUT /services/app/SeaExportAdmin/BatchEditAsync`；组装 payload 时剥离空值；`poT1Id`/`poT2Id` 映射为 `pot1Id`/`pot2Id`。
3. **交互：** 修改起运港二次确认（将按新港重新生成服务项目）；选目的港时只读预览航线（列表刷新后仍从 `pod.lane` 带出）。
4. **选港带备注：** 六段港口（收货地 / 起运港 / 中转 1/2 / 目的港 / 交货地）选中后按编辑页同款 `formatSeaExportPortRemark` 自动带出 `PORTNAME, COUNTRYENNAME`，随港口 id 一起提交；后端改港时同步写备注（没带到则按港口资料兜底）。列表港口列读的是备注，不跟着改会出现港和格子文案对不上。

# 避坑指南

- 客户下拉继续走 `ClientSelect` / `GetPagedListAsync`，委托单位含数据权限过滤。
- 归属组织 `UserOrgSelect` 设 `autoDefault: false`，避免空弹窗误提交默认组织。
- 接口返回 `int` 为实际修改票数，可能小于勾选数（无编辑权限的票被后端过滤）。
- 列表六段港口列展示 `*Remark` 不是 `portName`；批量改港必须同步备注，不要只改 id。
