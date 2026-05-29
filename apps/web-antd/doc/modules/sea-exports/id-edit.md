---
title: 海运出口编辑工作台
module: 海运出口
author: auto-doc-sync
last_updated: 2026-05-29
---

# 1. 业务背景说明 (Background)

**白话解释：** 海运出口编辑工作台是海出委托创建后的日常操作中心。它以路由中的委托 ID 作为上下文，聚合基础信息维护、费用录入与审核、更改单、派车、分单、问题记录和修改历史等子业务，使业务、单证、操作、客服、财务能够围绕同一运输单协同处理。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/sea-exports/:id/edit` |
| 路由名称 | `SeaExportEdit` |
| 页面组件 | `src/views/sea-export-admin/editor.vue` |
| 权限口径 | 路由参数限定为 36 位 GUID；通过 `activePath: /sea-exports` 归属海运出口菜单 |
| 关键源码 | `src/router/routes/modules/sea-export.ts`<br/>`src/views/sea-export-admin/list.vue`<br/>`src/views/sea-export-admin/form.vue`<br/>`src/views/sea-export-admin/editor.vue`<br/>`src/views/sea-export-admin/data.ts`<br/>`src/views/sea-export-admin/orderFee/data.ts`<br/>`src/api/sea-export/sea-export-admin.ts`<br/>`src/api/sea-export/order-fee-admin.ts`<br/>`src/api/sea-export/change-order-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **工作台标签导航：** `editor.vue` 维护顶部标签，包含基础信息、更改单、服务详情、单证信息、应收应付、派车、分单、问题记录、修改历史。当前实现中基础信息、费用、更改单、派车、分单已经挂载组件；服务详情、单证信息、问题记录、修改历史目前主要作为标签预留。
- **基础信息维护：** 基础信息标签内复用 `form.vue` 的编辑态，以 `embedded` 模式嵌入工作台；详情来自 `getSeaExportDetail`，保存调用 `editSeaExport`。
- **服务项目联动：** 嵌入的 `form.vue` 在变更委托单位或起运港时执行双语义查询：仅 `polId` 用于确定服务卡片可见范围，`polId+clientId` 用于默认勾选；详情加载后 `force` 同步一次，确保编辑态与当前起运港配置一致。
- **干系人角色约束：** 基础信息表单中的销售、商务、操作、客服、单证角色固定展示且不可删除、不可重复；销售与操作必须指定人员。
- **详情回填：** `form.vue` 通过 `flattenDetail` 把 `SeaExportDto` 和内层 `transportOrder` 拉平成多个表单分区，同时通过 `selectedItems` 避免客户、港口、船公司等选择组件重复请求详情。
- **船公司选中回显：** 详情接口返回 `carrierLogo` 后，编辑页在 `carrierId` 的 `selectedItems` 中同步拼接 `logo`，确保 `CarrierSelect` 首屏即显示“Logo + 名称”。
- **锁定状态展示：** 左侧委托信息显示委托编号、会计期间、应结日期、所属公司，并以标签展示“业务已/未锁定”和“费用已/未锁定”。保存时会把只读锁定状态带回 `transportOrder`。
- **费用数量提示：** 工作台进入后调用 `getOrderFeePagedList({ TransportOrderId })`，统计应收 `paySide === 0` 与应付 `paySide === 1` 数量，将费用标签显示为“应收应付 x - y”，并每 60 秒刷新一次。
- **订单费用处理：** 费用页基于运输单 ID 加载应收应付费用，字段覆盖费用代码、结算对象、币种、汇率、单价、金额、税率、开票/结算金额、可开票、机密、费用状态等；费用状态包括录入、提交审核、审核通过、驳回、申请修改、申请删除、部分结算、结算完毕。
- **更改单处理：** 更改单页基于运输单 ID 管理变更原因、会计期间和关联费用，接口使用 `/services/app/ChangeOrderAdmin`；更改单 DTO 带 `feeLocked` 和费用锁定人/时间信息。
- **派车处理：** 派车页按 `seaExportId` 分页加载派车记录，支持新增、编辑、删除，维护车队、要求时间、派车时间、工厂联系人、堆场、截关时间、工厂、区域地址、注意事项以及派车箱明细。
- **分单处理：** 分单页按 `seaExportId` 分页加载分单记录，支持新增、编辑、删除，维护分单相关方、提单号、货物、签单、运费/服务代码以及分单箱明细。
- **取消与返回：** 嵌入表单内的取消按钮仍会返回 `/sea-exports` 列表；编辑保存成功后停留当前工作台上下文。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| 页面初始 | 用户进入 `/sea-exports/:id/edit` | 工作台加载 | 路由只匹配 36 位 GUID，工作台以该 ID 作为海出上下文。 |
| 基础信息标签 | 组件挂载 | 详情回填 | 调用 `DetailAsync`，把海出字段和运输单字段展开到多分区表单。 |
| 基础信息编辑中 | 点击保存且校验通过 | 编辑成功 | 调用 `EditAsync`，成功提示后停留当前编辑上下文。 |
| 基础信息编辑中 | 点击取消 | 返回列表 | 跳转 `/sea-exports`。 |
| 任意工作台状态 | 切换到费用标签 | 费用列表加载 | `OrderFee` 以运输单 ID 查询费用明细，并可维护应收/应付。 |
| 费用录入状态 | 提交审核 | 提交审核 | 费用状态由录入进入审核链路，审核结果在费用审核模块处理。 |
| 费用提交审核 | 审核通过 | 审核通过 | 费用可进入后续开票、付款、对账、结算链路。 |
| 费用提交审核 | 审核驳回 | 驳回 | 费用回到可修正状态，具体可编辑范围以后端状态规则为准。 |
| 费用已审核或结算中 | 申请修改/删除 | 申请修改/申请删除 | 通过审核任务处理已进入管控状态的费用变动。 |
| 费用锁定 | 用户进入更改单 | 更改单承载变更 | 更改单记录变更原因与费用列表，保留锁费状态和锁费人/时间。 |
| 派车/分单标签 | 新增或编辑弹窗提交 | 子记录更新 | 子模块以 `seaExportId` 作为外键保存并刷新分页列表。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **海出 ID** | 工作台路由上下文主键。 | 路由动态段 `:id` / `SeaExportDto.id` | **触发/依赖：** 用于加载海出详情、派车、分单等子资源。 | 路由正则要求 36 位 GUID。 |
| **运输单 ID** | 费用、更改单等公共业务的上下文主键。 | `detail.transportOrder.id` | **触发/依赖：** 费用统计、费用分页、更改单查询均依赖 `TransportOrderId`。 | 详情必须返回有效运输单 ID。 |
| **委托编号 / 会计期间 / 应结日期 / 所属公司** | 左侧委托只读摘要。 | `transportOrder.commissionNum/accountDate/settlementDate`、`organizationUnits` | **触发/依赖：** 加载详情后刷新 `entrustReadonlyInfo`。 | 前端展示为只读。 |
| **业务锁定** | 业务资料是否已锁定。 | `transportOrder.isBusinessLocking` | **触发/依赖：** 编辑页以锁图标标签展示，保存时保留当前只读值。 | 不在当前表单中直接切换。 |
| **费用锁定** | 费用是否允许继续变动。 | `transportOrder.feeLocked`、更改单 `feeLocked` | **触发/依赖：** 影响订单费用与更改单业务判断；费用锁定/解锁入口在费用管理模块。 | 当前页展示并随 DTO 带回，不直接切换。 |
| **费用标签数量** | 应收与应付费用数量摘要。 | `getOrderFeePagedList` / `paySide` | **触发/依赖：** 每 60 秒按运输单 ID 统计一次，应收为 `paySide=0`，应付为 `paySide=1`。 | 仅作为提示，不代表金额汇总。 |
| **船期时间（ETD/ATD/ETA）** | 预计开船、实际开船、预计到港时间。 | `transportOrder.etd/atd/eta` | **触发/依赖：** 编辑页详情回填到基础信息表单，费用页与更改单顶部摘要按同一字段显示。 | 允许为空，提交时统一转 ISO 字符串。 |
| **carrierLogo / carrierId** | 船公司主数据与 Logo 回显。 | `SeaExportAdmin.DetailAsync` 返回 `carrierLogo`，`CarrierSelect` 读取 `selectedItems.logo.url` | **触发/依赖：** 编辑页回填 `carrierId` 时附带 `carrierLogo`，下拉候选项与选中态统一显示图文。 | Logo 缺失时回退为纯文本显示，不阻断保存。 |
| **订单费用** | 应收应付明细。 | `OrderFeeAdminApi.OrderFeeDto` / `/services/app/OrderFeeAdmin` | **触发/依赖：** 费用状态进入审核、开票、付款、对账、结算链路。 | 费目、结算对象、币种、金额、税率等以后端校验为准。 |
| **费用状态** | 费用生命周期状态。 | `getFeeStatusOptions` | **触发/依赖：** 录入、提交审核、审核通过、驳回、申请修改、申请删除、部分结算、结算完毕。 | 不同状态下可编辑范围不同，需以后端和费用表格逻辑为准。 |
| **更改单** | 业务变更记录及其关联费用。 | `ChangeOrderAdminApi.ChangeOrderDto` / `/services/app/ChangeOrderAdmin` | **触发/依赖：** 更改单携带 `accountDate`、`reason`、`orderFees` 和锁费信息。 | 必须保持同一 `transportOrderId`。 |
| **派车记录** | 出口拖车/派车执行信息。 | `dispatch/index.vue` / `dispatch-admin` | **触发/依赖：** 以 `seaExportId` 查询和保存；包含车队、堆场、工厂、地址和派车箱明细。 | 子记录需绑定当前海出 ID。 |
| **分单记录** | 分票提单及其货物/箱明细。 | `modules/separate-bill.vue` / `sea-export-separate-admin` | **触发/依赖：** 以 `seaExportId` 查询和保存；维护分单相关方、提单、签单、货物、箱明细。 | 子记录需绑定当前海出 ID。 |
| **显示字段配置** | 费用/更改单顶部摘要字段显示控制。 | `useDisplayFieldConfig` / localStorage key `order_fee_display_config` | **触发/依赖：** 费用页与更改单页共用同一配置缓存。 | 仅影响前端展示。 |
| **委托单位 / 起运港** | 服务项目联动查询入参。 | `transportOrder.clientId`、`polId`；`GetServiceTypesByPOLAsync` | **触发/依赖：** 任一变更触发联动；`polId` 为空清空勾选。`polId` 查询用于可见范围，`polId+clientId` 查询用于默认勾选。 | 与新建页同一套 `form.vue` 逻辑。 |
| **服务项目 / serviceTypes** | 订舱～保险及代收支勾选结果。 | 服务项卡片；`serviceTypes` 数组（0–5） | **触发/依赖：** 编辑页进入后会按当前 `polId/clientId` 强制重算；起运港未配置的服务卡片直接隐藏并清空值。 | 代收支勿仅凭 `organizationUnits` 推断勾选。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：海出 ID 与运输单 ID 不能混用]** 编辑路由上的 `:id` 是海出主记录 ID；费用和更改单使用的是 `detail.transportOrder.id`。派车、分单使用 `seaExportId`。新增子模块时必须先确认使用哪一个上下文 ID。
>
> **[卡点 2：基础信息表单是嵌入复用]** 编辑工作台没有重新实现基础信息，而是用 `form.vue` 的 `embedded` 模式。修改新建页字段时往往也会影响编辑页，需同步确认 `isEdit`、详情回填和 DTO 构造。
>
> **[卡点 3：锁定状态目前以展示和透传为主]** 当前编辑表单展示业务锁定与费用锁定，并在保存 DTO 时保留其值，但不提供直接切换入口。锁费相关实际操作应与费用锁定页面或后端状态规则保持一致。
>
> **[卡点 4：费用标签数量是轮询统计]** `editor.vue` 每 60 秒刷新费用数量。若后续增加组件卸载、缓存或多工作台实例，需要注意定时器生命周期，否则可能出现重复请求。
>
> **[卡点 5：费用与更改单共享展示配置]** 两个页面共用 `order_fee_display_config` 作为显示字段配置缓存。调整字段 key 或默认显示项时，会同时影响费用和更改单顶部摘要。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-05-29 | `Fix` | 服务项目联动拆分为双查询：起运港决定卡片是否展示，客户维度决定默认勾选；未配置服务卡片隐藏。 | 编辑页在 `loadEditData` 后强制执行 `syncServiceTypesByPol({ force: true })`，确保详情旧值不会覆盖当前配置。 |
| 2026-05-25 | `Fix` | 修复委托单位已选仍提示必选：联动监听改为 `onChange`，与新建页同源修复。 | 嵌入模式共用 `bindServiceTypeLinkageEvents`，勿在 `updateSchema` 中绑定 `onUpdate:modelValue`。 |
| 2026-05-29 | `Fix` | 编辑页打开时代收支不再被 `organizationUnits` 单独误勾选；代收支是否默认勾选由服务项联动结果控制。 | 代收支勾选判定统一收敛到服务项联动流程，避免跨来源状态冲突。 |
| 2026-05-25 | `Feature` | 嵌入表单支持委托单位 + 起运港联动服务项目查询与 `checked` 自动勾选（含代收支）。 | 与 `/sea-exports/create` 共用 `form.vue`；编辑页仅在用户变更委托单位/起运港时联动。 |
| 2026-05-18 | `Feature/Fix` | `CarrierSelect` 选中态支持显示船公司 Logo；编辑页 `carrierId` 回填时拼接 `carrierLogo` 到 `selectedItems`，首屏回显稳定。 | 为兼容选中态图文展示，分页下拉选项类型由字符串标签扩展为可承载富渲染内容。 |
| 2026-05-17 | `Fix` | 修复干系人补录场景：新增角色后角色下拉保持可用，仅禁用重复角色选项，支持在缺失角色中手动选择。 | 无 |
| 2026-05-17 | `Fix` | 海运出口干系人固定角色（销售/商务/操作/客服/单证）改为不可删除、不可重复添加；销售与操作新增必填人员校验。 | 无 |
| 2026-05-17 | `Fix` | 编辑工作台基础信息、费用页与更改单摘要新增 `atd`（实际开船）显示，并保持在 `etd` 与 `eta` 之间。 | 无 |
| 2026-05-16 | `Parsing` | 无 | 结合 `editor.vue`、嵌入式 `form.vue`、费用、更改单、派车和分单模块补全工作台标签、ID 上下文、锁定状态、费用轮询统计、费用状态流转和子模块边界。 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/sea-exports/:id/edit` 对应组件 `src/views/sea-export-admin/editor.vue`，权限口径为 未在路由中声明独立权限。 |
