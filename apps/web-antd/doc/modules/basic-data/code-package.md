---
title: 包装代码
module: 基础资料
author: auto-doc-sync
last_updated: 2026-08-22
---

# 1. 业务背景说明 (Background)

**白话解释：** 维护包装类型代码，支撑件数、包装等货物字段。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/basic-data/code-package` |
| 路由名称 | `BasicDataCodePackage` |
| 页面组件 | `src/views/system/basic-data/CodePackageAdmin/list.vue` |
| 权限口径 | Admin.CodePackage / Admin.CodePackage.Get |
| 关键源码 | `src/router/routes/modules/basic-data.ts`<br/>`src/views/system/basic-data/CodePackageAdmin/list.vue`<br/>`src/views/system/basic-data/CodePackageAdmin/data.ts`<br/>`src/views/system/basic-data/CodePackageAdmin/modules/form.vue`<br/>`src/api/system/base-data/code-package-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **列表维护：** 在 `包装代码` 页面查询、创建、编辑和删除基础资料。列表**不做展开行**，明细包装只在抽屉里看和改。
- **抽屉表单：** `CodePackageAdmin/modules/form.vue` 为 Drawer（对齐商品信息），主表字段下方维护「明细包装」可增删行表格（名称、备注）。
- **明细包装子表：** 随主表一次提交 `codePackageItems`；编辑为全量覆盖（保留行带 `id`、新增 `id: null`、删除行从数组移除）；**子表不传 `sortId`**，顺序由行顺序决定，后端按下标自增并按其升序返回。监装工单的「明细包装」下拉即取自本子表。
- **业务复用：** 海出/海进/空出/分单/集装箱等包装下拉共用 `CodePackageSelect`，全量缓存后前端搜索；本页增删改成功会强制刷新缓存。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作  | 目标状态 | 状态说明                           |
| :------- | :----------- | :------- | :--------------------------------- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **编码** | 基础资料唯一或半唯一识别字段。 | `src/views/system/basic-data/CodePackageAdmin/data.ts` | **触发/依赖：** 被业务单据或下拉组件引用。 | 唯一性和格式以后端为准。 |
| **名称** | 给业务用户识别的显示值。 | `src/views/system/basic-data/CodePackageAdmin/data.ts` | **触发/依赖：** 列表、表单、下拉组件共同展示。 | 通常不能为空。 |
| **启用状态** | 控制资料是否可被业务选择。 | `src/api/system/base-data/*.ts` | **触发/依赖：** 禁用后不应继续作为新业务选择项。 | 历史单据展示需兼容旧值。 |
| **明细包装（codePackageItems）** | 该包装类型下的细分规格，如 A 型纸箱。 | `CodePackageAdmin` 列表/详情随主表返回，按 `sortId` 升序 | **触发/依赖：** 监装工单按已保存主单包装取本子表作为下拉源。 | 名称**必填**、最长 128、同包装下不重名（去空格、忽略大小写）；备注最长 1024。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：包装代码一致性]** 基础资料页面同质性高，但字段变更会影响大量业务下拉，需谨慎维护编码和启用状态。删除后须刷新 `codePackageListCache`，否则业务下拉在静默刷新完成前仍可能搜到旧项。

> [!IMPORTANT] **[卡点 2：明细包装全量覆盖]** 编辑只提交部分明细会导致未提交行被后端删除，必须回填并提交完整列表。删除主表会级联删除全部明细。

> [!IMPORTANT] **[卡点 3：业务对象不带明细]** 其它模块返回的 `codePackage` 是 `CodePackageSimpleDto`（仅 `id`/`name`/`ediCode`），需要明细必须单独调本模块详情。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-08-22 | `Feature` | 新增「明细包装」子表；表单由 Modal 改 Drawer；列表不做展开行。 | TAPD #1000122 监装前置改造。子表 `sortId` 由后端按数组下标生成，UI 无排序列；编辑全量覆盖。详见 `changelogs/change-log-2026-08-22-loading-supervision-frontend.md`。 |
| 2026-08-19 | `Fix` | 包装下拉改为全量缓存；本页删除/保存后业务单据下拉立刻搜不到已删包装。 | `codePackageListCache` + `useCachedSelect`，与 UserSelect 同构；维护页 `ensure({ force: true })`。详见 `changelogs/change-log-2026-08-19-code-package-select-full-cache.md`。 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/basic-data/code-package` 对应组件 `src/views/system/basic-data/CodePackageAdmin/list.vue`，权限口径为 Admin.CodePackage / Admin.CodePackage.Get。 |
