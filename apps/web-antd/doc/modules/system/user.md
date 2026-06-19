---
title: 用户管理
module: 系统管理
author: auto-doc-sync
last_updated: 2026-06-19
---

# 1. 业务背景说明 (Background)

**白话解释：** 维护系统用户、组织、角色、数据权限和登录相关基础信息。

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
| **userAttributeFlags（用户属性）** | 用户业务角色位标志（可多选）。 | 前端 `getUserAttributeOptions()` 枚举 | **触发/依赖：** 提交前由 `combineUserAttribute` 合并为 `userAttribute` 整型掩码。 | **必填项**，至少勾选一项。 |
| **officeTel** | 用户办公电话。 | `GET /services/app/UserAdmin/GetUserForEditAsync`<br/>`POST /services/app/UserAdmin/CreateOrUpdateUserAsync` | **触发/依赖：** 用户编辑弹窗可编辑；保存时随 `UserInAdminInputDto` 提交。 | 最大长度 `32`，可为空。 |
| **senderDisplayName** | 邮件发件显示名。 | `GET /services/app/UserAdmin/GetUserForEditAsync`<br/>`POST /services/app/UserAdmin/CreateOrUpdateUserAsync` | **触发/依赖：** 用户编辑弹窗邮件配置区可编辑；保存时随 `UserInAdminInputDto` 提交。 | 最大长度 `64`，可为空。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：用户管理一致性]** 系统管理页面影响权限、组织、审批和缓存等底层能力，变更前需确认业务模块依赖。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-06-19 | `Fix` | 用户新建/编辑弹窗「所属部门」「用户属性」设为必填，未填写时阻止保存。 | 表单 Schema 分别使用 `selectRequired` 与 `required` 规则；用户属性仍为位标志多选，提交前合并为整型掩码。 |
| 2026-05-30 | `Feature/Fix` | 用户列表路由开启 `keepAlive`；启用/禁用、还原权限成功后刷新列表。 | 弹窗型列表依赖 `@success` 与操作回调刷新；详见 [列表页 keepAlive 与刷新约定](../../guides/list-page-keepalive-refresh.md)。 |
| 2026-05-27 | `Feature` | 用户编辑弹窗「办公电话」「发件显示名」已对接 `GetUserForEditAsync` 回显与 `CreateOrUpdateUserAsync` 保存。 | 表单字段此前为禁用占位；DTO 与 `user-form.vue` 提交/回显链路已补齐。 |
| 2026-05-17 | `Fix` | 人员管理列表移除「账号状态」筛选与列展示，统一改为仅基于「账号启用」判断账号是否可使用系统；表单中 `status` 改为隐藏默认值以保持接口兼容。 | 无 |
| 2026-05-17 | `Parsing` | 无 | 识别用户管理页存在 `officeTel`、`senderDisplayName` 两个待后端支持字段；已形成后端 Agent 可执行对接说明，明确需补齐 `GetUserForEditAsync` 与 `CreateOrUpdateUserAsync`/`CreateOrUpdateUserInAdminAsync` 的 DTO 与持久化链路。 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/system/user` 对应组件 `src/views/system/user/list.vue`，权限口径为 Admin.Team.User / Admin.Team.User.Get。 |
