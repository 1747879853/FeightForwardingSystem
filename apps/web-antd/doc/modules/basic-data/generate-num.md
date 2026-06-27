---
title: 编号规则
module: 基础资料
author: auto-doc-sync
last_updated: 2026-06-27
---

# 1. 业务背景说明 (Background)

**白话解释：** 维护业务编号生成规则，支持组织、用户或全局范围的编号策略。每条主规则下可配置多段子规则，按顺序拼接成最终编号（如 `JS202606170001`）。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/basic-data/generate-num` |
| 路由名称 | `BasicDataGenerateNum` |
| 页面组件 | `src/views/system/basic-data/GenerateNumAdmin/list.vue` |
| 权限口径 | Admin.GenerateNum / Admin.GenerateNum.Get |
| 关键源码 | `src/router/routes/modules/basic-data.ts`<br/>`src/views/system/basic-data/GenerateNumAdmin/list.vue`<br/>`src/views/system/basic-data/GenerateNumAdmin/data.ts`<br/>`src/views/system/basic-data/GenerateNumAdmin/modules/form.vue`<br/>`src/api/system/base-data/generate-num-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **列表维护：** 在 `编号规则` 页面按表名、组织筛选，创建、编辑和删除规则。
- **弹窗表单：** 选择编号规则类型（表名）、适用范围（不限制 / 指定组织 / 指定用户），并维护规则明细卡片列表。
- **规则明细卡片：** 每卡片一行展示当前类型有效字段；可通过上移/下移调整顺序，保存时自动写入 `sortId`。
- **编号预览：** 配置过程中顶部实时展示拼接样例，自增段以 `1` 作为示例。
- **业务复用：** 业务模块调用后端 `GenerateNumAsync` 时按 `tableName + orgId/用户` 匹配规则并生成编号。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作   | 目标状态 | 状态说明                       |
| :------- | :------------ | :------- | :----------------------------- |
| 页面初始 | 用户进入路由  | 列表可用 | 分页拉取编号规则。             |
| 编辑弹窗 | 新增/编辑规则 | 配置中   | 规则卡片顺序即生成顺序。       |
| 保存成功 | 确认提交      | 列表刷新 | `sortId` 按卡片顺序从 0 写入。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **表名** | 编号规则绑定的业务实体字段。 | `GenerateNumAdmin/data.ts` 固定下拉 | 与后端 `Entity.Field` 一致，如 `SeaExport.CommissionNum`、`InvoiceIssue.ApplicationNo`。 | 必选，预置 7 项。 |
| **适用范围** | 规则生效范围：全局 / 组织 / 用户。 | 表单 `applyScope` | 组织与用户互斥；选组织必填 `orgId`，选用户必选至少一人。 | 不可同时设组织与用户。 |
| **生成类型 generateEnum** | 0 自增 / 1 固定文本 / 2 用户名 / 3 yyyyMMdd / 4 yyMMdd。 | 子规则卡片下拉 | 切换类型时清理无效字段；AutoNum 最多 1 条。 | 每条必选类型。 |
| **固定字符串 text** | 固定前缀或中段文本。 | 子规则卡片 | **仅 Text(1) 展示与校验。** | Text 类型必填。 |
| **长度 length** | 自增序号位数，如 4 → `0001`。 | 子规则卡片 | **仅 AutoNum(0) 展示与校验。** | AutoNum 时必填且 > 0。 |
| **重置序号 reset** | 该段值变化时是否令 AutoNum 从 1 重新开始。 | 子规则卡片 Checkbox | **AutoNum 无效**；非 AutoNum 可配置。 | 提交时 AutoNum 固定 `false`。 |
| **排序 sortId** | 子规则拼接顺序。 | 保存时自动生成 | **UI 隐藏**；由上移/下移决定，保存为 `0,1,2...`。 | 预览与生成均按卡片列表顺序。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：必须包含自增规则才能生成]** 保存允许无 AutoNum，但业务调用生成接口会报「未配置自增编号规则」。预览区会提前警告。

> [!IMPORTANT] **[卡点 2：reset 与分组]** `reset=true` 的非 AutoNum 段参与分组键；该段值变化时 AutoNum 换组从 1 开始。`reset=false` 仍出现在编号中但不参与分组。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-06-27 | `Feature` | 编号规则类型新增 `InvoiceIssue.ApplicationNo`（发票申请单号）。 | 选项在 `data.ts` 的 `TABLE_NAME_VALUES` 维护，i18n 键为 `tableNameOptions.InvoiceIssue.ApplicationNo`。 |
| 2026-06-17 | `Fix` | 列表适用组织、适用用户为空时显示「全部生效」，明确全局规则语义。 | 格式化逻辑集中在 `formatGenerateNumOrgDisplay` / `formatGenerateNumUsersDisplay`。 |
| 2026-06-17 | `Feature` | 规则明细改为卡片交互：按生成类型显隐字段、上移下移自动排序、实时编号预览、悬浮删除图标。 | 预览逻辑在 `data.ts` 的 `buildGenerateNumPreview`；提交时 `mapRuleToAdd/Edit` 按 index 写 `sortId`。 |
| 2026-06-17 | `Feature` | 表名字段由自由输入改为固定下拉，可选 6 种业务单号。 | 选项值格式为 `Entity.Field`，与后端 AppService 约定一致。 |
| 2026-05-16 | `Parsing` | 无 | 按动态路由与页面源码重建文档；权限口径 Admin.GenerateNum / Admin.GenerateNum.Get。 |
