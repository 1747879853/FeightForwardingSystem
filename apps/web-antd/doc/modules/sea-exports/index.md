---
title: 海运出口列表
module: 海运出口
author: auto-doc-sync
last_updated: 2026-07-15
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

- **分页检索：** 表格通过 `createPagedListQuery(getSeaExportPagedList, { defaultSort: 'CreationTime DESC', mapParams: normalizeQuery, fieldMap })` 调用 `/services/app/SeaExportAdmin/GetPagedListAsync`；支持列头远程多列排序，默认按创建时间倒序。关闭 `autoLoad`，挂载后写入默认会计期间（当月）再 `submitForm` 首查；`normalizeQuery` 在默认值写入前对空会计期间按当月兜底，避免分组恢复抢先查询漏条件。
- **业务状态列：** 文案仍按服务项进度计算；展示按 `upcoming/active/done` 三态着色（文字色对齐详情页服务项目；背景为半透明 rgba，降低列表中的视觉抢眼度）。
- **锁定列展示：** 「费用锁定」「业务锁定」仅显示图标（锁定红锁 / 未锁定灰开锁），不再用文案 Tag。
- **列头排序字段映射：** `sorting` 作用于 `SeaExport` 实体而非 DTO，故 DTO 后填充的 `*Name` 列通过 `fieldMap` 映射到实体导航路径：船公司 `carrierCode → Carrier.CnName`、订舱代理 `bookingAgentName → BookingAgent.Name`、港口 `polName/podName/receivePortName/poT1Name/poT2Name/deliverPortName → {POL/POD/ReceivePort/POT1/POT2/DeliverPort}.PortName`、航线 `laneName → POD.Lane.LaneName`、业务来源/付费方式/签单方式 `codeSourceName/codeFrtName/codeIssueTypeName → TransportOrder.CodeSource.CnName / TransportOrder.CodeFrt.CnName / CodeIssueType.BillType`。计算列（`totalCtn`/`teu`）、集合派生列（业务人员、`companys`）、后填充列（`creatorUserNickName`、收发通名称、`codePackageName`）显式 `sortable: false`，避免点击后端反射报错回退。
- **日期区间规范化：** 查询区的 `ETDRange` 会拆成 `ETDStart` / `ETDEnd`，`CloseDocTimeRange` 会拆成 `CloseDocTimeStart` / `CloseDocTimeEnd`，提交前统一转换为 ISO 字符串。
- **多选行维护：** 列表第一列为 checkbox 多选，不设置行内操作列；**仅点击勾选框才选中**（`checkboxConfig.trigger: 'default'`），单击行不切换选中。删除/复制要求恰好选中 1 行，未满足时提示「请先选择一条记录」；双击行会勾选该行并进入编辑。选中行背景为全局主题色 15% 透明（`hsl(var(--primary) / 15%)`，由 `packages/effects/plugins/src/vxe-table/style.css` 中 checkbox 选中变量控制）。
- **运踪订阅（批量）：** 勾选 ≥1 票后点击「运踪订阅」（需 `Admin.ExternalApi.Use`）直接发起订阅，无二次确认；超过 30 票时 toast 提示后端分批；toast 汇总 + 结果 Modal 逐条展示。
- **运踪状态（列表列）：** 「运踪状态」列优先展示列表 DTO `yundangShipmentOceanNode.stateDescCN`（当前海运节点中文描述）；否则按订阅状态回退（未订阅/订阅失败/等待推送），已包含是否订阅信息（原独立「运踪订阅」列已移除）。有 `Admin.ExternalApi.Get` 权限时点击 Tag 打开运踪详情弹窗（`GetOceanPushInfoAsync`）。
- **新增委托：** 顶部主按钮跳转 `/sea-exports/create`，由新建页创建委托主记录；新增与复制按钮使用 Ant Design Vue 图标插槽，图标与文本垂直居中。
- **复制委托：** 选中一条后点击「复制」（需 `Admin.SeaExport.Add` 权限），确认弹窗可选「同时复制费用」；成功后跳转新票编辑页 `/sea-exports/{newId}/edit`。
- **删除委托：** 选中一条后点击顶部「删除」（需 `Admin.SeaExport.Delete` 权限），二次确认后调用 `SeaExportAdmin/DeleteAsync`；删除成功会清理勾选状态并刷新当前列表。接口 ID 按 `number | string` 原样透传，兼容 GUID。
- **页面缓存：** 路由 `SeaExportList` 已开启 `keepAlive`；从新建/编辑工作台返回时 `onActivated` 自动刷新；当前页删除成功后立即刷新。
- **船公司展示升级：** 列表中的船公司列改为“Logo + 名称”展示，视觉上与编辑页和费用侧边摘要保持一致。
- **分组 Tab 船公司 Logo：** 当分组维度为「船公司」时，分组 Tab 在名称前展示对应船司 Logo（与列表船公司列「Logo + 名称」一致）。Logo 来源于 `GetGroupedListAsync` 船公司分组返回的 `logo` 附件；`list.vue` 的 `fetchGroups` 用 `buildAttachmentUrl` 将相对路径解析为完整地址注入通用 `GroupItem.logoUrl`，通用组件 `grouping-tabs.vue` 仅在 `logoUrl` 有值时渲染图片。其他分组维度或「未填写」项无 Logo。
- **分组统计（Tab 筛选）：** 工具栏「分组设置」可选择 9 种分组维度（装运方式、订单类型、委托单位、船公司、起运港、目的港、船名、付费方式、签单方式）；启用后左侧工具栏展示分组 Tab（样式对齐运价列表航线 Tab），表格标题隐藏。分组数据通过 `GetGroupedListAsync` 拉取，顶部搜索条件变更时刷新；点击某分组 Tab 仅向列表查询追加对应筛选参数，分组 Tab 本身不变。分组字段与同名搜索项互斥（启用分组后禁用并清空对应搜索框）；同时只能启用一个分组字段。被禁用的搜索项会给出直观提示：placeholder 显示「已按『X』分组」，label 旁帮助图标 tooltip 说明「该条件已作为分组维度，暂不可筛选，关闭分组后可恢复」，关闭分组后自动还原原始 placeholder/help。**工具栏左侧 `#toolbar-actions` 插槽始终挂载**（未分组显示列表标题，分组显示 Tab），避免与 `table-title` prop 联动切换导致 vxe 列配置被重置。
- **分组数据不缓存（每次进入都拉取）：** 列表 `keepAlive`，但分组统计不做缓存——`onActivated` 每次重新进入列表都会调用 `grouping.refreshGroupData()`（复用最近一次列表查询参数）重新拉取分组条数，仅刷新分组、不改选中项、不重查列表；首次激活（与 `onMounted` 首查重合）刻意跳过以免重复请求。首屏若持久化过默认分组字段，`onMounted` 会先 `restorePersistedField()` 恢复分组字段状态（不查询），再由 `submitForm` 首查在同一次查询中拉取分组数据，避免「恢复 vs 首查」竞态导致分组只剩「全部」。
- **搜索项持久化与折叠布局：** 搜索字段顺序/显隐由用户设置 `search_form_config_SeaExportList` 持久化（登录后全局预拉取）。折叠态显示几个搜索项由 `@core/form-ui` 的 `useExpandable` 按当前 DOM 布局动态计算（`keepIndex = 首行实际项数 - 1`，为按钮组留格）；持久化重排后须触发重新测量，否则会出现第一行留白（旧布局测得的保留数与新顺序不匹配）。

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
| **关键字 / 编号** | 按主提单号 / 订舱编号 / 委托编号模糊检索。 | 查询 schema `Keyword`（组件 `TrimInput`）/ 接口参数 `Keyword` | **触发/依赖：** 输入/粘贴时自动去除前后空格；`submitOnChange` 触发表格查询；`normalizeQuery` 再 trim 兜底。 | 可清空；匹配范围以后端为准。 |
| **开船日期** | 按运输单 ETD 时间过滤海出委托。 | `ETDRange` -> `ETDStart` / `ETDEnd` | **触发/依赖：** 前端拆分日期区间并转 ISO。 | RangePicker 可为空；开始/结束均可由组件约束。 |
| **截单时间** | 按截单时间过滤委托。 | `CloseDocTimeRange` -> `CloseDocTimeStart` / `CloseDocTimeEnd` | **触发/依赖：** 支持时间选择，提交前转 ISO。 | 可清空；时间格式由日期组件控制。 |
| **客户** | 委托关联的委托客户。 | `createClientSelectSchema({ industryCategory: 'p' })` / `ClientId` | **触发/依赖：** 影响列表定位和后续编辑页的结算对象、费用、对账链路。 | 需选择有效客户主数据。 |
| **起运港 / 目的港** | 航线节点筛选字段。 | `PortSelect` / `POLId`、`PODId` | **触发/依赖：** 与港口资料联动；列表六段港口列（收货地/起运港/中转港1/2/目的港/交货地）**单元格改为展示各自的备注字段**（`receivePortRemark` … `deliverPortRemark`，经 `formatter` 返回），但列 `field` 仍为 `*Name`，故**列头排序仍作用于各自港口字段**。 | 需选择有效港口资料。 |
| **船名 / 航次** | 船期检索字段。 | `Vessel`、`InnerVoyno` | **触发/依赖：** 与编辑页船名航次输入保持同一字段口径。 | 文本可清空。 |
| **船公司 / 订舱代理** | 承运与订舱服务主体。 | `CarrierSelect`、客户选择组件 `industryCategory: 'o'` | **触发/依赖：** 列表展示承运人 `carrierLogo + carrierCnShortName`（回退 `carrierName`）及订舱代理名称。 | 需选择有效基础资料或客户资料。 |
| **业务人员** | 销售、操作、商务、客服、单证等订单人员。 | `UserSelect` + `USER_ATTRIBUTE` 枚举 | **触发/依赖：** 列表列从 `transportOrder.orderUsers` 按角色过滤并拼接姓名。 | 需选择符合对应用户属性的用户。 |
| **所属组织** | 委托归属组织或收付款部门过滤条件。 | `OrganizationSelect` / `OrgId` | **触发/依赖：** 列表列展示 `companys[0].name`。 | 组织需来自系统组织树。 |
| **箱号** | 按箱号定位包含具体箱的委托。 | 查询参数 `CtnNo` | **触发/依赖：** 与订单箱型箱量明细相关。 | 文本可清空；匹配以后端为准。 |
| **货物类型 / 品名** | 货物维度检索字段。 | `CargoId`、`GoodsDes`；货物类型枚举 `普通/冷藏/危险品/超限` | **触发/依赖：** 与编辑页货物信息字段一致。 | 货物类型需选择枚举值。 |
| **来源 / 签单方式** | 业务来源与签单方式过滤条件。 | `CodeSourceSelect`、`CodeIssueTypeSelect` | **触发/依赖：** 列表展示 `codeSourceName`、`codeIssueTypeName`。 | 需选择有效代码资料。 |
| **装运方式 / 贸易条款 / 订单类型** | 业务属性筛选条件。 | 前端枚举：装运方式 `整柜/拼箱分票/拼箱主票`，订单类型 `直单/分单`，贸易条款 `CIF/FOB/EXW/FCA/DDP/DDU/DAP/C&F` | **触发/依赖：** 列表用 tag 展示装运方式和订单类型。 | 需选择枚举值。 |
| **费用锁定 / 业务锁定** | 控制订单费用或业务是否可继续变更。 | `transportOrder.feeLocked`、`transportOrder.isBusinessLocking` | **触发/依赖：** 列表列仅图标展示（锁定红色 `LockKeyhole` / 未锁定灰色 `LockKeyholeOpen`）；查询区仍可按是/否筛选；编辑页以锁定标签展示。 | 布尔值，是/否。 |
| **会计期间（查询）** | 按运输单会计期间过滤委托；进入列表默认当月。 | `AccountDateRange` -> `AccountDateStart` / `AccountDateEnd`（整月起止 ISO） | **触发/依赖：** `autoLoad: false`，挂载后写入当月再 `submitForm` 首查；写入前的早期查询由 `accountDateDefaultApplied` 兜底当月。 | Month RangePicker；可清空后重查（写入后不再兜底）。 |
| **业务状态** | 当前进行到的服务项名称，或「已完成」/「-」。 | 前端 `getSeaExportBusinessStatusMeta` 根据 `seaExportServices` 计算 | **触发/依赖：** 三态色 `SEA_EXPORT_BUSINESS_STATUS_COLORS` 文字色对齐详情页；背景为半透明 rgba。 | 无服务项显示 `-`；非空以色块展示。 |
| **应收费用状态 / 应付费用状态** | 该委托下对应方向（含更改单）费用的组合流转状态；无费用时为 null。 | 接口 `receiveFeeStatus`、`payFeeStatus`；枚举 `getSeaExportFeeStatusOptions`（八态含结算/驳回/申请修改删除） | **触发/依赖：** 后端按优先级聚合判断，与单笔 `FeeStatus` 枚举值不同。 | 可空；0–7 为 `SeaExportFeeStatus` 有效值。 |
| **分组字段（GroupField）** | 分组统计维度，1~9 对应装运方式至签单方式。 | `GetGroupedListAsync` 入参 `GroupField`；枚举 `SeaExportGroupField` | **触发/依赖：** 与列表查询参数一致但不含分页；启用分组后对应搜索项被禁用。 | 同时只能启用一个；点击 Tab 追加 `paramKey` 到列表查询。 |
| **分组项（GroupItem）** | 某一分组维度下的单个值及其条数。 | 接口返回 `{ id, name, count }` | **触发/依赖：** 点击 Tab 将 `id` 作为列表筛选值（如 `POLId`）；「全部」不追加筛选。 | `id`/`name` 可为 null（可空字段分组）。 |
| **未填写筛选（\*Empty）** | 仅返回某可空字段为空的记录。 | `GetPagedListAsync` 参数 `CarrierIdEmpty`/`POLIdEmpty`/`PODIdEmpty`/`CodeFrtIdEmpty`/`CodeIssueTypeIdEmpty` | **触发/依赖：** 点击 id 为 null 的「未填写」分组项时由 `emptyParamKey` 追加 `true`。 | 仅传 `true` 生效；与同名 id 参数互斥（后端校验）。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 0：分组禁用提示的还原依赖空值覆盖]** 分组禁用搜索项时会改写其 `placeholder`/`help` 作为提示，关闭分组需还原。`updateSchema` 底层用 `defu` 合并会忽略 `undefined`（保留旧值），所以还原时必须用空字符串等假值覆盖，而非 `undefined`，否则提示会残留。
>
> [!IMPORTANT] **[卡点 0.5：搜索默认值必须写入「最近提交值」]** `gridApi.query()` 读的是最近提交值而非表单当前值；挂载期默认会计期间需 `submitForm`。分组恢复可能抢先 `query`，靠 `normalizeQuery` + `accountDateDefaultApplied` 在默认值写入前兜底当月；写入后用户清空不再回填。验证需硬刷新（HMR 不重跑 `onMounted`）。
>
> [!IMPORTANT] **[卡点 1：列表字段跨 SeaExport 与 TransportOrder 两层 DTO]** 表格大量字段来自 `row.transportOrder.*`，例如委托编号、客户、件毛体、锁费状态；另一些字段来自海出主表，例如船公司、港口、船名航次。改列配置或接口 DTO 时要确认字段层级，否则会出现列表空值。
>
> **[卡点 2：日期区间不是原样提交]** `ETDRange`、`CloseDocTimeRange`、`AccountDateRange` 只存在于前端查询表单，接口实际接收拆分后的开始/结束字段（会计期间为整月 ISO）。后端或接口联调时不能直接查找 `*Range` 参数。
>
> **[卡点 3：操作模式依赖多选行]** 编辑/删除/复制要求恰好选中 1 行；运踪订阅支持多选。双击行会勾选该行；勿假设仍为 radio 单选。
>
> **[卡点 4：分组与搜索互斥]** 启用某分组字段后，对应搜索项（如 `POLId`）会被禁用并清空；切换分组或关闭分组时恢复。勿在分组启用期间通过搜索项传入同维度条件，否则与分组 Tab 语义冲突。
>
> **[卡点 5：分组数据刷新时机]** 点击分组 Tab 只重查列表，不刷新分组统计；用户手动变更顶部搜索条件时会重新调用 `GetGroupedListAsync` 并重置 Tab 选中态。此外分组统计不做缓存：`onActivated` 每次重新进入列表都会 `refreshGroupData()` 刷新分组（跳过首次激活）。
>
> **[卡点 6：分组恢复必须先于首查且不自查]** 首屏恢复持久化分组字段用 `restorePersistedField()`（内部 `applyField(..., skipQuery: true)`）只设状态、不触发查询，首查统一由 `submitForm` 完成，确保首查即带分组维度并拉到分组数据。若让恢复自行 `query()` 会与首查竞速、重复请求，且可能出现分组只剩「全部」。`useListGrouping` 已移除内部自动 `onMounted` 恢复，新接入列表须在挂载时机显式调用 `restorePersistedField()`。
>
> **[卡点 7：搜索持久化重排与折叠测量时序]** `loadSearchFieldConfig()` 在 `onMounted → init()` 中异步重排 schema（长度不变）。若折叠组件只监听 `schema.length`，`keepFormItemIndex` 会停留在重排前的测量结果（例如旧顺序首行含 `col-span-2` 日期范围时测得 `keepIndex=3`），重排后头部变为单列字段则第一行留白。修复后 `expandable.ts` 以「字段顺序 + 显隐」指纹触发重算；排查折叠错位时优先核对 `search_form_config_*` 与首行实际列占用。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-07-15 | `Fix` | 海运出口列表顶部补充删除按钮；仅允许删除单条勾选记录，需二次确认并受删除权限控制，成功后清除选择并刷新。 | 删除接口 ID 类型由 `number` 扩为 `number \| string`，与列表 DTO 的 GUID/数字联合类型一致。 |
| 2026-07-14 | `Style` | 修复工具栏新增、复制按钮图标与文本未垂直对齐。 | 图标改由 Ant Design Vue Button 的 `#icon` 插槽承载，并统一为 `size-4`。 |
| 2026-07-14 | `Fix` | 搜索项持久化重排后，折叠态第一行不再错位留白，会按新字段顺序填满网格列（扣除按钮占位）。 | `useExpandable` 原仅 watch `schema.length`；`searchPersist` 异步 `applySearchFieldOrderToSchema` 后长度不变但顺序/显隐变，导致 `keepFormItemIndex` 基于旧 DOM 布局。改为「`fieldName:hide` 指纹」触发 `calculateRowMapping()` 重算。 |
| 2026-07-12 | `Fix` | 开启分组或切换分组维度后列设置（显隐/顺序/列宽）不再被重置。 | 表层：`#toolbar-actions` 插槽常挂载、内部切换标题/Tab。根因在插件：`toolbarOptions` 调用插槽渲染读取分组 Tab 响应式状态 → `options` 重算生成新 `columns` 引用 → vxe `reloadColumn`；修复用 `getBoundColumnsSignature` 稳定 `columns` 引用（见 `modules/shared/vxe-column-persist.md`）。 |
| 2026-07-12 | `Fix` | 「编号」检索改用 `TrimInput`，粘贴带空格时输入框即时去首尾空格。 | 仅参数层 trim 无法清掉可见空格；见 `change-log-2026-07-12-workspace-keyword-trim-checkbox.md`。 |
| 2026-07-12 | `Fix` | 分组统计不再缓存：每次重新进入列表都拉取最新分组条数；并修复首屏默认分组（如船公司）只剩「全部」拉不到分组明细的问题。 | `use-list-grouping.ts` 移除内部自动 `onMounted` 恢复，新增 `restorePersistedField()`（`applyField` 增 `skipQuery` 仅设状态不查询）+ `refreshGroupData()`（复用 `lastBaseParams` 只刷新分组）；`list.vue` `onMounted` 改「恢复分组字段→submitForm 首查」确定性时序消除竞态，`onActivated` 每次进入刷新分组（跳过首次激活）。 |
| 2026-07-12 | `Fix` | 列表仅点击 checkbox 才选中，单击行不再切换勾选；双击进编辑仍会勾选当前行。 | `checkboxConfig.trigger` 由 `'row'` 改为 `'default'`；同批统一改客户/费用锁定及多处 radio 列表。 |
| 2026-07-12 | `Style` | 列表「业务状态」色块背景改为半透明 rgba，降低抢眼度；文字色不变。 | 仅改 `SEA_EXPORT_BUSINESS_STATUS_COLORS` 的 `background`（done/active/upcoming 分别约 0.45/0.55/0.6）。 |
| 2026-07-12 | `Feature` | 船公司分组的分组 Tab 在名称前展示对应船司 Logo，其他分组维度不变。 | 通用 `GroupItem` 新增 `logoUrl`（已解析地址），`grouping-tabs.vue` 有值才渲染 `<img>`；`list.vue` `fetchGroups` 改异步，用 `buildAttachmentUrl` 解析接口 `logo.url` 注入；`SeaExportGroupDto` 补 `logo?: AttachmentItemDto`。业务侧解析 URL、通用组件保持无业务耦合。 |
| 2026-07-12 | `Fix` | 会计期间默认当月在分组恢复等早期查询场景下仍带上；用户清空后不再被兜底回填。 | `accountDateDefaultApplied` + `normalizeQuery` 兜底；首查继续 `setValues` + `submitForm`（最近提交值机制）。 |
| 2026-07-12 | `Style` | 列表「业务状态」按未开始/进行中/已完成三态着色，色值对齐详情页服务项目。 | `getSeaExportBusinessStatusMeta` + `SEA_EXPORT_BUSINESS_STATUS_COLORS`；保留 `getSeaExportBusinessStatusText` 兼容。 |
| 2026-07-12 | `Feature` | 开启某字段分组后，被禁用的对应搜索项增加直观提示：placeholder 显示「已按『X』分组」，label 旁帮助图标说明原因与恢复方式；关闭分组自动还原。 | 改 `components/list-grouping/use-list-grouping.ts` 的 `disableSearchField`/`restoreSearchField`：置灰同时改写 `placeholder`/`help` 并缓存原值；还原用空字符串覆盖以规避 `defu` 忽略 `undefined`。通用组合式函数改动，复用列表均受益。 |
| 2026-07-12 | `Style` | 列表「费用锁定」「业务锁定」列改为仅显示锁/开锁图标；进入列表会计期间默认当月且首查带上该条件。 | `feeLocked`/`businessLocked` slot + `LockKeyhole`/`LockKeyholeOpen`；`autoLoad: false` 后 `setValues` + `submitForm` 避免首查漏默认期间。 |
| 2026-07-12 | `Feature` | 列表「运踪状态」列改显 `yundangShipmentOceanNode.stateDescCN`，不再使用 `yundangTrackStatus`。 | `use-yundang-ocean-track.ts` 的 `getYundangTrackStatusLabel`/`resolveYundangViewState`；`SeaExportDto` 新增嵌套节点字段。 |
| 2026-07-13 | `Fix` | 运踪详情集装箱轨迹状态不再前端推断；不做蓝色当前高亮，仅 `isEstimate` 展示「预计」。 | 与编辑页运踪 Tab 共用 `yundang-tracking-panel.vue`。 |
| 2026-07-13 | `Fix` | 运踪详情里程碑与集装箱轨迹取消前端排序，完全按后端返回顺序展示。 | 与编辑页运踪 Tab 共用 `yundang-tracking-panel.vue`。 |
| 2026-07-12 | `Fix` | 运踪详情弹窗里程碑：仅按 `actualityTime` 升序；无实际时间节点不再显示「未到」。（已被 2026-07-13 取消前端排序取代） | 与编辑页运踪 Tab 共用 `yundang-tracking-panel.vue`。 |
| 2026-07-12 | `Style` | 列表 checkbox 选中行背景改为跟随主题主色 15% 透明，与全站表格选中态统一。 | 列表使用 `useVbenVxeGrid` + `checkboxConfig.highlight`，选中背景由 `vxe-table/style.css` 的 `--vxe-ui-table-row-checkbox-checked-background-color` 控制，非 antd Table；仅改 antd 全局样式不会影响本页。 |
| 2026-07-12 | `Feature` | 列表六段港口列（收货地/起运港/中转港1/2/目的港/交货地）单元格改为展示各自的备注字段，列头排序仍按港口字段。 | `data.ts` `useColumns` 为六列补 `formatter: ({ row }) => row.xxxRemark ?? ''`（`receivePortRemark`…`deliverPortRemark`），列 `field` 保持 `*Name` 不变，排序仍走 `list.vue` `fieldMap` 映射的 `*.PortName` 实体路径。显示与排序靠 `formatter`/`field` 解耦。 |
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
