---
title: 业务联系单列表
module: 操作管理 / 业务联系单
author: 前端团队
last_updated: 2026-07-31
---

# 1. 业务背景说明 (Background)

**白话解释：** 业务联系单是海运出口委托的「前置单据」。销售拿到客户意向后，先在这里录入货物、港口、箱型箱量与报价，走审核流程；审核通过后系统自动生成海运出口单，业务才正式进入操作环节。列表页是这些单据的检索入口，也是新建、复制和删除的操作面。

# 2. 功能与操作说明 (Features & Operations)

- **检索：** 支持关键字（业务编号 / 主提单号）、状态、委托单位、起运港、目的港、开船日期区间、创建人。搜索表单默认收起，改动即查询。
- **分组统计：** 工具栏「分组设置」可选委托单位 / 船公司 / 起运港 / 目的港 / 业务类型；启用后左侧展示分组 Tab（含条数，船公司可带 Logo）。点击 Tab 仅向列表追加对应筛选；搜索条件变更时刷新分组。分组字段与同名搜索项互斥。字段选择持久化到 `group_config_PreOrderList`。
- **新建：** 顶部「新建」跳转 `/pre-order/add`。
- **复制：** 勾选一条后点「复制」，跳转 `/pre-order/add?copyFrom=<id>`，新建页拉取源单详情预填业务字段，不带单号与状态。
- **删除：** 支持多选删除；仅「录入状态」与「驳回」可删，前端先拦截再请求。
- **进入单据：** 双击行统一进入 `/pre-order/:id/edit`；是否显示「保存 / 提交审核」由单据状态决定。
- **返回刷新：** 编辑页保存后回到列表会自动刷新（`useRefreshListOnFormReturn`），普通标签切换不重复请求；重新进入列表会刷新分组数据（`onActivated`）。
- **按钮权限：** 新建 / 复制需要 `Admin.PreOrder.Add`，删除需要 `Admin.PreOrder.Delete`；分组查询权限同列表 `Admin.PreOrder.Get`。

# 3. 状态流转说明 (Status Transitions)

列表仅展示状态，不触发流转，流转动作全部在编辑页完成。

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| 录入状态 / 驳回 | 任意有权限用户点「删除」 | 记录消失 | 其余状态点删除会被前端拦截并提示 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **业务编号** | 单据唯一编号 | `PreOrderAdmin/GetPagedListAsync` 的 `preOrderNum` | 保存时后端生成 | 只读 |
| **状态** | 单据生命周期 | `PreOrderStatus` 枚举 | 决定删除是否可用 | 只读，以 Tag 呈现 |
| **委托单位** | 业务委托方 | **客户**<br/>`ClientSelect` | 同时是服务项候选池的过滤条件 | 筛选项非必填 |
| **起运港 / 目的港** | 航段两端 | **港口**<br/>`PortSelect` | 起运港决定服务项候选池；可作为分组维度 | 筛选项非必填 |
| **开船日期** | ETD | `ETDStart` / `ETDEnd` | 前端把区间拆成两个 ISO 时间参数 | 筛选项非必填 |
| **分组字段（GroupField）** | 分组统计维度 | `GetGroupedListAsync` 入参；`PreOrderGroupField`：3 委托单位 / 4 船公司 / 5 起运港 / 6 目的港 / 11 业务类型 | 启用后对应搜索项禁用；点击 Tab 追加 `paramKey` | 同时只能启用一个 |
| **未填写筛选（\*Empty）** | 仅返回某可空字段为空的记录 | `CarrierIdEmpty` / `POLIdEmpty` / `PODIdEmpty` | 点击 id 为 null 的「未填写」分组项时追加 | 与同名 id 参数互斥 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：删除受状态限制]** 勾选行中存在非「录入状态 / 驳回」的记录 -> 提示「仅『录入状态』或『驳回』的业务联系单可删除」并终止，不发请求。

> [!IMPORTANT] **[卡点 2：复制只能单选]** 勾选 0 条或多条时点「复制」-> 提示「请选择一条业务联系单进行复制」。

> [!IMPORTANT] **[卡点 3：分组数据刷新时机]** 点击分组 Tab 只重查列表；顶部搜索条件变更才重拉 `GetGroupedListAsync`。重新进入 keepAlive 列表会 `refreshGroupData()`。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-07-31 | `Feature` | 列表接入分组统计：委托单位/船公司/起运港/目的港/业务类型；船公司 Tab 可展示 Logo | 复用 `#/components/list-grouping`，对接 `GetGroupedListAsync`；持久化 `group_config_PreOrderList` |
| 2026-07-26 | `Feature` | 双击行统一进编辑页；取消按状态分流详情 | 与取消独立详情页一致，`getPreOrderFormPath` 恒为 `/edit` |
| 2026-07-26 | `Feature` | 双击行按状态进编辑或详情：待审核/通过打开 `/detail`，录入/驳回仍进 `/edit` | （已废弃）曾用 `getPreOrderFormPath` 分流 |
| 2026-07-25 | `Feature` | 新建列表页：检索、双击进编辑、新建 / 复制 / 删除；菜单挂在「操作管理」下 | 列表结构对齐付费申请列表（vxe-grid + `createPagedListQuery` + `columnPersist`），未使用海运出口的分组能力 |
