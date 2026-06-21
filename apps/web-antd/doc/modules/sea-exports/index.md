---
title: 海运出口列表
module: 海运出口
author: auto-doc-sync
last_updated: 2026-06-21
---

# 1. 业务背景说明 (Background)

**白话解释：** 海运出口列表是海出委托单的检索与维护入口。业务人员在这里按委托编号、客户、港口、船名航次、人员归属、锁定状态等条件定位订单，再进入新建或编辑工作台继续处理基础资料、费用、更改单、派车与分单。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/sea-exports` |
| 路由名称 | `SeaExportList` |
| 页面组件 | `src/views/sea-export-admin/list.vue` |
| 权限口径 | 路由未声明独立权限；菜单入口由父路由 `/sea-exports` 承载 |
| 关键源码 | `src/router/routes/modules/sea-export.ts`<br/>`src/views/sea-export-admin/list.vue`<br/>`src/views/sea-export-admin/form.vue`<br/>`src/views/sea-export-admin/editor.vue`<br/>`src/views/sea-export-admin/data.ts`<br/>`src/views/sea-export-admin/orderFee/data.ts`<br/>`src/api/sea-export/sea-export-admin.ts`<br/>`src/api/sea-export/order-fee-admin.ts`<br/>`src/api/sea-export/change-order-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **分页检索：** 表格通过 `getSeaExportPagedList` 调用 `/services/app/SeaExportAdmin/GetPagedListAsync`，固定传入 `PageIndex`、`PageSize`、`Sorting: 'CreationTime DESC'`（最新委托优先），并合并查询区条件。
- **日期区间规范化：** 查询区的 `ETDRange` 会拆成 `ETDStart` / `ETDEnd`，`CloseDocTimeRange` 会拆成 `CloseDocTimeStart` / `CloseDocTimeEnd`，提交前统一转换为 ISO 字符串。
- **单选行维护：** 列表第一列为 radio 单选，不设置行内操作列；编辑和删除都依赖当前选中行，未选中时提示“请选择一条”。
- **双击进入编辑：** 双击单元格会先设置当前行为选中态，再跳转 `/sea-exports/{id}/edit`。
- **新增委托：** 顶部主按钮跳转 `/sea-exports/create`，由新建页创建委托主记录。
- **页面缓存：** 路由 `SeaExportList` 已开启 `keepAlive`；从新建/编辑工作台返回时 `onActivated` 自动刷新；当前页删除成功后立即刷新。
- **船公司展示升级：** 列表中的船公司列改为“Logo + 名称”展示，视觉上与编辑页和费用侧边摘要保持一致。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| 页面初始 | 用户进入 `/sea-exports` | 自动查询列表 | `useVbenVxeGrid` 通过代理查询接口加载第一页数据。 |
| 未选中记录 | 点击编辑或删除 | 操作被拦截 | 前端提示必须先选择一条委托。 |
| 已选中记录 | 点击编辑或双击行 | 编辑工作台 | 跳转 `/sea-exports/:id/edit`，`:id` 必须匹配 36 位 GUID 路由约束。 |
| 已选中记录 | 点击删除并确认 | 列表刷新 | 调用删除接口，成功后重新查询当前列表。 |
| 任意列表状态 | 点击新增 | 新建页面 | 跳转 `/sea-exports/create`。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **关键字** | 用于模糊检索委托相关信息。 | 查询 schema `Keyword` / 接口参数 `Keyword` | **触发/依赖：** 查询表单 `submitOnChange`，字段变化会触发表格查询。 | 可清空；具体匹配范围以后端为准。 |
| **开船日期** | 按运输单 ETD 时间过滤海出委托。 | `ETDRange` -> `ETDStart` / `ETDEnd` | **触发/依赖：** 前端拆分日期区间并转 ISO。 | RangePicker 可为空；开始/结束均可由组件约束。 |
| **截单时间** | 按截单时间过滤委托。 | `CloseDocTimeRange` -> `CloseDocTimeStart` / `CloseDocTimeEnd` | **触发/依赖：** 支持时间选择，提交前转 ISO。 | 可清空；时间格式由日期组件控制。 |
| **客户** | 委托关联的委托客户。 | `createClientSelectSchema({ industryCategory: 'p' })` / `ClientId` | **触发/依赖：** 影响列表定位和后续编辑页的结算对象、费用、对账链路。 | 需选择有效客户主数据。 |
| **起运港 / 目的港** | 航线节点筛选字段。 | `PortSelect` / `POLId`、`PODId` | **触发/依赖：** 与港口资料联动；列表按表单港口链路展示 `receivePortName` → `polName` → `poT1Name` → `poT2Name` → `podName` → `deliverPortName`，列标题与新建页一致（收货地/起运港/中转港1/2/目的港/交货地）。 | 需选择有效港口资料。 |
| **船名 / 航次** | 船期检索字段。 | `Vessel`、`InnerVoyno` | **触发/依赖：** 与编辑页船名航次输入保持同一字段口径。 | 文本可清空。 |
| **船公司 / 订舱代理** | 承运与订舱服务主体。 | `CarrierSelect`、客户选择组件 `industryCategory: 'o'` | **触发/依赖：** 列表展示承运人 `carrierLogo + carrierCnShortName`（回退 `carrierName`）及订舱代理名称。 | 需选择有效基础资料或客户资料。 |
| **业务人员** | 销售、操作、商务、客服、单证等订单人员。 | `UserSelect` + `USER_ATTRIBUTE` 枚举 | **触发/依赖：** 列表列从 `transportOrder.orderUsers` 按角色过滤并拼接姓名。 | 需选择符合对应用户属性的用户。 |
| **所属组织** | 委托归属组织或收付款部门过滤条件。 | `OrganizationSelect` / `OrgId` | **触发/依赖：** 列表列展示 `companys[0].name`。 | 组织需来自系统组织树。 |
| **箱号** | 按箱号定位包含具体箱的委托。 | 查询参数 `CtnNo` | **触发/依赖：** 与订单箱型箱量明细相关。 | 文本可清空；匹配以后端为准。 |
| **货物类型 / 品名** | 货物维度检索字段。 | `CargoId`、`GoodsDes`；货物类型枚举 `普通/冷藏/危险品/超限` | **触发/依赖：** 与编辑页货物信息字段一致。 | 货物类型需选择枚举值。 |
| **来源 / 签单方式** | 业务来源与签单方式过滤条件。 | `CodeSourceSelect`、`CodeIssueTypeSelect` | **触发/依赖：** 列表展示 `codeSourceName`、`codeIssueTypeName`。 | 需选择有效代码资料。 |
| **装运方式 / 贸易条款 / 订单类型** | 业务属性筛选条件。 | 前端枚举：装运方式 `整柜/拼箱分票/拼箱主票`，订单类型 `直单/分单`，贸易条款 `CIF/FOB/EXW/FCA/DDP/DDU/DAP/C&F` | **触发/依赖：** 列表用 tag 展示装运方式和订单类型。 | 需选择枚举值。 |
| **费用锁定 / 业务锁定** | 控制订单费用或业务是否可继续变更。 | `transportOrder.feeLocked`、`transportOrder.isBusinessLocking` | **触发/依赖：** 列表可筛选，编辑页以锁定标签展示。 | 布尔值，是/否。 |
| **应收费用状态 / 应付费用状态** | 该委托下对应方向（含更改单）费用的组合流转状态；无费用时为 null。 | 接口 `receiveFeeStatus`、`payFeeStatus`；枚举 `getSeaExportFeeStatusOptions`（八态含结算/驳回/申请修改删除） | **触发/依赖：** 后端按优先级聚合判断，与单笔 `FeeStatus` 枚举值不同。 | 可空；0–7 为 `SeaExportFeeStatus` 有效值。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：列表字段跨 SeaExport 与 TransportOrder 两层 DTO]** 表格大量字段来自 `row.transportOrder.*`，例如委托编号、客户、件毛体、锁费状态；另一些字段来自海出主表，例如船公司、港口、船名航次。改列配置或接口 DTO 时要确认字段层级，否则会出现列表空值。
>
> **[卡点 2：日期区间不是原样提交]** `ETDRange` 和 `CloseDocTimeRange` 只存在于前端查询表单，接口实际接收的是拆分后的开始/结束字段。后端或接口联调时不能直接查找 `ETDRange` 参数。
>
> **[卡点 3：操作模式依赖单选行]** 本项目列表规范不使用操作列。编辑/删除必须先取 `getRadioRecord()`，双击行也会同步单选态；后续扩展批量操作时要避免破坏当前单选维护逻辑。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-06-21 | `Fix` | 列表移除原「应收费用」「应付费用」最小状态列，仅保留组合状态列 `receiveFeeStatus`/`payFeeStatus`。 | 后端仍返回 `feeStatusReceive`/`feeStatusPay`，前端列表不再展示。 |
| 2026-06-21 | `Feature` | 列表新增「应收费用状态」「应付费用状态」两列，对接 `receiveFeeStatus`、`payFeeStatus` 组合状态；保留原最小审核状态列。 | 使用 `getSeaExportFeeStatusOptions`（`SeaExportFeeStatus` 八态），勿与 `getFeeStatusOptions` 混用。 |
| 2026-06-20 | `Fix` | 列表港口列补齐为六段（收货地→交货地），列名与新建/编辑表单 `usePortFormSchema` 对齐（起运港/目的港等），不再使用装货港/卸货港旧文案。 | 列标题改用 `polId`/`podId` 等表单同款 i18n key；字段均在 `SeaExportDto` 根级 `*Name` 属性。 |
| 2026-06-19 | `Feature` | 列表新增「应收费用」「应付费用」两列，对接 `feeStatusReceive`、`feeStatusPay`，用费用状态 Tag 展示。 | 字段在 `SeaExportDto` 顶层；复用 `orderFee/data.ts` 的 `getFeeStatusOptions`，与审核审批列表一致。 |
| 2026-06-07 | `Feature` | 列表船公司列优先展示 `carrierCnShortName`，空值回退 `carrierName`。 | 与 `CarrierSelect` 默认 `cnShortName` labelKey 及后端新增字段对齐。 |
| 2026-05-30 | `Fix` | 列表分页查询固定传入 `Sorting: 'CreationTime DESC'`，默认按创建时间倒序展示，最新委托排在前面。 | 排序参数写在 `...query` 展开之前，避免未来查询 schema 扩展排序字段时被覆盖。 |
| 2026-05-30 | `Feature` | 海运出口列表开启 `keepAlive`；从 create/edit 返回时 `onActivated` 刷新，避免缓存旧委托数据。 | 与弹窗型基础资料列表不同，跳转独立表单页的列表必须补 `onActivated`；见 [列表页 keepAlive 与刷新约定](../../guides/list-page-keepalive-refresh.md)。 |
| 2026-05-29 | `Feature/Fix` | 搜索区字段配置（`search_form_config_`）与列配置一并改为登录后全局预拉取，列表页不再按表格实例单独请求 `GetPagedListAsync`。 | `searchPersist` 走 `loadSearchFormConfigsOnce` + `getSearchFormConfigByName`；与 `table_config_` 并行预热。 |
| 2026-05-29 | `Feature/Fix` | 列配置读取由“每个表格单独拉取”改为“登录后全局预拉取 + 运行时复用缓存”，减少 `/sea-exports` 页面初始化阶段的重复配置请求。 | `useVbenVxeGrid` 的 `columnPersist.load/add/edit/remove` 切换到全局 store；新增与修改会同步回写缓存，保证同会话跨页面一致性。 |
| 2026-05-19 | `Feature/Fix` | `/sea-exports` 列表船公司 Logo 地址统一改为全局附件拼接方法，避免相对路径在独立 API 网关下显示失败。 | 列表页展示层与上传/下拉组件复用同一附件地址规则，减少页面级 URL 处理分叉。 |
| 2026-05-18 | `Feature/Fix` | 海运出口列表船公司列支持 Logo + 名称展示，与编辑页回显口径统一。 | 船公司 Logo 读取优先新字段 `carrierLogo.url`，并兼容旧结构回退。 |
| 2026-05-16 | `Parsing` | 无 | 结合 `list.vue`、`data.ts` 与 `sea-export-admin.ts` 补全列表查询、日期区间拆参、单选行操作、删除确认和跨 DTO 字段来源说明。 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/sea-exports` 对应组件 `src/views/sea-export-admin/list.vue`，权限口径为 未在路由中声明独立权限。 |
