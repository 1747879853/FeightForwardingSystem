---
title: 监装要求
module: 基础资料
author: auto-doc-sync
last_updated: 2026-08-22
---

# 1. 业务背景说明 (Background)

**白话解释：** 海运出口一票货装集装箱时，客户或公司内部会提一堆具体要求（装箱前拍空箱内壁照、货物码放需加护角、装完贴封条并拍照）。这些要求是**可复用模板**，不必每票重打一遍。本页维护「一条要求名 + 若干条明细」，监装工单开单时勾选其中的明细。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/basic-data/loading-requirement` |
| 路由名称 | `BasicDataLoadingRequirement` |
| 页面组件 | `src/views/system/basic-data/LoadingRequirementAdmin/list.vue` |
| 权限口径 | Admin.LoadingRequirement / .Add / .Get / .Edit / .Delete |
| 关键源码 | `src/router/routes/modules/basic-data.ts`<br/>`src/views/system/basic-data/LoadingRequirementAdmin/list.vue`<br/>`src/views/system/basic-data/LoadingRequirementAdmin/data.ts`<br/>`src/views/system/basic-data/LoadingRequirementAdmin/modules/form.vue`<br/>`src/api/system/base-data/loading-requirement-admin.ts` |

后端文档：`D:\code\Freight\aspnet-core\文档\监装\监装要求模块接口文档.md`（业务规则见同目录总逻辑文档）。

# 2. 功能与操作说明 (Features & Operations)

- **列表维护：** 按关键字查询，展示要求名、排序、明细数、备注、创建人、创建时间。**列表默认按主表 `SortId` 升序**（不是别处常见的创建时间倒序），列表**不做展开行**。
- **抽屉表单：** 主表填要求名、排序（数字框，前端填）、备注；下方「要求明细」可增删行表格，列为名称、备注。
- **子表全量提交：** 编辑时保留行带 `id`、新增行 `id: null`、删除行直接从数组移除；**明细不传 `sortId`**，顺序由行顺序决定，后端按下标自增并按其升序返回。
- **业务复用：** 监装工单详情返回**全部**监装要求，明细上带 `isChecked`，管理端勾选界面直接回填；师傅端只返回勾选了的明细。

# 3. 状态流转说明 (Status Transitions)

本模块为基础资料，无状态机。

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |
| 要求存在 | 操作员删除要求 | 删除成功 | 主表软删除，明细同步删除。 |
| 明细从编辑数组移除 | 提交编辑 | 删除成功 | 该明细被删除。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **要求名（name）** | 模板名称，监装工单里按它分组展示。 | `LoadingRequirementAdmin` | 列表与工单勾选界面的分组标题。 | **必填**，最长 128；**全表唯一**（去空格、忽略大小写，编辑排除自身），重复时后端报 `监装要求名【xxx】已存在`。 |
| **排序（sortId）** | 主表排序，**前端输入**。 | `LoadingRequirementAdmin` | 列表默认 `SortId ASC`；工单勾选界面按其升序分组。 | 选填，整数，不填为 `0`。 |
| **备注（remark）** | 补充说明。 | `LoadingRequirementAdmin` | 无。 | 选填，最长 1024。 |
| **要求明细（loadingRequirementItems）** | 具体检查项，工单勾选的最小单位。 | 列表/详情随主表返回，按 `sortId` 升序 | 工单提交 `loadingRequirementItemIds` 即这些明细的 id。 | 名称**必填**、最长 128、**同一条要求内**不重名；备注最长 1024。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：两个 SortId 不是一回事]** 主表 `sortId` 前端填、传什么存什么；明细 `sortId` 后端按提交数组顺序整体重排，入参里**没有**这个字段，UI 不要做明细排序输入框。

> [!IMPORTANT] **[卡点 2：明细全量覆盖]** 编辑只提交部分明细会导致未提交行被后端删除，必须回填并提交完整列表。

> [!IMPORTANT] **[卡点 3：默认排序不同于其它基础资料]** 后端默认 `SortId ASC`，列表 `createPagedListQuery` 显式传 `defaultSort: 'SortId ASC'`；抄成 `CreationTime DESC` 会与产品预期相反。

> [!IMPORTANT] **[卡点 4：当前无引用校验]** 后端删除暂不校验是否被监装工单引用，任何一条都能删掉。工单大规模上线后后端会补拦截。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-08-22 | `Feature` | 新增「监装要求」基础资料模块：列表 + Drawer 主子表维护，权限 `Admin.LoadingRequirement.*`。 | TAPD #1000122 监装前置改造。主表 `sortId` 前端填、子表后端按数组下标生成；列表默认 `SortId ASC`。详见 `changelogs/change-log-2026-08-22-loading-supervision-frontend.md`。 |
