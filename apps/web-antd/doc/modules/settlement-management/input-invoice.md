---
title: 进项发票列表
module: 财务管理
author: auto-doc-sync
last_updated: 2026-09-09
---

# 1. 业务背景说明 (Background)

**白话解释：** 进项发票是从税务接口拉回来的进项票台账。财务在这里按票号、购销方、开票日期检索，双击进详情，也可手动触发拉取。付费申请录入发票时可从本台账勾选回填。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/settlement-management/input-invoice` |
| 路由名称 | `InputInvoiceList` |
| 页面组件 | `src/views/settlement-management/input-invoice/list.vue` |
| 权限口径 | `Admin.InputInvoice.Get` |
| 关键源码 | `src/router/routes/modules/settlement-management.ts`<br/>`src/views/settlement-management/input-invoice/list.vue`<br/>`src/views/settlement-management/input-invoice/constants.ts`<br/>`src/api/settlement-management/input-invoice-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **分页检索：** 关键字、发票类型、购销方、开票/创建日期等；日期按自然日闭区间提交。
- **分组统计：** 发票类型、购方名称、销方名称；「未填写」项追加 `*Empty=true`。持久化 `group_config_InputInvoiceList`。
- **手动拉取：** 打开拉取弹窗，成功后 `handlePullSuccess` 重查列表并 `refreshGroupData()`。
- **进入详情：** 双击行进 `/settlement-management/input-invoice/detail/:id`；详情里版式文件附件点开走全站查看器，下载用友好文件名。
- **底部合计：** 当前页含税/不含税/税额合计（进项票均为人民币）。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明                       |
| :------- | :---------- | :------- | :----------------------------- |
| 列表     | 双击行      | 详情页   | 新标签打开详情，本页 keepAlive |
| 列表     | 拉取成功    | 列表刷新 | 新票进入台账，分组条数一并更新 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **发票类型** | 专票/普票等。 | `InputInvoiceGroupField.InvoiceType`；筛 `invoiceType` | **触发/依赖：** 可作为分组维度；未填写走 `invoiceTypeEmpty`。 | 筛选项非必填。 |
| **购方名称** | 购方抬头。 | `payerName` | **触发/依赖：** 分组与搜索互斥。 | 筛选项非必填。 |
| **销方名称** | 销方抬头。 | `sellerHeader` | **触发/依赖：** 分组与搜索互斥。 | 筛选项非必填。 |
| **开票日期** | 按日筛选。 | `invoiceTimeStart` / `invoiceTimeEnd` | **触发/依赖：** 起 `startOf('day')`、止 `endOf('day')`。 | 可空。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：拉取成功必须刷分组]** 只 `gridApi.query()` 会让分组 Tab 条数停留在拉取前。须同时 `grouping.refreshGroupData()`。
>
> **[卡点 2：分组「未填写」走 Empty 参数]** 点击 id/name 为 null 的分组项追加 `invoiceTypeEmpty` / `payerNameEmpty` / `sellerHeaderEmpty`，不要传空字符串当名称。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-09-09 | `Fix` | 详情版式文件附件改为全站查看器预览，不再新开直链。 | 详见 `changelogs/change-log-2026-09-09-attachment-preview-download-unify.md`。 |
| 2026-09-08 | `Fix` | 手动拉取成功后同步刷新分组 Tab 条数。 | `handlePullSuccess` 在 `gridApi.query()` 后调用 `grouping.refreshGroupData()`。详见 `changelogs/change-log-2026-09-08-list-grouping-refresh-after-mutation.md`。 |
