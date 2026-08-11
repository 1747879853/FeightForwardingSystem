---
title: 用户管理
module: 系统管理
author: auto-doc-sync
last_updated: 2026-08-11
---

# 1. 业务背景说明 (Background)

**白话解释：** 维护系统用户、组织、角色、数据权限和登录相关基础信息；列表可展示用户所属组织的完整层级路径；可诊断指定用户最终生效的功能权限。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/system/user` |
| 路由名称 | `SystemUser` |
| 页面组件 | `src/views/system/user/list.vue` |
| 权限口径 | Admin.Team.User / Admin.Team.User.Get |
| 关键源码 | `src/router/routes/modules/system.ts`<br/>`src/views/system/user/list.vue`<br/>`src/api/system/*.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **列表/页面访问：** 通过 `/system/user` 进入 `用户管理` 页面。
- **系统配置维护：** 按页面职责维护用户、角色、组织、工作流、枚举或缓存信息。
- **账号可用判断口径：** 列表仅保留「账号启用」字段用于判断是否可使用系统，不再展示「账号状态」列。
- **所属组织路径：** 列表「所属组织」列 `field` 绑定 `organizations`，按多组织路径拼接（如 `世纪通达/操作部/操作一部`，多组织逗号分隔）；无路径时回退旧字段 `organizationPath` / `organization`。
- **列头排序：** 仅后端白名单字段可排；`avatar` / `organizations` / `roles` 为 `sortable: false`；默认 `CreationTime DESC`。
- **行内操作：** 操作列固定右侧；外露「修改 / 权限配置 / 最终权限 / 分配角色」，「银行账户 / 修改密码 / 删除」收入「更多」下拉；默认列宽 `340`。
- **最终权限诊断：** 点击「最终权限」打开只读弹窗，调用 `GET /services/app/UserAdmin/GetUserPermissionsAsync?id=` 展示该用户最终生效权限树（角色 + 用户级授权/禁止合并结果）；默认仅显示已拥有分支，可搜索。
- **权限配置：** 点击「权限配置」跳转 `/system/permission`，用于编辑用户级模块/数据/表/字段权限，与「最终权限」只读诊断分离。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作  | 目标状态 | 状态说明                           |
| :------- | :----------- | :------- | :--------------------------------- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **权限码** | 控制页面可见与访问。 | `src/router/routes/modules/system.ts` | **触发/依赖：** 经 `abpPageAuthority` 转换后参与动态路由过滤。 | 用户必须具备对应权限码。 |
| **页面数据** | 系统管理页面的列表、表单或配置对象。 | src/views/system/user/data.ts | **触发/依赖：** 与系统 API 契约联动。 | 字段校验以后端接口为准。 |
| **enable（账号启用）** | 标识账号是否允许登录和使用系统。 | `GET /services/app/UserAdmin/GetPagedListAsync`<br/>`POST /services/app/UserAdmin/CreateOrUpdateUserAsync` | **触发/依赖：** 用户离职（`isActive=false`）时前端联动将 `enable` 自动置为 `false`；列表仅展示该字段作为账号可用依据。 | 布尔值；建议与人员在职状态保持一致。 |
| **organizationId（所属部门）** | 用户归属组织。 | `GET /services/app/OrganizationUnit/GetOrganizationUnitTreeAsync`<br/>`POST /services/app/UserAdmin/CreateOrUpdateUserAsync` | **触发/依赖：** 用户编辑弹窗通过组织树选择。 | **必填项**，未选择时阻止保存。 |
| **organizations（所属组织）** | 列表展示用户全部所属组织层级路径。 | `GET /services/app/UserAdmin/GetUserPagedListAsync` 的 `organizations[]`（含 `default`、`oneOrganizationPath`） | **触发/依赖：** 列 `field` 必须为 `organizations`（避免 vxe formatter 按旧 `organizationPath` 缓存导致改组织后不刷新）；`formatter` 拼接路径名，回退 `organizationPath` / `organization`。 | 只读展示；未挂组织时为空数组。 |
| **userAttributeFlags（用户属性）** | 用户业务角色位标志（可多选）。 | 前端 `getUserAttributeOptions()` 枚举（含操作/客服/单证/商务/销售/财务/海外客服/人事/航线） | **触发/依赖：** 提交前由 `combineUserAttribute` 合并为 `userAttribute` 整型掩码。 | **必填项**，至少勾选一项。 |
| **officeTel** | 用户办公电话。 | `GET /services/app/UserAdmin/GetUserForEditAsync`<br/>`POST /services/app/UserAdmin/CreateOrUpdateUserAsync` | **触发/依赖：** 用户编辑弹窗可编辑；保存时随 `UserInAdminInputDto` 提交。 | 最大长度 `32`，可为空。 |
| **senderDisplayName** | 邮件发件显示名。 | `GET /services/app/UserAdmin/GetUserForEditAsync`<br/>`POST /services/app/UserAdmin/CreateOrUpdateUserAsync` | **触发/依赖：** 用户编辑弹窗邮件配置区可编辑；保存时随 `UserInAdminInputDto` 提交。 | 最大长度 `64`，可为空。 |
| **gender（性别）** | 用户性别。 | `GET /services/app/UserAdmin/GetUserForEditAsync`<br/>`POST /services/app/UserAdmin/CreateOrUpdateUserAsync` | **触发/依赖：** 用户编辑弹窗下拉选择；取值 `1` 男 / `2` 女，与个人中心一致；历史值 `0` 回显为空。 | 选填；可为 `null`。 |
| **emailAddress（邮箱）** | 用户联系邮箱。 | `GET /services/app/UserAdmin/GetUserForEditAsync`<br/>`POST /services/app/UserAdmin/CreateOrUpdateUserAsync` | **触发/依赖：** 新建与编辑弹窗均可编辑。 | **必填**；校验邮箱格式，最大长度 `128`。 |
| **最终生效权限列表** | 指定用户当前真正生效的权限名集合。 | `GET /services/app/UserAdmin/GetUserPermissionsAsync`<br/>Query：`id` | **触发/依赖：** 「最终权限」弹窗打开时加载；配合 `Permission/GetAllPermissions` 构建只读树。 | 只读；勿与「权限配置」页的用户级可编辑权限混淆。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：用户管理一致性]** 系统管理页面影响权限、组织、审批和缓存等底层能力，变更前需确认业务模块依赖。

> [!IMPORTANT] **[卡点 2：最终权限 vs 权限配置]** 「最终权限」= 角色 + 用户级授权/禁止后的生效结果，仅诊断；「权限配置」= 编辑用户级授权。查当前登录人自己请走 `AbpUserConfiguration/GetAll`。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-08-11 | `Fix` | 用户列表去掉后端不支持的列头排序（头像/所属组织/角色），默认排序改为创建时间降序。 | 白名单见 `GetUserPagedListAsync`；`applyDefaultSortable` 下须显式 `sortable: false`。详见 [变更日志](../../changelogs/change-log-2026-08-11-user-list-sortable-whitelist.md)。 |
| 2026-08-11 | `Fix` | 修复编辑用户修改所属组织后，列表「所属组织」列仍显示旧值的问题。 | 根因是 vxe `getCellLabel` 按列 `field` 的 cellValue 缓存 formatter；列绑了不存在的 `organizationPath`，`organizations` 变了也不重算。已改为 `field: 'organizations'`。详见 [变更日志](../../changelogs/change-log-2026-08-11-user-list-org-column-refresh.md)。 |
| 2026-07-31 | `Feature` | 用户属性新增「航线」（`ShippingLine = 256`）；原「商务(航线)」更名为「商务」。 | 枚举与 `getUserAttributeOptions` 同步；海出专用 6 项角色未纳入航线。详见 [变更日志](../../changelogs/change-log-2026-07-31-user-attribute-shipping-line.md)。 |
| 2026-07-29 | `Feature` | 用户列表新增「最终权限」按钮与只读弹窗，对接 `GetUserPermissions` 展示最终生效权限树。 | 弹窗组件 `view-permissions-modal.vue`；API 入参统一 `id`；操作列宽调至 `340`。详见 [变更日志](../../changelogs/change-log-2026-07-29-user-view-effective-permissions.md)。 |
| 2026-07-16 | `Fix` | 用户列表操作列改为外露「修改 / 权限配置 / 分配角色」，其余收入「更多」；列宽 `280`。 | `CellOperation` 新增 `children`→Dropdown；删除在菜单内用 `Modal.confirm`。 |
| 2026-07-14 | `Feature` | 用户列表新增「所属组织」列，展示 `organizationPath` 拼接路径（如 `世纪通达/操作部/操作一部`），无路径时回退 `organization`。 | `UserListDto` 补齐路径 DTO；列定义在 `user/data.ts` 的 `useColumns`。 |
| 2026-06-27 | `Fix` | 用户新建/编辑弹窗增加只读「所属公司」，优先接口 `companyName`，否则按所选部门在组织树解析公司节点。 | `resolveOrganizationCompanyName` 于 `organization-unit.ts`；表单 `ReadonlyText` + 部门变更联动。 |
| 2026-06-20 | `Feature` | 用户新建/编辑弹窗邮箱设为必填，并校验邮箱格式与最大长度 `128`。 | `emailAddress` 使用 Zod（`.min(1)` + 邮箱正则 + `.max(128)`）；复合字符串 `required\|email` 不会显示必填星号。 |
| 2026-06-19 | `Fix` | 性别下拉统一为男/女两项；个人中心移除「未知」；历史值 `0` 回显为空，避免显示数字。 | 个人中心与用户管理选项对齐；`user-form.vue` / `base-setting.vue` 加载时过滤非法 gender 值。 |
| 2026-06-19 | `Fix` | 修复用户编辑弹窗邮箱误显示为必填：邮箱始终选填，有值时才校验格式与长度。 | `emailAddress` 改回 `email\|max:128` 字符串规则；避免动态 `z.string().email()` 被表单框架判定为必填。 |
| 2026-06-19 | `Fix` | 用户新建/编辑弹窗「所属部门」「用户属性」设为必填，未填写时阻止保存。 | 表单 Schema 分别使用 `selectRequired` 与 `required` 规则；用户属性仍为位标志多选，提交前合并为整型掩码。 |
| 2026-05-30 | `Feature/Fix` | 用户列表路由开启 `keepAlive`；启用/禁用、还原权限成功后刷新列表。 | 弹窗型列表依赖 `@success` 与操作回调刷新；详见 [列表页 keepAlive 与刷新约定](../../guides/list-page-keepalive-refresh.md)。 |
| 2026-05-27 | `Feature` | 用户编辑弹窗「办公电话」「发件显示名」已对接 `GetUserForEditAsync` 回显与 `CreateOrUpdateUserAsync` 保存。 | 表单字段此前为禁用占位；DTO 与 `user-form.vue` 提交/回显链路已补齐。 |
| 2026-05-17 | `Fix` | 人员管理列表移除「账号状态」筛选与列展示，统一改为仅基于「账号启用」判断账号是否可使用系统；表单中 `status` 改为隐藏默认值以保持接口兼容。 | 无 |
| 2026-05-17 | `Parsing` | 无 | 识别用户管理页存在 `officeTel`、`senderDisplayName` 两个待后端支持字段；已形成后端 Agent 可执行对接说明，明确需补齐 `GetUserForEditAsync` 与 `CreateOrUpdateUserAsync`/`CreateOrUpdateUserInAdminAsync` 的 DTO 与持久化链路。 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/system/user` 对应组件 `src/views/system/user/list.vue`，权限口径为 Admin.Team.User / Admin.Team.User.Get。 |
