---
title: 海运进口列表
module: 海运进口
author: auto-doc-sync
last_updated: 2026-09-01
---

# 1. 业务背景说明 (Background)

**白话解释：** 海运进口列表是委托单检索、进入新建和编辑的业务入口。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/sea-imports` |
| 路由名称 | `SeaImportList` |
| 页面组件 | `src/views/sea-import-admin/list.vue` |
| 权限口径 | `Admin.SeaImport` |
| 关键源码 | `src/router/routes/modules/operation-management.ts`<br/>`src/views/sea-import-admin/list.vue`<br/>`src/views/sea-import-admin/data.ts`<br/>`src/views/sea-import-admin/use-sea-import-copy.ts`<br/>`src/api/sea-import/sea-import-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **委托检索：** 按查询区条件分页加载委托单（含进口特有筛选字段）。进入列表**不预填会计期间**；默认按到港日期（`transportOrder.etd` / `TransportOrder.ETD`）降序，与海出开船日期同一字段。搜索条件变更不自动查询，需点「查询」；重置清空全部条件且不自动重查。
- **分组统计：** 支持列表分组 Tabs。
- **复制 / 删除：** 工具栏复制（可选复制费用）、删除。删除需 `Admin.SeaImport.Delete` **且** `row.isEditable === true`；复制与进详情不看 `isEditable`。
- **进入编辑：** 进入 `/sea-imports/:id/edit`。
- **进入新建：** 进入 `/sea-imports/create`。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作  | 目标状态 | 状态说明                           |
| :------- | :----------- | :------- | :--------------------------------- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **委托编号** | 运输单业务识别号。 | `src/views/sea-import-admin/data.ts` / `sea-import-admin.ts` | **触发/依赖：** 贯穿列表、编辑、费用与审核。 | 展示与查询口径以后端 DTO 为准。 |
| **到港日期** | 运输单 ETD；列表默认按该字段降序。 | 列 `transportOrder.etd`；筛 `ETDRange`；`sorting`=`TransportOrder.ETD` | **触发/依赖：** 进口界面文案是到港，不是出口的开船日期；默认排序字符串仍写 `TransportOrder.Etd DESC`。 | 可空。 |
| **会计期间（查询）** | 按运输单会计期间过滤；进入列表不预填。 | `AccountDateRange` -> `AccountDateStart` / `AccountDateEnd` | **触发/依赖：** 未选不传；选月后扩成整月。 | Month RangePicker，可清空。 |
| **客户** | 委托关联的客户主体。 | 客户选择组件与客户 API | **触发/依赖：** 影响账期、付款、对账等后续链路。 | 必须选择有效客户。 |
| **锁费状态** | 费用是否允许继续改动。 | 运输单详情字段 | **触发/依赖：** 影响订单费用、费用审核和锁费页面。 | 锁定后费用编辑能力受限。 |
| **贸易方式** | 列表筛选与列展示。 | 枚举中心 `TradeMode` | 筛选项与列文案均读枚举子项 `displayName`。 | 未配置枚举时筛选项为空，列回退显示数字。 |
| **码头航次** | 港区航次；与船公司航次是两套编号。 | 筛 `TerminalVoyno`；列 `terminalVoyno` | **触发/依赖：** 不进 `Keyword` 模糊范围。 | 可清空；进口上限 32。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：海运进口列表一致性]** 列表是业务链路入口，查询条件、表格列和编辑跳转必须与 `data.ts` 中 schema 保持一致。

> [!IMPORTANT] **[卡点 2：能看 ≠ 能改]** 列表删除看 `row.isEditable`；缺字段按不可编辑。复制与双击进详情不拦。不要读 `transportOrder.isEditable`。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-09-01 | `Feature` | 列表增加「码头航次」列与筛选，排在航次后面。 | 字段 `terminalVoyno`；关键字不含码头航次。详见 `changelogs/change-log-2026-09-01-sea-export-import-terminal-voyno.md`。 |
| 2026-08-28 | `Fix` | 进入列表不再默认当月会计期间；默认按到港日期（ETD）降序；列头显示降序箭头。 | 与海出共用 `TransportOrder.Etd DESC`；箭头丢失由列持久化 `refreshColumn` 冲掉 `column.order` 引起。见 `changelogs/change-log-2026-08-28-sea-list-etd-default-sort.md`。 |
| 2026-08-25 | `Fix` | 贸易方式筛选项与列文案改为枚举中心 `TradeMode`，不再写死。 | TAPD `#1161580498001000779`。详见 `changelogs/change-log-2026-08-25-sea-import-tapd-1000779.md`。 |
| 2026-08-19 | `Feature` | 列表删除增加 `row.isEditable`：无行级编辑权限时禁用删除。 | 见 `changelogs/change-log-2026-08-19-ticket-is-editable.md`。 |
| 2026-08-16 | `Fix` | 「新增」「复制」按钮图标与文字垂直对齐。 | lucide 裸 svg 进 `#icon` 无 `.anticon` 基线/间距；按钮加 `inline-flex items-center gap-1`。见 `changelogs/change-log-2026-08-16-list-create-copy-icon-align.md`。 |
| 2026-08-16 | `Feature` | 运踪详情弹窗新增「轨迹节点」时间轴（整票合并各箱节点，区分实际/预计/当前）。 | 节点来自弹窗已请求的运踪快照 `containers[].status[]`，无新增请求。详见 `changelogs/change-log-2026-08-16-tracking-timeline.md`。 |
| 2026-08-16 | `Parsing` | 无 | 需求确认：全品牌海进走新服务商运踪（订阅 `SubscribeContainerAsync` 的 `bizType=1`、列表/详情已下发运踪与预警字段、地图用后端加密轨迹链接）；用户侧不出现服务商名。见 [运踪能力品牌分流](../shared/feituo-tracking-brand-split.md)。 |
| 2026-08-16 | `Feature` | 列表新增「运踪订阅」按钮（批量，权限 `Admin.ExternalApi.Use`）、「运踪状态」列（点击打开运踪详情，权限 `Admin.ExternalApi.Get`），主提单号前新增异常预警黄色叹号（悬停显示最近一条原因与条数） | 订阅走 `FeituoAdmin/SubscribeContainerAsync`（`bizType=1`、入参 `orderIds`）；状态列与叹号全部读列表已下发的 `feituoTracking` 摘要，无额外请求；运踪弹窗额外调 `GetContainerTrackingAsync` 补箱清单与轨迹页链接。共享实现见 `src/components/tracking/`，后端文案经 `sanitizeVendorText` 清洗后展示 |
| 2026-08-14 | `Feat` | 列表列与筛选对齐最新接口：码头改为往来单位下拉；新增联运单号、分单号、贸易方式；业务来源/运输条款/包装兼容平铺名与对象名。 | 详见 `changelogs/change-log-2026-08-14-sea-import-api-doc-align.md`。 |
| 2026-08-08 | `Fix` | 列表列与筛选去掉订舱编号；关键字 placeholder 同步。 | 详见 `changelogs/change-log-2026-08-08-sea-import-remove-booking-num.md`。 |
| 2026-08-04 | `Style` | 侧栏菜单图标改为 `fluent-emoji-high-contrast:ship` 并水平翻转（船头朝左），与出口朝右区分。 | 路由 `meta.icon` 使用 `SeaImportShipIcon`（`hFlip: true`）。 |
| 2026-08-04 | `Feat` | 列表按进口接口重建列与搜索；支持分组统计、复制、删除；权限 `Admin.SeaImport`。 | 复制逻辑抽至 `use-sea-import-copy.ts`。 |
| 2026-07-12 | `Fix` | 列表仅点击 radio 才选中，单击行不再切换选中。 | `radioConfig.trigger` 由 `'row'` 改为 `'default'`；费用子表同步。 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/sea-imports` 对应组件 `src/views/sea-import-admin/list.vue`，权限口径为 未在路由中声明独立权限。 |
