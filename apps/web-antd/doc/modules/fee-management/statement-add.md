---
title: 对账单新增
module: 费用管理
author: auto-doc-sync
last_updated: 2026-08-19
---

# 1. 业务背景说明 (Background)

**白话解释：** 创建对账单，选择费用并形成可结算的对账记录。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/fee-management/statement/add` |
| 路由名称 | `StatementAdd` |
| 页面组件 | `src/views/fee-management/statement/editor.vue` |
| 权限口径 | Admin.Statement / Admin.Statement.Get |
| 关键源码 | `src/router/routes/modules/fee-management.ts`<br/>`src/views/fee-management/fee-lock/fee-lock-list.vue`<br/>`src/views/fee-management/fee-lock/fee-lock-data.ts`<br/>`src/views/fee-management/payment-application/list.vue`<br/>`src/views/fee-management/payment-application/form.vue`<br/>`src/views/fee-management/payment-application/data.ts`<br/>`src/views/fee-management/statement/index.vue`<br/>`src/views/fee-management/statement/editor.vue`<br/>`src/views/fee-management/statement/data.ts`<br/>`src/api/settlement-management/payment-application-admin.ts`<br/>`src/api/settlement-management/statement-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **选择费用：** 按对账对象和期间选择可纳入对账的费用。
- **生成对账：** 保存对账单主信息与明细。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作  | 目标状态 | 状态说明                           |
| :------- | :----------- | :------- | :--------------------------------- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **费用行** | 对账单明细来源。 | `add-fee-statement-modal` | **触发/依赖：** 决定对账金额。 | 不得纳入不符合对象或期间的费用。 |
| **对账金额** | 明细费用汇总值。 | `statement/form-data.ts` | **触发/依赖：** 与费用明细联动。 | 需保持币种和金额准确。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：对账单新增一致性]** 新增对账时需防止费用重复进入多个未完成对账单。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-08-19 | `Fix` | 删除已废弃的空文件 `attachment-upload.vue`，附件上传仍用 `FileUploadInput`。 | `views/**/*.vue` 会被路由 glob 扫进构建，空 SFC 会导致 Vite 失败。 |
| 2026-08-09 | `Refactor` | 新增对账时的费用选择弹窗与币别汇总改读费用嵌套对象。 | 与编辑页共用 `editor.vue`；`add-fee-statement-modal` 的 `collectCurrencies`、行映射与内层列渲染改走 `fee.feeCode?.cnName` / `fee.currency?.cnName ?? code` / `fee.settlement?.name`。详见 `changelogs/change-log-2026-08-09-order-fee-statement-foreign-key-objectification.md`。 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/fee-management/statement/add` 对应组件 `src/views/fee-management/statement/editor.vue`，权限口径为 Admin.Statement / Admin.Statement.Get。 |
