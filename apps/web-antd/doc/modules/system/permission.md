---
title: 权限管理
module: 系统管理
author: auto-doc-sync
last_updated: 2026-06-15
---

# 1. 业务背景说明 (Background)

**白话解释：** 维护用户数据权限和权限范围，当前路由暂用用户权限范围字段作为入口权限。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/system/permission` |
| 路由名称 | `SystemPermission` |
| 页面组件 | `src/views/system/permission/list.vue` |
| 权限口径 | Admin.UserDataPermission / Admin.UserDataPermission.Get |
| 关键源码 | `src/router/routes/modules/system.ts`<br/>`src/views/system/permission/list.vue`<br/>`src/api/system/*.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **列表/页面访问：** 通过 `/system/permission` 进入 `权限管理` 页面。
- **模块权限搜索：** 在「模块权限」Tab 顶部输入关键词，按权限显示名称或权限码（如 `Admin.User.Get`）前端过滤树节点；保留命中节点的父级路径并自动展开；无匹配时提示「未找到匹配的权限」。切换角色/用户或 Tab 时搜索词自动清空。搜索仅影响树展示，保存时仍提交全量已选权限（含不可见节点）。
- **系统配置维护：** 按页面职责维护用户、角色、组织、工作流、枚举或缓存信息。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作  | 目标状态 | 状态说明                           |
| :------- | :----------- | :------- | :--------------------------------- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **权限码** | 控制页面可见与访问。 | `src/router/routes/modules/system.ts` | **触发/依赖：** 经 `abpPageAuthority` 转换后参与动态路由过滤。 | 用户必须具备对应权限码。 |
| **页面数据** | 系统管理页面的列表、表单或配置对象。 | src/views/system/permission/data.ts | **触发/依赖：** 与系统 API 契约联动。 | 字段校验以后端接口为准。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：权限管理一致性]** 系统管理页面影响权限、组织、审批和缓存等底层能力，变更前需确认业务模块依赖。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-06-15 | `Fix` | 修复模块权限搜索后保存时仅保留可见权限、其余权限被清空的缺陷；搜索状态下勾选变更与保存均合并不可见节点的已选权限。 | `VbenTree` 过滤子集时会回写剔除不可见 key 的 modelValue；`handlePermissionsChange` 需按可见/不可见分区合并。 |
| 2026-06-09 | `Feature` | 模块权限 Tab 新增关键词搜索框，支持按显示名称与权限码过滤权限树，无匹配时展示提示文案。 | 前端基于全量 `getAllPermissionsTreeApi` 数据过滤；`checkedPermissions` 与展示树解耦，切换对象/Tab 清空搜索词。 |
| 2026-06-09 | `Fix` | 字段权限列表 `UserPropPermissionAdmin/GetPagedListAsync` 分页参数改为 `pageIndex`/`pageSize`。 | 视图层已传 `page.currentPage`，API 层移除偏移量换算。 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/system/permission` 对应组件 `src/views/system/permission/list.vue`，权限口径为 Admin.UserDataPermission / Admin.UserDataPermission.Get。 |
| 2026-05-30 | `Feature` | 补齐 `Admin.PortCode`、`Admin.LaneCode`、`Admin.CtnCode`、`Admin.CountryCode` 共 20 个权限 i18n 键，权限树可正确显示港口/航线/集装箱/国家模块文案。 | 权限树通过 `getAllPermissionsTreeApi($t)` 将权限码 `.` 转 `_` 后查找 `auth.json`；新增后端权限需同步双语语言包。 |
