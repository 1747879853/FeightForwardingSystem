---
title: 权限管理
module: 系统管理
author: auto-doc-sync
last_updated: 2026-07-29
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

- **数据权限 Tab：** 为当前选中的角色/用户维护 `UserDataPermission` 主规则；数据范围为「多用户」或「多部门/多公司」时，在弹窗内通过 `UserSelect` / `OrganizationSelect` 多选维护子项，保存时通过 `entityIds` 随主规则一次性提交；列表/详情由后端返回 `items` 子表，支持「查看明细」抽屉回显名称；列表展示明细数。
- **表级权限 Tab：** 为当前选中的角色/用户维护 `UserTablePermission` 主规则及 `UserTablePermissionCondition` 条件子项；主规则仅配置业务模块，条件在抽屉内维护（字段下拉 + 操作符 + 值）；列表展示条件条数，支持「查看条件」只读抽屉；编辑已保存条件仅可改操作符与值。
- **数据权限说明：** 「自己」为系统默认行为，表单中不展示；子表由 `UserDataPermissionAdmin` 统一维护（不再调用 `UserDataPermissionItemAdmin`）；删除主规则会级联删除子表。
- **模块权限文案：** 「模块权限」Tab 节点名称来自 `auth.json`（`auth.${权限码.replaceAll('.','_')}`），**以后端权限接口 `displayName` 为基准**；与左侧菜单 `meta.title` 不一致时，以接口返回为准（菜单文案可另行对齐）。
- **模块权限搜索：** 在「模块权限」Tab 顶部输入关键词，按权限显示名称或权限码（如 `Admin.User.Get`）前端过滤树节点；保留命中节点的父级路径并自动展开；无匹配时提示「未找到匹配的权限」。切换角色/用户或 Tab 时搜索词自动清空。搜索仅影响树展示，保存时仍提交全量已选权限（含不可见节点）。
- **配置对象区布局：** 顶部卡片占满整行；配置类型（角色/用户）与对象下拉横向靠左排列，下拉固定宽度，不随卡片拉满。

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
| 2026-07-29 | `Style` | 顶部配置对象区卡片仍占满，内容改为横向 flex 靠左；角色/用户下拉固定 `w-56`。 | 去掉 `Row`/`Col` 满宽栅格，避免控件被拉满。 |
| 2026-07-24 | `Fix` | 按最新权限接口补齐 13 个缺失 `auth.json` 键（客户失信、业务基础、业务联系单等）；`Admin.ReceiveSettlement` 文案改为「收费结算」。 | `Admin.PersonalSetting` 接口仍返回未本地化占位符，前端已有「个人设置」不改。 |
| 2026-07-19 | `Fix` | 数据/表级/字段权限三个列表分别声明 `gridOptions.id`，避免同路由下列持久化互相覆盖。 | id：`systemPermissionDataList` / `systemPermissionTableList` / `systemPermissionPropList`；适配器优先用 `gridOptions.id` 作 `columnPersist.tableId`。 |
| 2026-07-06 | `Fix` | 按后端权限接口 `displayName` 同步 `zh-CN/auth.json`：更新 99 处文案、新增 16 个缺失键（自动费用模板、第三方接口、船期等）；`en-US` 补充新增键英文翻译。 | 权限树文案来源为 `buildPermissionTree` + `$t('auth.*')`；接口未返回的历史键仍保留以免缺文案。 |
| 2026-07-02 | `Feature` | 数据权限对接统一子表接口：Add/Edit 携带 `entityIds`，列表/详情返回 `items`；移除 `UserDataPermissionItemAdmin` 独立调用；列表新增明细数列。 | 编辑子表增量维护下沉后端；`DetailAsync` 作 items 缺失回退；子表明细名称仍走用户/组织接口回显。 |
| 2026-07-02 | `Feature` | 表级权限 Tab 对接 `UserTablePermissionAdmin` / `UserTablePermissionConditionAdmin`：主规则按模块配置，抽屉内维护条件子项，列表展示条件数；移除无效 `manageType`；分页改为 `pageIndex`/`pageSize`。 | 条件字段元数据前端维护（后端无字段列表接口）；编辑条件仅 `operator`/`value` 生效；`showName`/`showValue` 仅展示用。 |
| 2026-07-02 | `Feature` | 数据权限 Tab 对接 `UserDataPermissionAdmin` / `UserDataPermissionItemAdmin`：支持多用户/多组织子项维护、明细查看、类型变更确认；列表分页改为 `pageIndex`/`pageSize`。 | 子项无批量保存接口，编辑时对比 `entityId` diff 调用 Add/Delete；名称回显依赖用户/组织接口。 |
| 2026-06-16 | `Fix` | 对齐 38 个模块权限键与左侧菜单标题（`auth.json` 双语）；新增 `Admin.SeaImport` 文案；典型修正如用户管理、组织管理、付费申请、对账单、运价管理、应收应付审核等。 | 模块权限 Tab 仅读 `auth.json`；菜单读路由 i18n；新增菜单权限须双向同步。 |
| 2026-06-15 | `Fix` | 修复模块权限搜索后保存时仅保留可见权限、其余权限被清空的缺陷；搜索状态下勾选变更与保存均合并不可见节点的已选权限；补充 `treeCheckedPermissions` 避免 Tree 回写引发递归更新。 | `VbenTree` 过滤子集时会回写剔除不可见 key 的 modelValue；搜索时仅传可见勾选给 Tree，全量集合由 `checkedPermissions` 维护。 |
| 2026-06-09 | `Feature` | 模块权限 Tab 新增关键词搜索框，支持按显示名称与权限码过滤权限树，无匹配时展示提示文案。 | 前端基于全量 `getAllPermissionsTreeApi` 数据过滤；`checkedPermissions` 与展示树解耦，切换对象/Tab 清空搜索词。 |
| 2026-06-09 | `Fix` | 字段权限列表 `UserPropPermissionAdmin/GetPagedListAsync` 分页参数改为 `pageIndex`/`pageSize`。 | 视图层已传 `page.currentPage`，API 层移除偏移量换算。 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/system/permission` 对应组件 `src/views/system/permission/list.vue`，权限口径为 Admin.UserDataPermission / Admin.UserDataPermission.Get。 |
| 2026-05-30 | `Feature` | 补齐 `Admin.PortCode`、`Admin.LaneCode`、`Admin.CtnCode`、`Admin.CountryCode` 共 20 个权限 i18n 键，权限树可正确显示港口/航线/集装箱/国家模块文案。 | 权限树通过 `getAllPermissionsTreeApi($t)` 将权限码 `.` 转 `_` 后查找 `auth.json`；新增后端权限需同步双语语言包。 |
