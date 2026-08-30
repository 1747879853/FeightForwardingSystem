---
title: 欠费报表
module: 报表
author: auto-doc-sync
last_updated: 2026-08-30
---

# 1. 业务背景说明 (Background)

**白话解释：** 按业务票统计应收（或应付）的已收、未收金额与超期天数，用于催收与付款排期。筛选维度在利润报表基础上增加收付类型、结算对象、结算状态、付费申请状态、开票状态、是否对账、费用锁定。

与利润报表一样，**每一行的合计金额都以该票主单所属公司的本位币计价**，跨公司查询时不同行币种可能不同。

# 2. 功能与操作说明 (Features & Operations)

- **收付类型：** 默认「应收」，不可清空；切换到「应付」时列语义变为已付/未付（列标题为「应收/应付」双写）。
- **查询 / 分组 / 合计 / 导出 / 双击跳转：** 与利润报表一致，均由 `_shared/report-page.vue` 模板承载。
- **超期天数：** 负数（未到期）绿色、0（当天到期）黄色、正数（超期）红色。

# 3. 状态流转说明 (Status Transitions)

本页为只读报表，无状态流转。

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **本位币** | 合计列金额的计量单位 | **报表**<br/>`ReportAdmin/GetArrearsReportListAsync` → 行级 `localCurrencyCode` | 取主单 `orgId` 所属公司配置的本位币；主单无组织 / 未归属公司 / 公司未配置时为空 | 只读 |
| **合计应收/应付、已收/已付、未收/未付** | 该票折算到本位币后的汇总金额 | 同上，行级 `totalReceivable` / `totalReceived` / `totalUnReceived` | 单位见「本位币」列，**不要写死 CNY** | 只读 |
| **超期天数** | `overdueDays` | 同上 | 按颜色分档展示 | 只读 |
| **结算对象** | `settlement.name` | 同上 | 也可作为查询条件 | 只读 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：合计列不是人民币]** 同利润报表，合计列以本行本位币计价，必须配合「本位币」列展示。

> [!IMPORTANT] **[卡点 2：跨本位币不加总]** 分组行与合计行在下辖数据行存在多种本位币时显示「多币别」并把 `total*` 置为 `-`。

> [!IMPORTANT] **[卡点 3：权限按收付类型分开]** 应收需 `Admin.Report.Arrears.Receive.Get`，应付需 `Admin.Report.Arrears.Pay.Get`；无权限时 `beforeQuery` 拦截。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-08-30 | `Feature` | 合计列新增前置「本位币」列，列标题去掉写死的 `(CNY)`；分组行/合计行遇到多种本位币时显示「多币别」并停止加总。 | 与利润报表共用 `_shared` 的列工厂与聚合逻辑，本页只在 `config.ts` 的 `totalHotColumns` 首位加 `localCurrencyColumn()` 并改标题。详见 `changelogs/change-log-2026-08-30-data-permission-local-currency.md`。 |
