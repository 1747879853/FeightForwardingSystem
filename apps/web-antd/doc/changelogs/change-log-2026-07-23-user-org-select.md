# 新增 UserOrgSelect：按指定用户取其所属组织

## 背景意图

业务录入（如海运出口选定销售后选归属组织 `orgId`）需要按目标用户的组织范围下拉，而不能再用「我的组织」或全量组织树。后端已提供 `UserAdmin/GetAllUserOrganizationsAsync`（登录即可、无入参、全量用户组织路径），需封装为公共 biz-select 供全站复用。

## 核心逻辑变更

1. `user-admin.ts` 新增 `UserOrganizationsDto` 与 `getAllUserOrganizations()`，对接 `GetAllUserOrganizationsAsync`；`organizations` 复用 `MyUserOrganizationPathDto`（与 `GetMyAsync.organizations` 同构，公司节点含本位币与 `orgBankAccounts`）。
2. 新增组合式 `use-all-user-org.ts`：模块级 `userId → 组织路径` 缓存，并发合并为一次网络调用；对外提供 `getUserOrgOptions` / `getUserDefaultOrgId` / `getUserOrgPath` / `getUserOrgCompanyNode`。
3. 新增 `UserOrgSelect`：`userId` 驱动选项；默认自动填该用户默认组织；换人后若已选值不在新范围则清空。
4. 在 `biz-select/index.ts` 与 `#/adapter/component` 顶层 barrel 注册/再导出，表单可直接用组件名 `UserOrgSelect`。

## 避坑指南

- 与 `MyOrgSelect` 职责不同：前者是「指定用户」的组织范围，后者是「当前登录人」的组织范围。
- 编辑回显时务必传入对应销售/干系人的 `userId`，否则选项为空。
- 公司信息（本位币、银行账户）取路径中 `isCompany` 节点，勿误用路径末端部门节点。
- 全量接口仅需登录；勿误接需要 Admin 权限的用户详情接口来拼组织。
