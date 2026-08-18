# 2026-08-18 公司组织支持维护开票应用凭据

## 背景意图

接口开票按公司各自对接开票服务商：每家公司独立 `appKey` / `appSecret`，并与统一社会信用代码（销方税号）一起构成开票凭据。后端已在创建/更新/获取单个组织接口暴露这两个字段，组织管理页此前未维护。

## 核心逻辑变更

- `organization-unit.ts`：`OrganizationUnitDto` / Create / Update 补 `invoiceAppKey`、`invoiceAppSecret`
- `dept/data.ts`：公司专属字段增加 AppKey 输入框、AppSecret 密码框，仅 `isCompany===true` 显示
- `dept/modules/form.vue`：编辑仍走 `GetOrganizationUnitAsync` 回显后再整体提交；部门提交强制传 `null`
- `dept/list.vue`：公司详情展示 AppKey；AppSecret 只显示「已配置/未配置」，不明文输出
- i18n：`system.dept.invoiceAppKey` / `invoiceAppSecret` 及帮助文案

## 避坑指南

- 这两个字段是**全量覆盖**：更新时不传或传 `null` 会清空库值。编辑必须先调 `GetOrganizationUnitAsync` 带回原值再提交，禁止用组织列表数据回填（列表恒为 null）
- AppSecret 是机密：表单用密码框，详情页只展示是否已配置
- 仅公司可维护；用户把「公司」改成「部门」时前端会提交 `null`，与公司专属字段展示逻辑一致
- 缺税号、AppKey、AppSecret 任一项都无法接口开票，但前端不强制必填（允许先建公司后补凭据）
