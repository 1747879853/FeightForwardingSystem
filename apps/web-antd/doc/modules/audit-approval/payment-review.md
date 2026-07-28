---
title: 付费审批
module: 审核审批
author: auto-doc-sync
last_updated: 2026-07-29
---

# 1. 业务背景说明 (Background)

**白话解释：** 财务或审批人集中处理付款申请审批任务。选中列表中的申请后，可在同页查看费用合计、附件与费用明细，再执行「审核全部」或「批量驳回」。菜单文案由「付费审核」更名为「付费审批」。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/audit-approval/payment-review` |
| 路由名称 | `PaymentReview` |
| 页面组件 | `src/views/audit-approval/payment-review/index.vue` |
| 详情布局组件 | `src/views/audit-approval/payment-review/detail-panel.vue` |
| 权限口径 | Admin.PaymentApplication.Audit / Admin.PaymentApplication.Audit.Get |
| 关键源码 | `src/views/audit-approval/payment-review/index.vue`<br/>`src/views/audit-approval/payment-review/detail-panel.vue`<br/>`src/views/audit-approval/payment-review/data.ts`<br/>`src/api/audit-approval/payment-review-admin.ts`<br/>`src/api/settlement-management/payment-application-admin.ts`<br/>`src/views/fee-management/payment-application/form-data.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **付款审核查询：** 按编号（主提单号/订舱编号/委托编号，`TrimInput`）、申请单号、结算对象、币别、提交/审核时间等条件查询审核任务列表。
- **选中查看详情：** 点击列表行，右侧展示该付款申请的费用合计与结算银行（只读），下方通铺费用明细分组表（只读），附件区展示已上传文件（只读预览）。
- **费用合计展示：** 原币多币别时以紧凑列表展示（币别+金额一行，银行信息单行缩略，悬停看全量）；合计区按内容限高，避免挤占附件区。
- **审核全部：** 对当前列表页全部任务弹出备注框后批量通过（`payAppAudit`，`success: true`）。
- **批量驳回：** 对当前列表页全部任务弹出备注框后批量驳回（`payAppReject`）。

**页面布局：**

```
┌─────────────────────┬──────────────────┐
│  审核任务列表        │  费用合计（占满剩余高度）│
│                     ├──────────────────┤
│                     │  附件信息         │
├─────────────────────┴──────────────────┤
│           费用明细（整行通铺）            │
└────────────────────────────────────────┘
```

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| 审核中 | 审核人点击「审核全部」 | 已通过/部分通过 | 任务 `taskStatus` 由后端工作流更新 |
| 审核中 | 审核人点击「批量驳回」 | 已驳回 | 需填写备注 |
| 任意 | 点击列表行 | 详情已加载 | 按 `paymentApplicationId` 拉取 `DetailAsync` |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **paymentApplicationId** | 付款申请主键，驱动详情加载。 | 列表 `PayAppTaskListAsync` | **触发/依赖：** 点击行 → `DetailAsync` | 无则详情区显示空态 |
| **编号（Keyword）** | 按主提单号 / 订舱编号 / 委托编号检索。 | 查询 schema `Keyword`（`TrimInput`） | **触发/依赖：** 输入即时 trim；label「编号」，placeholder「主提单号/订舱编号/委托编号」。 | 可清空 |
| **id（任务）** | 审核任务 ID，用于 Audit/Reject 接口。 | 列表 `PayAppTaskListAsync` | **触发/依赖：** 批量审核提交 | 列表为空时提示选择 |
| **费用合计** | 各币别申请金额与结算银行。 | `DetailAsync` → `currencyGroup` | 原币/指定币别两种展示模式 | 只读 |
| **附件** | 按附件明细类型分组展示文件；另含结算附件。 | `DetailAsync` → `attachmentGroup`（含 `attachmentDtlType`）/ `paymentSettlementAttachments` | 点击打开/预览 | 只读 |
| **费用明细** | 按业务+结算对象分组的费用行。 | `DetailAsync` → `payAppFeeBySeaExportGroup` | 复用付费申请 `form-data` 分组逻辑 | 只读 |
| **审核意见** | 通过或驳回备注。 | 审核弹窗输入 | 写入 `AuditAsync` / `RejectAsync` | 建议驳回时填写 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：任务 ID 与申请 ID 不可混用]** 详情接口使用 `paymentApplicationId`；审核接口使用任务行 `id`，批量操作时勿传错字段。

> [!IMPORTANT] **[卡点 2：批量操作范围为当前页]** 「审核全部」「批量驳回」取 `grid.getTableData().tableData`，仅覆盖当前分页数据，非全库全选。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-07-29 | `Fix` | 右侧费用合计改为紧凑列表；附件按类型分组回显；嵌套费用子表宽度 +100px。 | 见 `change-log-2026-07-29-payment-review-fee-summary-layout.md`。 |
| 2026-07-12 | `Fix` | 查询「单号」改为「编号」，placeholder 统一为「主提单号/订舱编号/委托编号」；改用 `TrimInput` 自动去空格。 | 见 `change-log-2026-07-12-workspace-keyword-trim-checkbox.md`。 |
| 2026-07-11 | `Refactor` | 侧边栏菜单文案由「付费审核」更名为「付费审批」，路由 path 与审核逻辑不变。 | `auditApproval.json` 中 `paymentReview.title` 更新；`audit-approval.ts` `order` 调整为 210。 |
| 2026-06-28 | `Feature` | 重构为主从布局：上左列表、上右费用合计+附件、下通铺费用明细；工具栏仅保留审核全部与批量驳回。 | 新增 `detail-panel.vue` 统一布局与详情加载；复用 `payment-application/form-data.ts` 保证合计/明细口径一致；`paymentApplicationId` 与任务 `id` 职责分离。 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；权限口径为 Admin.PaymentApplication.Audit / Admin.PaymentApplication.Audit.Get。 |
