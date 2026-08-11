# 用户列表修改所属组织后列不刷新

## 背景意图

在 `#/system/user` 编辑用户并修改所属组织后，保存成功虽会触发列表 `query`，但「所属组织」列仍显示旧值，需手动整页刷新才正确。

## 核心逻辑变更

1. 列表「所属组织」列 `field` 由虚构的 `organizationPath` 改为真实数据字段 `organizations`。
2. `formatter` 优先读 `organizations[].oneOrganizationPath`（兼容 `displayName` / `name`），再回退 `organizationPath`、`organization`。

## 避坑指南

- **vxe formatter 缓存按 `field` 对应的 cellValue 判定**：`getCellLabel` 在 `formatData[colid].value === cellValue` 时直接返回旧 label，不会重跑 formatter。若展示依赖嵌套字段（如 `row.organizations`），列 `field` 必须绑到会随数据变化的那一项，否则刷新接口后仍显示旧缓存。
- 不要用永远不变/不存在的字段（如历史单组织 `organizationPath`）作为多组织列的 `field`。
- 保存成功后的 `gridApi.query()` 本身会重新请求；本问题不是「没刷新接口」，而是「单元格 formatter 被旧缓存短路」。
