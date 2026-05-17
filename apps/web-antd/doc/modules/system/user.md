---
title: 用户管理
module: 系统管理
author: auto-doc-sync
last_updated: 2026-05-17
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

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作  | 目标状态 | 状态说明                           |
| :------- | :----------- | :------- | :--------------------------------- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **权限码** | 控制页面可见与访问。 | `src/router/routes/modules/system.ts` | **触发/依赖：** 经 `abpPageAuthority` 转换后参与动态路由过滤。 | 用户必须具备对应权限码。 |
| **页面数据** | 系统管理页面的列表、表单或配置对象。 | src/views/system/user/data.ts | **触发/依赖：** 与系统 API 契约联动。 | 字段校验以后端接口为准。 |
| **officeTel** | 用户办公电话。 | `GET /services/app/UserAdmin/GetUserForEditAsync`<br/>`POST /services/app/UserAdmin/CreateOrUpdateUserAsync` | **触发/依赖：** 用户编辑页表单字段，依赖后端 DTO 提供回显与保存。 | 最大长度建议 `32`，可为空。 |
| **senderDisplayName** | 邮件发件显示名。 | `GET /services/app/UserAdmin/GetUserForEditAsync`<br/>`POST /services/app/UserAdmin/CreateOrUpdateUserAsync` | **触发/依赖：** 用户编辑页邮件配置字段，依赖后端 DTO 提供回显与保存。 | 最大长度建议 `64`，可为空。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：用户管理一致性]** 系统管理页面影响权限、组织、审批和缓存等底层能力，变更前需确认业务模块依赖。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-05-17 | `Parsing` | 无 | 识别用户管理页存在 `officeTel`、`senderDisplayName` 两个待后端支持字段；已形成后端 Agent 可执行对接说明，明确需补齐 `GetUserForEditAsync` 与 `CreateOrUpdateUserAsync`/`CreateOrUpdateUserInAdminAsync` 的 DTO 与持久化链路。 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/system/user` 对应组件 `src/views/system/user/list.vue`，权限口径为 Admin.Team.User / Admin.Team.User.Get。 |
