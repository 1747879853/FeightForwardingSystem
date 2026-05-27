# 海运出口新增海外客服用户角色

## 背景意图

业务需要在港口服务项配置与海运出口新建/编辑页干系人中纳入「海外客服」角色，与系统用户属性枚举 `UserAttribute.OverseasCustomerService`（位标志 64）对齐，便于服务项责任划分与订单人员分工。

## 核心逻辑变更

- `getSeaExportOrderUserRoleOptions()` / `parseSeaExportUserAttribute()` 由 5 项扩展为 6 项，新增海外客服；港口服务项配置弹窗复用该专用选项集。
- `sea-export-admin/form.vue` 默认干系人、`orderUserRoleOptions` 与角色标签展示同步增加海外客服；纳入固定角色集合（不可删除、不可重复），人员非必填（与销售/操作区分）。

## 避坑指南

- 系统用户管理仍使用全量 8 项 `getUserAttributeOptions()`，勿混用。
- 历史服务项配置若已勾选海外客服位标志，编辑回显与保存将不再被 `parseSeaExportUserAttribute` 过滤。
