---
title: 部门管理
module: 系统管理
author: auto-doc-sync
last_updated: 2026-08-28
---

# 1. 业务背景说明 (Background)

**白话解释：** 维护组织/部门树，为用户归属、数据权限和业务组织范围提供基础。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/system/dept` |
| 路由名称 | `SystemDept` |
| 页面组件 | `src/views/system/dept/list.vue` |
| 权限口径 | Admin.Team.Organization / Admin.Team.Organization.Get |
| 关键源码 | `src/router/routes/modules/system.ts`<br/>`src/views/system/dept/list.vue`<br/>`src/api/system/*.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **添加成员：** 打开弹窗后按当前组织 `organizationUnitId` 查询候选用户（排除已在本组织的用户），支持关键字与分页勾选后批量加入。
- **列表/页面访问：** 通过 `/system/dept` 进入 `部门管理` 页面。
- **新增组织：** 左侧树选中节点后，点击顶部「+」或右键「新增下级」，表单「上级组织」自动带出选中节点；未选中时上级组织留空。
- **新增/编辑组织弹窗：** 不再包含「负责人」字段；组织详情与成员列表亦不展示负责人相关信息。
- **公司 Logo：** 组织类型为「公司」时，编辑弹窗以缩略图卡片（`picture-card`）上传单张 Logo；保存后详情页在标题与「组织名称」旁直接展示 Logo，不再单独占一行。部门不展示、不维护该字段。
- **开票应用凭据：** 组织类型为「公司」时，新增/编辑弹窗可维护 `invoiceAppKey`、`invoiceAppSecret`（密码框）、`invoiceAccessToken`（密码框）。每家公司在开票服务商侧独立配置，与统一社会信用代码（销方税号）一起用于接口开票。Token 是固定值，向服务商索取后填入，系统不会自动获取或刷新。编辑必须先调 `GetOrganizationUnitAsync` 回显后再整体提交。详情页展示 AppKey，AppSecret / Token 只显示「已配置/未配置」。部门不展示、不维护。
- **组织人数展示：** 左侧树中公司节点同时展示本级人数与含下级总人数，普通组织节点仅展示本级人数；组织信息区域不展示组织编码。
- **系统配置维护：** 按页面职责维护用户、角色、组织、工作流、枚举或缓存信息。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作  | 目标状态 | 状态说明                           |
| :------- | :----------- | :------- | :--------------------------------- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **权限码** | 控制页面可见与访问。 | `src/router/routes/modules/system.ts` | **触发/依赖：** 经 `abpPageAuthority` 转换后参与动态路由过滤。 | 用户必须具备对应权限码。 |
| **页面数据** | 系统管理页面的列表、表单或配置对象。 | src/views/system/dept/data.ts | **触发/依赖：** 与系统 API 契约联动。 | 字段校验以后端接口为准。 |
| **本级人数** | 当前组织直接归属的成员数。 | `OrganizationUnit.memberCount` | **触发/依赖：** 公司与普通组织节点均展示。 | 接口应返回有效数字。 |
| **含下级人数** | 当前公司及所有下级组织的成员总数。 | `OrganizationUnit.memberCountTotal` | **触发/依赖：** 仅公司节点与本级人数并列展示。 | 缺省按 0 展示。 |
| **公司 Logo** | 公司品牌图，供打印等下游读取（附件模块 `OrganizationUnitLogo`）。 | **组织机构**<br/>`CreateOrganizationUnitAsync` / `UpdateOrganizationUnitAsync` / `GetOrganizationUnitAsync` 的 `logo` | **触发/依赖：** 仅 `isCompany=true` 可上传；详情回显在标题/「组织名称」旁，不单独占字段行；提交 `{ attachmentId, displayOrder: 0 }`；清空传 `null`。 | 单文件图片（png/jpg/jpeg/webp/svg），≤5MB；非必填。 |
| **开票应用 AppKey** | 该公司在开票服务商侧的应用标识，接口开票凭据之一。 | **组织机构**<br/>`CreateOrganizationUnitAsync` / `UpdateOrganizationUnitAsync` / `GetOrganizationUnitAsync` 的 `invoiceAppKey` | **触发/依赖：** 仅 `isCompany=true` 显示与提交；列表接口恒为 null，编辑禁止用列表回填。 | 最长 128；非必填。 |
| **开票应用 AppSecret** | 该公司在开票服务商侧的应用密钥（机密）。 | **组织机构**<br/>同上 `invoiceAppSecret` | **触发/依赖：** 仅公司可维护；表单用密码框并从详情接口回显后全量提交；详情页只展示是否已配置。 | 最长 128；非必填；留空会清空库值。 |
| **开票令牌 Token** | 该公司在开票服务商侧的 accessToken（机密、固定值）。 | **组织机构**<br/>同上 `invoiceAccessToken` | **触发/依赖：** 仅公司可维护；表单用密码框并从详情接口回显后全量提交；详情页只展示是否已配置。系统不会自动取号或刷新。 | 最长 512；非必填；留空会清空库值。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：部门管理一致性]** 系统管理页面影响权限、组织、审批和缓存等底层能力，变更前需确认业务模块依赖。

> [!IMPORTANT] **[卡点 2：开票凭据全量覆盖]** `invoiceAppKey` / `invoiceAppSecret` / `invoiceAccessToken` 更新时不传或传 `null` 会清空库值。编辑页必须用 `GetOrganizationUnitAsync` 取回原值再整体提交；组织列表这三个字段恒为 null，不能拿列表数据回填编辑表单。AppSecret 与 Token 不明文展示。

> [!IMPORTANT] **[卡点 3：开票令牌禁止自动刷新]** `invoiceAccessToken` 必须人工维护。服务商侧同一应用 30 天内取号超过 50 次会被锁死，只能人工重置。令牌失效时到公司编辑页手工更新，不要自动重取。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-08-28 | `Feature` | 公司级组织编辑增加开票令牌 Token（密码框）；详情页只显示是否已配置。 | Token 与 AppKey/AppSecret 同属全量覆盖字段；固定值、不自动刷新。详见 `changelogs/change-log-2026-08-28-dept-company-invoice-access-token.md`。 |
| 2026-08-22 | `Fix` | 公司 Logo 上传后只显示缩略图，不再附带文件名列表。 | 与船公司共用 `FileUploadInput` 的 `picture-card`：隐藏自定义文件名列表与 Ant Design 文件名。详见 `changelogs/change-log-2026-08-22-carrier-logo-picture-card.md`。 |
| 2026-08-18 | `Feature` | 公司级组织支持维护开票应用 AppKey / AppSecret；详情页密钥不明文展示。 | 更新接口全量覆盖这两个字段；编辑必须走 `GetOrganizationUnitAsync` 回显，不能用列表数据。详见 `changelogs/change-log-2026-08-18-dept-company-invoice-app.md`。 |
| 2026-08-09 | `Feature` | 公司级组织支持 Logo 上传、编辑回显与详情预览，供打印等场景使用。 | 对齐船公司附件协议：`FileUploadInput` + `logo: { attachmentId, displayOrder }`；详情 URL 用 `buildAttachmentUrl`；部门提交 `logo: null`。详见 `changelogs/change-log-2026-08-09-dept-company-logo-upload.md`。 |
| 2026-07-23 | `Feature` | 「添加成员」候选用户查询必传 `organizationUnitId`，筛选不在本组织的用户。 | `getUserPagingListForOu` 增加 `OrganizationUnitId` Query；弹窗 `add-member-modal.vue` 打开时带入当前组织 Id。 |
| 2026-07-15 | `Feature` | 公司节点同时展示本级人数与含下级总人数，普通组织保留本级人数；组织详情移除组织编码。 | `memberCountTotal` 的口径包含当前组织及其下级组织，并非仅下级人数。 |
| 2026-06-27 | `Feature` | 组织管理全页移除负责人：弹窗、详情、成员列表均不再展示或维护负责人。 | 表单在 `data.ts`/`form.vue`；详情与成员列在 `list.vue`。 |
| 2026-06-19 | `Feature` | 左侧树选中组织后点击「+」新增时，自动将选中节点作为上级组织带入表单。 | `onCreateOrg` 与 `onAppendOrg` 统一通过 `{ parentId }` 传参，由 `form.vue` 的 `onOpenChange` 写入 `parentId` 字段。 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/system/dept` 对应组件 `src/views/system/dept/list.vue`，权限口径为 Admin.Team.Organization / Admin.Team.Organization.Get。 |
