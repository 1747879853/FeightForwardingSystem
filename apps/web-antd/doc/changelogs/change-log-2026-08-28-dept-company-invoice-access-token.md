# 2026-08-28 公司组织编辑增加开票令牌 Token

## 背景意图

接口开票凭据按公司维护。后端已在创建/更新/获取单个组织接口增加 `invoiceAccessToken`（固定值，向服务商索取后填入，系统不会自动刷新）。组织管理此前只维护 AppKey / AppSecret，公司编辑页缺少 Token，缺这一项就开不了票。

## 核心逻辑变更

- `organization-unit.ts`：`OrganizationUnitDto` / Create / Update 补 `invoiceAccessToken`
- `dept/data.ts`：公司专属字段增加 Token 密码框（最长 512），仅 `isCompany===true` 显示
- `dept/modules/form.vue`：编辑仍走 `GetOrganizationUnitAsync` 回显后再整体提交；部门提交强制传 `null`
- `dept/list.vue`：公司详情 Token 只显示「已配置/未配置」，不明文输出
- i18n：`system.dept.invoiceAccessToken` 及帮助文案（强调固定值、不自动刷新）

## 避坑指南

- 与 AppKey / AppSecret 一样是**全量覆盖**：更新时不传或传 `null` 会清空库值。编辑必须先调 `GetOrganizationUnitAsync` 带回原值再提交，禁止用组织列表数据回填（列表恒为 null）
- Token 是机密：表单用密码框，详情页只展示是否已配置
- **不要自动向服务商取号刷新**：同一应用 30 天内取号超过 50 次会被锁死，只能由服务商人工重置。令牌失效时到本页手工更新
- 仅公司可维护；用户把「公司」改成「部门」时前端会提交 `null`
- 缺税号、AppKey、AppSecret、AccessToken 任一项都无法接口开票，但前端不强制必填（允许先建公司后补凭据）
