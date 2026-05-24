# 海运出口服务项配置用户属性与海运出口单据对齐

## 背景意图

海运出口港口服务项配置弹窗中，服务项「用户属性」复用了系统用户管理的全量 8 项角色（含财务、海外客服、人事等），与海运出口单据中实际使用的 5 项订单用户角色不一致，导致配置口径偏差。

## 核心逻辑变更

- 在 `#/views/system/user/data.ts` 新增 `getSeaExportOrderUserRoleOptions()` 与 `parseSeaExportUserAttribute()`，限定为海运出口/进口单据一致的 5 项：销售、商务(航线)、操作、客服、单证。
- `SeServiceConfigAdmin/modules/form.vue` 改为使用上述专用选项与解析函数，替代原 `getUserAttributeOptions()` 全量 8 项。

## 避坑指南

- 系统用户管理页面仍使用全量 8 项用户属性，勿将 `getUserAttributeOptions()` 直接替换为海运出口专用版本。
- 若历史数据曾保存财务/海外客服/人事等无效角色位，编辑回显时会被 `parseSeaExportUserAttribute` 过滤，保存后仅保留 5 项有效角色。
