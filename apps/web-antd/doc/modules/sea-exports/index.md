---
title: 海运出口列表
module: 海运出口
author: auto-doc-sync
last_updated: 2026-07-11
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

- **分页检索：** 表格通过 `createPagedListQuery(getSeaExportPagedList, { defaultSort: 'CreationTime DESC', mapParams: normalizeQuery, fieldMap })` 调用 `/services/app/SeaExportAdmin/GetPagedListAsync`；支持列头远程多列排序，默认按创建时间倒序。
- **列头排序字段映射：** `sorting` 作用于 `SeaExport` 实体而非 DTO，故 DTO 后填充的 `*Name` 列通过 `fieldMap` 映射到实体导航路径：船公司 `carrierCode → Carrier.CnName`、订舱代理 `bookingAgentName → BookingAgent.Name`、港口 `polName/podName/receivePortName/poT1Name/poT2Name/deliverPortName → {POL/POD/ReceivePort/POT1/POT2/DeliverPort}.PortName`、航线 `laneName → POD.Lane.LaneName`、业务来源/付费方式/签单方式 `codeSourceName/codeFrtName/codeIssueTypeName → TransportOrder.CodeSource.CnName / TransportOrder.CodeFrt.CnName / CodeIssueType.BillType`。计算列（`totalCtn`/`teu`）、集合派生列（业务人员、`companys`）、后填充列（`creatorUserNickName`、收发通名称、`codePackageName`）显式 `sortable: false`，避免点击后端反射报错回退。
- **日期区间规范化：** 查询区的 `ETDRange` 会拆成 `ETDStart` / `ETDEnd`，`CloseDocTimeRange` 会拆成 `CloseDocTimeStart` / `CloseDocTimeEnd`，提交前统一转换为 ISO 字符串。
- **多选行维护：** 列表第一列为 checkbox 多选，不设置行内操作列；编辑/删除/复制要求恰好选中 1 行，未满足时提示「请先选择一条记录」；双击行会勾选该行并进入编辑。
- **运踪订阅（批量）：** 勾选 ≥1 票后点击「运踪订阅」（需 `Admin.ExternalApi.Use`）直接发起订阅，无二次确认；超过 30 票时 toast 提示后端分批；toast 汇总 + 结果 Modal 逐条展示。
- **运踪状态（列表列）：** 「运踪状态」列优先展示接口 `yundangTrackStatus`；否则按订阅状态回退（未订阅/订阅失败/等待推送），已包含是否订阅信息（原独立「运踪订阅」列已移除）。有 `Admin.ExternalApi.Get` 权限时点击 Tag 打开运踪详情弹窗（`GetOceanPushInfoAsync`）。
- **新增委托：** 顶部主按钮跳转 `/sea-exports/create`，由新建页创建委托主记录。
- **复制委托：** 选中一条后点击「复制」（需 `Admin.SeaExport.Add` 权限），确认弹窗可选「同时复制费用」；成功后跳转新票编辑页 `/sea-exports/{newId}/edit`。
- **页面缓存：** 路由 `SeaExportList` 已开启 `keepAlive`；从新建/编辑工作台返回时 `onActivated` 自动刷新；当前页删除成功后立即刷新。
- **船公司展示升级：** 列表中的船公司列改为“Logo + 名称”展示，视觉上与编辑页和费用侧边摘要保持一致。
- **分组统计（Tab 筛选）：** 工具栏「分组设置」可选择 9 种分组维度（装运方式、订单类型、委托单位、船公司、起运港、目的港、船名、付费方式、签单方式）；启用后左侧工具栏展示分组 Tab（样式对齐运价列表航线 Tab），表格标题隐藏。分组数据通过 `GetGroupedListAsync` 拉取，仅当顶部搜索条件变更时刷新；点击某分组 Tab 仅向列表查询追加对应筛选参数，分组 Tab 本身不变。分组字段与同名搜索项互斥（启用分组后禁用并清空对应搜索框）；同时只能启用一个分组字段。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| 页面初始 | 用户进入 `/sea-exports` | 自动查询列表 | `useVbenVxeGrid` 通过代理查询接口加载第一页数据。 |
| 未选中记录 | 点击编辑或删除 | 操作被拦截 | 前端提示必须先选择一条委托。 |
| 已选中记录 | 点击编辑或双击行 | 编辑工作台 | 跳转 `/sea-exports/:id/edit`，`:id` 必须匹配 36 位 GUID 路由约束。 |
| 已选中记录 | 点击删除并确认 | 列表刷新 | 调用删除接口，成功后重新查询当前列表。 |
| 已选中记录 | 点击复制并确认 | 新票编辑页 | 调用 `CopyAsync`，可选 `copyOrderFees`；成功后 `replace` 至 `/sea-exports/{newId}/edit`。 |
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
| **分组字段（GroupField）** | 分组统计维度，1~9 对应装运方式至签单方式。 | `GetGroupedListAsync` 入参 `GroupField`；枚举 `SeaExportGroupField` | **触发/依赖：** 与列表查询参数一致但不含分页；启用分组后对应搜索项被禁用。 | 同时只能启用一个；点击 Tab 追加 `paramKey` 到列表查询。 |
| **分组项（GroupItem）** | 某一分组维度下的单个值及其条数。 | 接口返回 `{ id, name, count }` | **触发/依赖：** 点击 Tab 将 `id` 作为列表筛选值（如 `POLId`）；「全部」不追加筛选。 | `id`/`name` 可为 null（可空字段分组）。 |
| **未填写筛选（\*Empty）** | 仅返回某可空字段为空的记录。 | `GetPagedListAsync` 参数 `CarrierIdEmpty`/`POLIdEmpty`/`PODIdEmpty`/`CodeFrtIdEmpty`/`CodeIssueTypeIdEmpty` | **触发/依赖：** 点击 id 为 null 的「未填写」分组项时由 `emptyParamKey` 追加 `true`。 | 仅传 `true` 生效；与同名 id 参数互斥（后端校验）。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：列表字段跨 SeaExport 与 TransportOrder 两层 DTO]** 表格大量字段来自 `row.transportOrder.*`，例如委托编号、客户、件毛体、锁费状态；另一些字段来自海出主表，例如船公司、港口、船名航次。改列配置或接口 DTO 时要确认字段层级，否则会出现列表空值。
>
> **[卡点 2：日期区间不是原样提交]** `ETDRange` 和 `CloseDocTimeRange` 只存在于前端查询表单，接口实际接收的是拆分后的开始/结束字段。后端或接口联调时不能直接查找 `ETDRange` 参数。
>
> **[卡点 3：操作模式依赖多选行]** 编辑/删除/复制要求恰好选中 1 行；运踪订阅支持多选。双击行会勾选该行；勿假设仍为 radio 单选。
>
> **[卡点 4：分组与搜索互斥]** 启用某分组字段后，对应搜索项（如 `POLId`）会被禁用并清空；切换分组或关闭分组时恢复。勿在分组启用期间通过搜索项传入同维度条件，否则与分组 Tab 语义冲突。
>
> **[卡点 5：分组数据刷新时机]** 点击分组 Tab 只重查列表，不刷新分组统计；仅用户手动变更顶部搜索条件时才重新调用 `GetGroupedListAsync` 并重置 Tab 选中态。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-07-11 | `Feature` | 列表列头排序对接：船公司/订舱代理/收货地/起运港/中转港1/2/目的港/交货地/航线/业务来源/付费方式/签单方式等 DTO 展示列支持按实体导航路径排序；计算/集合/后填充列关闭排序。 | 在 `list.vue` `fieldMap` 将 DTO `*Name` 映射到 `Carrier.CnName`/`BookingAgent.Name`/`*.PortName`/`POD.Lane.LaneName` 等实体路径（`sorting` 作用于 `SeaExport` 实体非 DTO）；`data.ts` 对 `totalCtn/teu`、业务人员、`companys`、收发通名称、`codePackageName`、`creatorUserNickName` 显式 `sortable: false`。端口导航属性按 EF `[ForeignKey]` 约定推断。 |
| 2026-07-11 | `Style` | 运踪模块去除第三方服务商名称（i18n/注释/历史文档补漏）。 | 用户可见层统一「运踪」表述；内部 API 字段名保持不变。 |
| 2026-07-11 | `Style` | 移除「运踪订阅」列，改由「运踪状态」列涵盖是否订阅信息。 | 删除 `data.ts` `isYundangSubscribed` 列与 `list.vue` `yundangSubscribeStatus` slot 及 `getYundangSubscribeStatus(Meta)` 引用。 |
| 2026-07-11 | `Feature` | 新增「运踪状态」列与详情弹窗（`GetOceanPushInfoAsync`）；有 `Admin.ExternalApi.Get` 可点击 Tag 查看里程碑/航段/箱轨迹。 | `use-yundang-ocean-track.ts` + `yundang-tracking-modal.vue`；列表预留 `yundangTrackStatus` 字段优先展示。 |
| 2026-07-11 | `Feature` | 列表新增「运踪订阅」状态列（未订阅/失败/成功 Tag），对接两字段；订阅后刷新列表。（已被同日「移除运踪订阅列」取代） | 状态由 `getYundangSubscribeStatus`/`getYundangSubscribeStatusMeta` 组合推导；列 slot `yundangSubscribeStatus`。 |
| 2026-07-07 | `Refactor` | 运踪订阅取消二次确认弹窗，点击按钮直接提交并展示结果。 | 删除 `yundang-subscribe-modal.vue`；`subscribe()` 直接调 API。 |
| 2026-07-07 | `Style` | 页面旧版第三方品牌文案统一改为「运踪订阅」，不对外暴露服务商名称。 | 仅改 i18n 用户可见文案；内部 API 路径与 composable 命名不变。 |
| 2026-07-07 | `Refactor` | 运踪订阅弹窗简化为确认框，仅传 `seaExportIds`；后端按装运方式自动判断订阅单号类型。 | 移除 scene/referenceType/noticeEmail；新增 `autoSubscribeHint` 文案。 |
| 2026-07-07 | `Feature` | 列表改为 checkbox 多选；新增「运踪订阅」批量对接外部运踪服务，需 `Admin.ExternalApi.Use`；编辑/删除/复制仍要求单选。 | `useYundangOceanSubscribe` + `api/yundang/yundang-admin.ts`；结果 Modal 按订阅明细 `items` 展示。 |
| 2026-07-07 | `Feature` | 列表新增「复制」按钮：选中委托后可复制新建，确认弹窗可选 `copyOrderFees`；需 `Admin.SeaExport.Add` 权限；成功后跳转新票编辑页。 | `useSeaExportCopy` composable 统一列表/编辑复制流程；对接 `CopyAsync`，字段 `copyOrderFees` 非 `copyFees`。 |
| 2026-06-28 | `Feature` | 分组设置持久化：用户选择的分组字段保存到用户设置，刷新/重新登录后自动恢复。 | 复用 `UserSettingAdmin`，table-config store 新增 `group_config_` 一套并登录预热；`useListGrouping.persist` 挂载恢复（不写回）+ 切换保存。 |
| 2026-06-28 | `Feature` | 点击船公司/起运港/目的港/付费方式/签单方式分组中的「未填写」项时，列表仅展示对应字段为空的记录。 | 对接后端 5 个 `*Empty` 参数；`GroupFieldDef.emptyParamKey` + `decorateListParams` 选中项三态（undefined/null/具体值）区分全部、未填写与具体值。 |
| 2026-06-28 | `Feature` | 列表新增分组统计：工具栏「分组设置」启用 9 维分组，Tab 展示各分组条数；点击 Tab 过滤列表；搜索与分组互斥。 | 抽象 `components/list-grouping` 供后续列表复用；`useListGrouping.decorateListParams` 负责签名比对与筛选追加；付费方式分组依赖 `CodeFrtId` 列表筛选。 |
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
