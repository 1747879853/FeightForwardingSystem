# 用户管理：对接开票分机号

## 背景意图

接口开票改为按人维护开票分机号，由开票服务商据此匹配开票员。`UserAdmin` 列表、编辑回显、两个新增修改接口均已增加 `extensionNumber`（`int?`，可空）。前端需在用户管理完成类型、列表展示与新建/编辑保存回显。

## 核心逻辑变更

- `user-admin.ts`：`UserListDto`、`UserDto`、`UserInAdminInputDto` 增加 `extensionNumber`；含数据权限的入参 DTO 继承该字段。
- `data.ts`：联系信息分区增加选填 `InputNumber`（整数、非必填）；列表新增「开票分机号」列，`field` 直接绑 `extensionNumber`，因不在 `GetUserPagedListAsync` 排序白名单而 `sortable: false`。
- `user-form.vue`：`GetUserForEditAsync` 回显；`CreateOrUpdateUserInAdminAsync` 保存时空值显式传 `null`（不要省略字段，以便清空已维护分机号）。

## 避坑指南

- **不要做成必填**：不填不影响开票，发票会归到企业默认开票员。
- 空值传 `null`，不要用 `|| undefined` 省略字段，否则更新时可能清不掉原值。
- 这是服务商分配的小号整数，不是雪花 ID，可用数字控件；不要按用户 id 那套禁止 `Number()` 的规则处理。
- 列头排序未开：后端白名单尚无 `ExtensionNumber`，点列头会报不支持排序。
