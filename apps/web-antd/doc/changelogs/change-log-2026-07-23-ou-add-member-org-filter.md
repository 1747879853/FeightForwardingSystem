# 2026-07-23 添加成员查询按组织排除已有成员

## 背景意图

组织机构「添加成员」弹窗原先调用 `GetUserPagingListForOuAsync` 时未传组织 Id，无法按当前组织排除已在本组织的用户。后端现要求传 `organizationUnitId` 筛选「不在本组织」的候选用户。

## 核心逻辑变更

1. `UsersForOuPagingQueryDto` / `getUserPagingListForOu` 增加必填 `organizationUnitId`，请求 Query 传 `OrganizationUnitId`。
2. `add-member-modal.vue` 查询时带入弹窗打开时写入的当前组织 Id。
3. 同步更新 `组织机构文档.md` 中该接口的入参与筛选说明。

## 避坑指南

- 打开添加成员弹窗前必须 `setData({ organizationUnitId })`，否则查询参数无效。
- 筛选口径是「不在本组织」，不是「无任何组织」；已在其他组织的用户仍会出现在候选列表中。
