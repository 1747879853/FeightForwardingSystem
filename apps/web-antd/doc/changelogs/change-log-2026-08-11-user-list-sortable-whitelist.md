# 用户列表列头排序对齐后端白名单

## 背景意图

`GetUserPagedListAsync` 仅支持固定字段排序；列表经 `applyDefaultSortable` 默认对有 `field` 的列开排序，点击头像/所属组织/角色等会触发后端不支持排序错误。

## 核心逻辑变更

1. **不可排序列**显式 `sortable: false`：`avatar`、`organizations`、`roles`（操作列/勾选列本就排除）。
2. **可排序列**保持默认（与白名单对齐）：`id`、`userName`、`nickName`、`enName`、`employeeID`、`phoneNumber`、`emailAddress`、`userAttribute`、`isActive`、`enable`、`creationTime`。
3. 列表 `defaultSort` 与 API 兜底排序改为 `CreationTime DESC`（与后端默认一致）。

## 避坑指南

- 后端白名单含 `DefaultOrgId`，但列表展示字段是 `organizations` 聚合路径，不能用该列排序，也勿误绑 `sortField: 'DefaultOrgId'`（语义不同）。
- 白名单内、列表未展示的字段（如 `Gender`、`QQ`、`Remark`）无需改列；新增列时先对照白名单再决定是否开排序。
