---
title: 对账单编辑
module: 费用管理
author: auto-doc-sync
last_updated: 2026-07-21
---

# 1. 业务背景说明 (Background)

**白话解释：** 编辑已有对账单，在状态允许时调整主信息和费用明细。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/fee-management/statement/:id/edit` |
| 路由名称 | `StatementEdit` |
| 页面组件 | `src/views/fee-management/statement/editor.vue` |
| 权限口径 | Admin.Statement / Admin.Statement.Get |
| 关键源码 | `src/router/routes/modules/fee-management.ts`<br/>`src/views/fee-management/fee-lock/fee-lock-list.vue`<br/>`src/views/fee-management/fee-lock/fee-lock-data.ts`<br/>`src/views/fee-management/payment-application/list.vue`<br/>`src/views/fee-management/payment-application/form.vue`<br/>`src/views/fee-management/payment-application/data.ts`<br/>`src/views/fee-management/statement/index.vue`<br/>`src/views/fee-management/statement/editor.vue`<br/>`src/views/fee-management/statement/data.ts`<br/>`src/api/settlement-management/payment-application-admin.ts`<br/>`src/api/settlement-management/statement-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **加载对账单：** 按 ID 加载对账主表和明细。
- **调整明细：** 状态允许时维护费用行。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作  | 目标状态 | 状态说明                           |
| :------- | :----------- | :------- | :--------------------------------- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **对账单 ID** | 编辑上下文主键。 | 路由动态段 `:id` | **触发/依赖：** 用于加载对账详情。 | 必须有效。 |
| **对账状态** | 控制编辑能力。 | `statement/data.ts` | **触发/依赖：** 影响是否允许增删费用。 | 已确认或后续结算状态需限制修改。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：对账单编辑一致性]** 编辑对账单要避免破坏已确认或已结算数据。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-08-09 | `Refactor` | 对账单头客户、币别汇总卡片、费用明细行的费用代码/币别/结算对象全部改读嵌套对象。 | `clientName` 取自 `detail.client?.name`；`collectCurrenciesByFeeConfirm` / `collectCurrenciesByInit` / `fee-summary-card` 统一用 `fee.currency?.cnName ?? fee.currency?.code`；`mapDetailToFeeRows` 改读 `feeCode?.cnName` / `currency?.cnName` / `settlement?.name`。打印占位符改绑 `Client.Name`/`Client.FullName`。详见 `changelogs/change-log-2026-08-09-order-fee-statement-foreign-key-objectification.md`。 |
| 2026-07-21 | `Feature` | 全局打印弹窗底部改为分裂式「打印」按钮；打印 PDF 新窗口打开（对账单打印复用）。 | 与海出共用 `print-format-modal` / `use-print-format`：`DropdownButton` + `window.open`。 |
| 2026-07-20 | `Feature` | 顶栏「打印」由占位 `message.info` 接入全局打印：按对账单 id 由后端取数生成 PDF/Excel/Word 预览与导出；未保存时提示先保存。 | `handlePrint` 调用全局 `usePrintFormat().openPrint({ printJsonType: StatementDetail(11000), detailInput: { id: editId } })`，取数走 `PrintFormatAdmin/GetPrintAsync` → `StatementAdmin/DetailAsync`；对账单跨票无单一签单方式/船公司/分公司，模板筛选三要素留空（命中"相等或为空"的通用模板）。详见 `changelogs/change-log-2026-07-20-print-format-backend-fetch-getprint.md`。 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/fee-management/statement/:id/edit` 对应组件 `src/views/fee-management/statement/editor.vue`，权限口径为 Admin.Statement / Admin.Statement.Get。 |
