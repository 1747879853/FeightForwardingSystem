# 用户列表展示所属组织完整路径

## 背景意图

用户管理分页接口 `GetUserPagedListAsync` 已返回 `organizationPath`（组织路径数组）与 `organization`（直接挂载部门名）。列表需要直观展示层级路径（如 `世纪通达/操作部/操作一部`），便于识别用户归属。

## 核心逻辑变更

1. **`UserListDto`** 补充 `organization`、`organizationPath`，并新增 `UserOrganizationPathItemDto`（`id` / `name` / `isCompany`）。
2. **列表列** 在工号后增加「所属组织」列：优先将 `organizationPath` 各级 `name` 用 `/` 拼接；无路径时回退 `organization`，再无则显示 `-`。
3. **i18n** 新增 `system.user.organization`（所属组织 / Organization）。

## 避坑指南

- 路径分隔符与产品约定一致为 `/`，勿改为 `/` 空格样式，除非产品另行要求。
- `organizationPath` 为空数组时不要误判为「有路径」，应走 `organization` 回退。
- 本接口字段为只读展示，编辑仍走 `organizationId` / 组织树，勿混用列表字段提交。
