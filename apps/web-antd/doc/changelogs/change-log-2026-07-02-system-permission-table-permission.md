# 权限管理 - 表级权限对接

## 背景意图

按后端 `UserTablePermissionAdmin` / `UserTablePermissionConditionAdmin` 契约，在 `/system/permission` 表级权限 Tab 完成主规则与字段条件的前端配置能力。

## 核心逻辑变更

- 主规则 CRUD：绑定用户/角色 + 业务模块（`frightModule`）；移除无效 `manageType` 字段。
- 条件维护：抽屉内联列表 + 弹窗配置 `propName` / `operator` / `value`，自动填充 `showName` / `showValue`。
- 新增时本地暂存条件，保存主规则后批量 `AddAsync`；编辑已保存条件仅可改 `operator` / `value`（与后端一致）。
- 列表展示条件条数；分页参数统一为 `pageIndex` / `pageSize`。
- 按模块维护前端字段元数据（海运出口、业务表、付费申请等常用字段）。

## 避坑指南

- `manageType`、`groupId` 后端无效，前端勿展示。
- 编辑已保存条件不可改 `propName`，需删除后重建。
- 属性名须 PascalCase，与后端实体属性一致；枚举值传字符串形式整数值。
- 无批量保存接口，新增/编辑条件须逐条调用。
