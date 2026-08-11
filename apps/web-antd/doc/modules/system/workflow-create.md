---
title: 工作流新建
module: 系统管理
author: auto-doc-sync
last_updated: 2026-08-11
---

# 1. 业务背景说明 (Background)

**白话解释：** 创建审批工作流，配置任务类型（费用提交/变更、付费申请、业务联系单）、条件和审批节点。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/system/workflow/create` |
| 路由名称 | `SystemWorkflowCreate` |
| 页面组件 | `src/views/system/workflow/form.vue` |
| 权限口径 | Admin / Admin.Get |
| 关键源码 | `src/router/routes/modules/system.ts`<br/>`src/views/system/workflow/form.vue`<br/>`src/api/system/workflow-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **列表/页面访问：** 通过 `/system/workflow/create` 进入 `工作流新建` 页面。
- **任务类型：** 顶部可选费用提交、费用变更、付费申请、**业务联系单（PreOrder=8）**（不再提供「费用删除」）。
- **条件分支：** 条件字段随任务类型切换。费用提交与费用变更共用同一套费用条件；付费申请为 3001/3002；业务联系单为 8001/8002。未选任务类型时条件抽屉给出提示且无可选字段。
- **条件值输入：** 按字段自动切换为用户下拉、组织下拉、枚举下拉、数值输入，或「无需填值」（是/不是类条件）。
- **系统配置维护：** 按页面职责维护用户、角色、组织、工作流、枚举或缓存信息。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作  | 目标状态 | 状态说明                           |
| :------- | :----------- | :------- | :--------------------------------- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **taskTypeCondition** | 条件字段。费用类：业务所属人(1)、业务所属组织(2)、收付类型(4)、业务类型(5)、利润(6)、利润率%(7)、存在应收小于应付的费用名(8)、存在应付有但应收缺失的费用名(9)、存在应收有但应付缺失的费用名(10)；付费申请 3001/3002；业务联系单 8001/8002。 | `getTaskTypeConditionOptions(taskType)` | **触发/依赖：** 由顶部任务类型决定可选项；切换字段会重置介词与值。 | 必选；已废弃的段位值 0/1000/2000/3000 不再可选。 |
| **shouldBe** | 条件介词。 | `getShouldBeOptionsForCondition(field)` | **触发/依赖：** 用户=等于/不等于；组织=属于/不属于；枚举=等于/不等于；数值=大于/大于等于/小于/小于等于；是否类=是/不是。 | 必选，且必须落在该字段允许的介词集合内。 |
| **value / valueText** | 条件被比较值与其展示文案。 | 用户/组织下拉、收付类型与业务类型枚举、数值输入 | **触发/依赖：** 由 `getConditionValueKind` 决定输入形态；`none` 类条件提交 `value=null`。 | 除 `none` 类外必填；用户/组织 ID 全链路保持字符串。 |
| **权限码** | 控制页面可见与访问。 | `src/router/routes/modules/system.ts` | **触发/依赖：** 经 `abpPageAuthority` 转换后参与动态路由过滤。 | 用户必须具备对应权限码。 |
| **页面数据** | 系统管理页面的列表、表单或配置对象。 | src/views/system/workflow/form.vue | **触发/依赖：** 与系统 API 契约联动。 | 字段校验以后端接口为准。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：工作流新建一致性]** 系统管理页面影响权限、组织、审批和缓存等底层能力，变更前需确认业务模块依赖。

> [!IMPORTANT] **[卡点 2：条件必须先定任务类型]** 未选任务类型时条件字段无可选项，抽屉会提示「请先在页面顶部选择任务类型」。手动切换任务类型会**清空所有分支已配好的条件**并标红提示（各类型字段集互不相通）；打开抽屉时也会丢弃不属于当前类型或已废弃段位的历史条件。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-08-11 | `Fix` | 与编辑页共用转换器：只配「或条件」的分支保存后不再有一条被改判为「且条件」；画布条件文案改为分组写法 | 同 `workflow-edit-id`：`converter.uiConditionsToApi` 去掉按下标强制首条 `isOr: false`，`func.conditionStr` 按 `isOr` 分组拼串 |
| 2026-08-08 | `Feature` | 条件字段对齐后端新枚举：费用提交/费用变更共用 9 个费用条件（所属人、所属组织、收付类型、业务类型、利润、利润率%、三类应收应付费用名判断），值输入按字段自动切换；切换任务类型会清空旧条件 | 新增 `getConditionValueKind` / `getConditionEnumOptions` / `getShouldBeOptionsForCondition` 等元数据函数；抽屉值区抽为 `condition-value-input.vue`；`converter` 回显时用户/组织 ID 保持字符串；`form.vue` 用 Select 的 `@change`（而非 watch）做条件清理以避开详情加载 |
| 2026-08-08 | `Feature` | 「费用修改」展示名改为「费用变更」 | 仅改 `getTaskTypeOptions` / `getTaskTypeConditionOptions` 文案，枚举值不变 |
| 2026-08-08 | `Feature` | 任务类型下拉移除「费用删除」；枚举值保留兼容历史数据 | `getTaskTypeOptions` / `getTaskTypeConditionOptions` 同步去掉 DeleteOrderFee 可选项 |
| 2026-07-26 | `Feature` | 任务类型增加「业务联系单」`TaskType.PreOrder=8`；条件抽屉支持申请人/组织（8001/8002） | 与编辑页共用 `form.vue` + `getTaskTypeOptions`；`store.taskType` 驱动条件字段；同值对齐 `FrightModule.PreOrder` |
| 2026-07-24 | `Fix` | 与编辑页共用转换器：审核人选用户/角色时不提交 `userAttribute: 0`。 | 同 `workflow-edit-id`：`buildAuditors` + `sanitizeAuditorForApi`。 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/system/workflow/create` 对应组件 `src/views/system/workflow/form.vue`，权限口径为 Admin / Admin.Get。 |
