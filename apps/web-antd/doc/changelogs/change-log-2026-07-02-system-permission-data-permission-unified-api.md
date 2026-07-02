# 权限管理 - 数据权限统一子表接口

## 背景意图

后端 `UserDataPermissionAdmin` 改造为所有接口携带子表：新增/编辑通过 `entityIds` 一次性提交，列表/详情通过 `items` 返回；主记录带出 `userNickName` / `roleName`。前端需移除对 `UserDataPermissionItemAdmin` 的独立调用。

## 核心逻辑变更

- API 层：`UserDataPermissionAddDto` / `UserDataPermissionEditDto` 增加 `entityIds`；`UserDataPermissionDto` 增加 `items`、`userNickName`、`roleName`；新增 `getDataPermissionDetail`；移除子项独立 CRUD 导出。
- 数据权限 Tab：保存时单次调用 Add/Edit 并附带 `entityIds`；编辑/查看明细优先使用列表行内 `items`，缺失时回退 `DetailAsync`。
- 列表新增「明细数」列，多用户/多部门类型展示 `items.length`。

## 避坑指南

- 子表维护逻辑已下沉后端（编辑按 `EntityId` 增量匹配），前端不再 diff 调用子项 Add/Delete。
- `entityIds` 在非 ManyUser/ManyPart 类型时传空数组即可。
- 明细名称回显仍依赖用户/组织接口，列表返回的 `userNickName`/`roleName` 为关联主体名称，非子表实体名称。
