---
title: 工作流编辑
module: 系统管理
author: auto-doc-sync
last_updated: 2026-08-08
---

# 1. 业务背景说明 (Background)

**白话解释：** 编辑已有审批工作流，维护节点、条件和适用任务类型（费用提交/变更、付费申请、业务联系单；不含费用删除）。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/system/workflow/edit/:id` |
| 路由名称 | `SystemWorkflowEdit` |
| 页面组件 | `src/views/system/workflow/form.vue` |
| 权限口径 | Admin / Admin.Get |
| 关键源码 | `src/router/routes/modules/system.ts`<br/>`src/views/system/workflow/form.vue`<br/>`src/api/system/workflow-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **列表/页面访问：** 通过 `/system/workflow/edit/:id` 进入 `工作流编辑` 页面。
- **任务类型：** 可改选费用提交、费用变更、付费申请、**业务联系单（PreOrder=8）**（不再提供「费用删除」）；条件字段随任务类型切换（费用提交与费用变更共用同一套费用条件）。
- **条件值回显：** 用户/组织条件回显保持字符串 ID（雪花 ID 防精度丢失），枚举与数值条件回显为数字；是/不是类条件无值。
- **改任务类型的副作用：** 手动切换任务类型会清空所有分支已配好的条件并标红，需重新设置后才能保存。
- **系统配置维护：** 按页面职责维护用户、角色、组织、工作流、枚举或缓存信息。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作  | 目标状态 | 状态说明                           |
| :------- | :----------- | :------- | :--------------------------------- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **权限码** | 控制页面可见与访问。 | `src/router/routes/modules/system.ts` | **触发/依赖：** 经 `abpPageAuthority` 转换后参与动态路由过滤。 | 用户必须具备对应权限码。 |
| **页面数据** | 系统管理页面的列表、表单或配置对象。 | src/views/system/workflow/form.vue | **触发/依赖：** 与系统 API 契约联动。 | 字段校验以后端接口为准。 |
| **auditors.userAttribute** | 审核人按用户属性解析时的属性值。 | `WorkFlowAdmin/EditAsync` 节点 `auditors` | **触发/依赖：** 审批抽屉选「用户属性」时写入；选用户/角色不带该字段。提交前 `sanitizeAuditorForApi` 剥离 `0`。 | 仅非 0 有效值可出现在请求体。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：工作流编辑一致性]** 系统管理页面影响权限、组织、审批和缓存等底层能力，变更前需确认业务模块依赖。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-08-08 | `Feature` | 条件字段对齐后端新枚举（费用类共用 9 个条件），值输入按字段切换；改任务类型会清空原有条件 | 与新建页共用抽屉；历史工作流若存有废弃段位值 0/1000/2000/3000，打开条件抽屉即被丢弃，需重新配置 |
| 2026-08-08 | `Feature` | 「费用修改」展示名改为「费用变更」 | 与新建页共用 `getTaskTypeOptions` 文案 |
| 2026-08-08 | `Feature` | 任务类型下拉移除「费用删除」；枚举值保留兼容历史数据 | 与新建页共用 `getTaskTypeOptions` |
| 2026-07-26 | `Feature` | 任务类型增加「业务联系单」`TaskType.PreOrder=8`；条件抽屉支持申请人/组织（8001/8002） | 与新建页共用 `form.vue`；`store.taskType` 驱动条件字段；同值对齐 `FrightModule.PreOrder` |
| 2026-07-24 | `Fix` | 审核人选用户/角色时不再提交 `userAttribute: 0`，仅选用户属性时带上该字段。 | 组装在 `approver-drawer.buildAuditors`，出口清洗在 `converter.sanitizeAuditorForApi`。 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/system/workflow/edit/:id` 对应组件 `src/views/system/workflow/form.vue`，权限口径为 Admin / Admin.Get。 |
