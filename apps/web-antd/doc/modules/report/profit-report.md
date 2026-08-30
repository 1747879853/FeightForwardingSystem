---
title: 利润报表
module: 报表
author: auto-doc-sync
last_updated: 2026-08-30
---

# 1. 业务背景说明 (Background)

**白话解释：** 按业务票统计一段时间内的应收、应付与利润，支持按委托单位、销售、船公司、港口等维度筛选与分组，是业务与财务复盘利润的主表。

一张报表可以跨多个公司查询，**每一行的合计金额都以该票主单所属公司的本位币计价**，不同行的币种可能不一样。

# 2. 功能与操作说明 (Features & Operations)

- **查询：** 页面打开自动查一次（全量不分页）；查询前按业务类型自动补齐港口类型参数（`polIsSeaPort` / `podIsSeaPort`）。
- **分组：** 右键列标题「添加到分组」，可多级分组；分组标签可拖拽调序。合计列（`total*`）不允许作为分组维度。
- **合计行：** 固定在表格底部，对所有数值列累加。
- **导出：** 导出当前列（含未展开分组的完整数据）为 Excel。
- **双击行：** 按 `bizType` 跳转对应业务编辑页。

# 3. 状态流转说明 (Status Transitions)

本页为只读报表，无状态流转。

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **本位币** | 合计列金额的计量单位 | **报表**<br/>`ReportAdmin/GetProfitReportListAsync` → 行级 `localCurrencyCode` | 取主单 `orgId` 所属公司配置的本位币；主单无组织 / 未归属公司 / 公司未配置时为空 | 只读 |
| **合计应收 / 合计应付 / 合计利润** | 该票折算到本位币后的汇总金额 | 同上，行级 `totalReceivable` / `totalPayable` / `totalProfit` | 单位见「本位币」列，**不要写死 CNY** | 只读 |
| **利润率(%)** | `totalProfitRate`，存储为小数，展示时 ×100 | 同上 | 分组/合计行按「利润 ÷ 应付」重算，不是简单平均 | 只读 |
| **`${币别}应收/应付/利润`** | 按原币展开的明细列 | 行级 `currencies[]` | 列随查询结果动态生成，键规则 `${code}_${field}` | 只读 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：合计列不是人民币]** 合计列以本行本位币计价。列标题不允许写死 `(CNY)`，必须配合前置的「本位币」列一起看。

> [!IMPORTANT] **[卡点 2：跨本位币不加总]** 分组行与合计行会先看下辖数据行的本位币：只有一种时正常累加并显示该币种；出现多种时「本位币」显示「多币别」，`total*` 全部置 `-`（利润率置 null），不做跨币别加总。币别明细列本身按原币分列，不受影响。

> [!IMPORTANT] **[卡点 3：权限]** 无 `Admin.Report.Profit.Get` 时查询被 `beforeQuery` 拦截并提示，不会发请求。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-08-30 | `Feature` | 合计列新增前置「本位币」列，列标题去掉写死的 `(CNY)`；分组行/合计行遇到多种本位币时显示「多币别」并停止加总。 | 后端报表返回体虽不继承 `DataPermissionFullAuditedEntityDto`，但行级同样下发了 `localCurrencyId` / `localCurrencyCode`（口径：主单 `orgId` → 所属公司 → 本位币）。列与聚合逻辑收在 `_shared/hot-columns.ts`（`localCurrencyColumn` / `blankMixedCurrencyTotals`）与 `report-hot-table.vue` 的 `applyLocalCurrencyToAggregate`，两张报表共用，新增报表照抄即可。详见 `changelogs/change-log-2026-08-30-data-permission-local-currency.md`。 |
