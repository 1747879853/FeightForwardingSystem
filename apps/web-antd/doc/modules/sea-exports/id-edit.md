---
title: 海运出口编辑工作台
module: 海运出口
author: auto-doc-sync
last_updated: 2026-07-11
---

<!-- 说明：本页复用 `form.vue`，其脚本已按批次拆分为 `sea-export-detail-mapper.ts`（映射）、`service-type-nodes.ts`（服务项纯逻辑）、`use-order-users.ts`（干系人）、`use-sea-export-ai-recognize.ts` + `modules/ai-extract-utils.ts`（AI 识别）、`use-sea-export-submit.ts`（保存提交/脏检查）等模块，样式外链至 `form.css`，行为不变。 -->

# 1. 业务背景说明 (Background)

**白话解释：** 海运出口编辑工作台是海出委托创建后的日常操作中心。它以路由中的委托 ID 作为上下文，聚合基础信息维护、费用录入与审核、更改单、派车、分单、问题记录和修改历史等子业务，使业务、单证、操作、客服、财务能够围绕同一运输单协同处理。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/sea-exports/:id/edit` |
| 路由名称 | `SeaExportEdit` |
| 页面组件 | `src/views/sea-export-admin/editor.vue` |
| 权限口径 | 路由参数限定为 36 位 GUID；通过 `activePath: /sea-exports` 归属海运出口菜单 |
| 关键源码 | `src/router/routes/modules/sea-export.ts`<br/>`src/views/sea-export-admin/list.vue`<br/>`src/views/sea-export-admin/basic-info-form/form.vue`（及同目录 README 与私有拆分文件）<br/>`src/views/sea-export-admin/editor.vue`<br/>`src/views/sea-export-admin/data.ts`<br/>`src/views/sea-export-admin/orderFee/data.ts`<br/>`src/api/sea-export/sea-export-admin.ts`<br/>`src/api/sea-export/order-fee-admin.ts`<br/>`src/api/sea-export/change-order-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **工作台标签导航：** `editor.vue` 维护顶部标签，包含基础信息、更改单、服务详情、单证信息、**附件**、应收应付、派车、分单、问题记录、修改历史。当前实现中基础信息、费用、更改单、**附件**、派车、分单已经挂载组件；服务详情、单证信息、问题记录、修改历史目前主要作为标签预留。
- **工作台 Tab 记忆：** 切换顶部标签时，按当前委托 ID 将 `activeTab` 写入 `sessionStorage`（键经 `buildBrandStorageKey` 品牌隔离）；再次进入同一票编辑页时自动恢复离开前的 Tab。切换不同委托 ID 时各自独立记忆；关闭浏览器标签后会话清空，下次默认回到「基础信息」。
- **浏览器标签栏标题：** 由嵌入的 `form.vue` 通过 `useSeaExportTabTitle` 动态设置：有主提单号显示「海运出口-{主提单号}」，否则显示「海运出口-{委托编号}」；主提单号录入或详情回填后实时更新。
- **基础信息维护：** 基础信息标签内复用 `form.vue` 的编辑态，以 `embedded` 模式嵌入工作台；详情来自 `getSeaExportDetail`，保存调用 `editSeaExport`。
- **AI 识别辅助：** 与新建页共用 `form.vue` 顶栏「AI识别」：支持 PDF/图片上传，对接 TextIn `ExtractSeaExportToAddDtoAsync`；识别结果覆盖回填（空值/0/空 Guid 跳过），右侧 Drawer 预览原文件并支持 citations 字段定位高亮。
- **服务项目联动：** 嵌入的 `form.vue` 在变更委托单位或起运港时执行双语义查询：仅 `polId` 决定节点可见范围，`polId+clientId` 决定默认勾选。**新建页**与**编辑页**均走 POL 联动，但语义不同：
  - **编辑首屏**：拉 `GetServiceTypesByPOLAsync`（按 `polId`）仅作为**元数据**（`sortId`/`userAttribute`/`seServiceLocks`/`seServiceRequires`）；勾选与任务进度以详情 `seaExportServices` 为准；港口配置缺失的历史服务项照常保留（回填期间 `suppressServiceTypeLinkage` 抑制误触发）。
  - **编辑改起运港 / 改委托单位**：按新 `polId(+clientId)` 的 `checked` **重写勾选**（客户排除项默认不勾、可手动勾回），并**丢弃任务进度**，流水线回到「新建态」仅展示服务项、不显示待处理/已完成任务，直至保存成功后 `loadEditData` 恢复真实任务态。
- **服务项目流水线（Chevron 三态）：** 仅展示已勾选节点，**完全按 `sortId` 分组**：同 `sortId` 节点在 Chevron 流中无缝咬合成一块：咬合位移下沉到 `item` 层（每个非组首节点重叠一个箭头宽），组内相邻节点稳定无缝、跨组仍保持箭头链流向，仅整条链全局首端左收圆、尾端右收圆；不同 `sortId` 组之间保留间距以区分分组。**视觉分组只看 `sortId`，不再区分待处理/已完成/还未到**（旧的「仅全『还未到』组才合并成单标签块」逻辑已移除）；组内每个服务仍各自渲染、单独完成/取消完成。组内服务为同一优先级，轮到该组时全部待处理节点同时显示「处理中」、展示处理人且均可操作，组内全部完成后才进入下一 `sortId` 组。**顶栏内联展示**：与 AI 识别等同处 `content-section__actions` 一行，左侧为「服务项目」标题、`...` 配置入口与紧凑流水线，右侧为操作按钮。节点增删在「配置服务」弹窗维护（按 `sortId` 分组展示 POL 全部节点 Checkbox）；**任意勾选变化**时编辑态点「确定」弹出二次确认后自动保存（弹窗内无常驻提示）。悬浮 Tooltip 可「完成服务」/「取消完成」。保存提交 `serviceTypes: number[]`。
- **执行方字段独立：** `bookingAgentId`/`teamId`/`custBrokerId`/`warehouseId`/`insuranceId` 与流水线节点完全解耦，始终全量显示，不随节点勾选状态联动。
- **干系人角色约束：** 销售、操作不可删除且必须已选人（销售必须且只能有一人）；其他角色按需添加。保存时另按当前勾选服务项的 `userAttribute` 动态校验（每服务至少一个绑定角色已选人）。
- **详情回填：** `form.vue` 通过 `flattenDetail` 把 `SeaExportDto` 和内层 `transportOrder` 拉平成多个表单分区，同时通过 `selectedItems` 避免客户、港口、船公司等选择组件重复请求详情。
- **船公司选中回显：** 详情接口返回 `carrierLogo` 与 `carrierCnShortName` 后，编辑页在 `carrierId` 的 `selectedItems` 中拼接 `cnShortName`、`code`（若有）与 `logo`，确保 `CarrierSelect` 首屏即显示“Logo + CODE(简称)”。
- **锁定状态展示：** 左侧委托信息显示委托编号、会计期间、应结日期、所属公司，并以标签展示“业务已/未锁定”和“费用已/未锁定”。保存时会把只读锁定状态带回 `transportOrder`。
- **费用数量提示：** 工作台进入后调用 `getOrderFeePagedList({ TransportOrderId })`，统计应收 `paySide === 0` 与应付 `paySide === 1` 数量，将费用标签显示为“应收应付 x - y”，并每 60 秒刷新一次。
- **订单费用处理：** 费用页基于运输单 ID 加载应收应付费用，字段覆盖费用代码、结算对象、币种、汇率、单价、金额、税率、开票/结算金额、可开票、机密、费用状态等；费用状态包括录入、提交审核、审核通过、驳回、申请修改、申请删除、部分结算、结算完毕。应收/应付表工具栏支持勾选已保存费用后「打印」：`printJsonType` 分别为 `1000`（应收）/ `1500`（应付），JSON 为选中费用对象数组。
- **更改单处理：** 更改单页基于运输单 ID 管理变更原因、会计期间和关联费用，接口使用 `/services/app/ChangeOrderAdmin`；更改单 DTO 带 `feeLocked` 和费用锁定人/时间信息。
- **派车处理：** 派车页按 `seaExportId` 分页加载派车记录，支持新增、编辑、删除，维护车队、要求时间、派车时间、工厂联系人、堆场、截关时间、工厂、区域地址、注意事项以及派车箱明细。
- **分单处理：** 分单页按 `seaExportId` 分页加载分单记录，支持新增、编辑、删除，维护分单相关方、提单号、货物、签单、运费/服务代码以及分单箱明细。
- **附件管理：** 附件 Tab（位于单证信息之后）按附件详细类型分组展示；进入时并行加载模块默认类型配置与已有附件；上传/删除即时调用 `AddAttachmentsAsync`/`DeleteAttachmentsAsync`；默认客户可见，无 `Admin.SeaExport.Edit` 时只读。
- **打印：** 顶栏「打印」按钮调用全局 `usePrintFormat().openPrint`：先弹窗选择 `PrintJsonType=0`（海运出口详情）下的打印模板，确认后调 `PrintAsync` 生成 PDF 并触发下载。新增模式禁止打印；有未保存修改时二次确认后按当前表单内容打印，否则重新拉取 `DetailAsync` 原始对象序列化。
- **保存 / 复制（合并按钮）：** 编辑页顶栏「保存」为 `Dropdown.Button`，主键点击保存；鼠标悬浮展开下拉「复制」（需 `Admin.SeaExport.Add`）。复制若表单有未保存修改先警告，确认后弹窗可选 `copyOrderFees`（默认不复制），`CopyAsync` 成功后 `replace` 至新票编辑页。新建态无复制项，退化为普通「保存」按钮。顶栏不再有「取消」按钮与订阅状态 Tag。
- **运踪订阅：** 基础信息 Tab 顶栏「运踪订阅」（仅编辑态，需 `Admin.ExternalApi.Use`）；点击直接发起单票订阅，无二次确认；与列表共用 `useYundangOceanSubscribe`。
- **查看运踪：** 基础信息 Tab 顶栏「查看运踪」（仅编辑态，需 `Admin.ExternalApi.Get`）；调用 `GetOceanPushInfoAsync` 弹窗展示订阅概要、里程碑、航段、集装箱轨迹；等待推送态自动轮询刷新。
- **完成服务：** 编辑态服务流水线「完成服务」/「取消完成」成功后重新拉取详情，同步任务状态、勾选展示及只读摘要。「完成」仅 `seServiceTaskUsers` 处理人可操作；「取消完成」仅 `completionUserId` 对应完成人可操作；无权限时悬浮展示提示。
- **已完成服务锁定字段只读：** 编辑态按「所有已完成任务对应服务项的 `seServiceLocks` 并集」将相关表单字段置为 `disabled`（`SeaExportPropEnum → 字段名` 映射，广播到基础/船期/港口表单）；取消完成或改港重写后自动解除。锁定字段虽 `disabled`，其值仍随 DTO 提交、由后端用库值覆盖。
- **保存重建二次确认：** 编辑保存时，若 `polId` 或勾选 `serviceType` 集合相对详情发生变化，**且本票已存在任意服务任务**，弹确认「将清空全部服务任务进度并重新生成」，取消则中止保存。配置弹窗「确定」后直接应用勾选并保存，重建确认统一由保存流程处理。
- **服务责任角色预校验：** 保存前复用 `validateServiceBoundOrderUsers`，按当前勾选服务项的 `userAttribute` 校验干系人（每服务至少一个绑定角色已选人）；编辑态因已取到 POL 配置的 `userAttribute` 而生效。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| 页面初始 | 用户进入 `/sea-exports/:id/edit` | 工作台加载 | 路由只匹配 36 位 GUID，工作台以该 ID 作为海出上下文。 |
| 基础信息标签 | 组件挂载 | 详情回填 | 调用 `DetailAsync`，把海出字段和运输单字段展开到多分区表单。 |
| 基础信息编辑中 | 点击保存且校验通过 | 编辑成功 | 调用 `EditAsync`，成功提示后停留当前编辑上下文，并调用 `loadEditData` 重新拉取详情。 |
| 基础信息编辑中 | 点击取消 | 返回列表 | 跳转 `/sea-exports`。 |
| 基础信息编辑中 | 点击复制并确认 | 新票编辑页 | 若有未保存修改先警告；调 `CopyAsync` 后 `replace` 至 `/sea-exports/{newId}/edit`。 |
| 任意工作台状态 | 切换顶部标签 | 写入 Tab 记忆 | `activeTab` 按委托 ID 存入 `sessionStorage`。 |
| 再次进入编辑页 | 组件挂载 / `editId` 变化 | 恢复离开前 Tab | 读取有效 `TabKey`；无记录或非法值时回退「基础信息」。 |
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
| **carrierLogo / carrierId / carrierCnShortName** | 船公司主数据、简称与 Logo 回显。 | `SeaExportAdmin` 返回 `carrierCnShortName`、`carrierLogo`；`CarrierSelect` 默认 `labelKey=cnShortName` | **触发/依赖：** 编辑页回填 `selectedItems` 时使用 `cnShortName`（回退 `carrierName`）并附带 `logo`、`code`；列表与工作台优先展示简称。 | Logo 或简称缺失时回退全称/纯文本，不阻断保存。 |
| **订单费用** | 应收应付明细。 | `OrderFeeAdminApi.OrderFeeDto` / `/services/app/OrderFeeAdmin` | **触发/依赖：** 费用状态进入审核、开票、付款、对账、结算链路。 | 费目、结算对象、币种、金额、税率等以后端校验为准。 |
| **费用状态** | 费用生命周期状态。 | `getFeeStatusOptions` | **触发/依赖：** 录入、提交审核、审核通过、驳回、申请修改、申请删除、部分结算、结算完毕。 | 不同状态下可编辑范围不同，需以后端和费用表格逻辑为准。 |
| **更改单** | 业务变更记录及其关联费用。 | `ChangeOrderAdminApi.ChangeOrderDto` / `/services/app/ChangeOrderAdmin` | **触发/依赖：** 更改单携带 `accountDate`、`reason`、`orderFees` 和锁费信息。 | 必须保持同一 `transportOrderId`。 |
| **派车记录** | 出口拖车/派车执行信息。 | `dispatch/index.vue` / `dispatch-admin` | **触发/依赖：** 以 `seaExportId` 查询和保存；包含车队、堆场、工厂、地址和派车箱明细。 | 子记录需绑定当前海出 ID。 |
| **分单记录** | 分票提单及其货物/箱明细。 | `modules/separate-bill.vue` / `sea-export-separate-admin` | **触发/依赖：** 以 `seaExportId` 查询和保存；维护分单相关方、提单、签单、货物、箱明细。 | 子记录需绑定当前海出 ID。 |
| **附件分组** | 按附件详细类型（提单、托书等）展示的上传区域与文件列表。 | `GetListByModuleTypesAsync` + `GetAttachmentsAsync` / `SeaExportAdmin` | **触发/依赖：** `moduleType` 取枚举「海运出口」；空配置类型仍展示上传槽位。 | 上传需 `Admin.SeaExport.Edit`；`clientVisible` 仅在上传时设定。 |
| **显示字段配置** | 费用/更改单顶部摘要字段显示控制。 | `useDisplayFieldConfig` / localStorage key `order_fee_display_config` | **触发/依赖：** 费用页与更改单页共用同一配置缓存。 | 仅影响前端展示。 |
| **港口备注（费用摘要）** | 收货地/起运港/中转港1/2/目的港/交货地备注。 | `SeaExportDto` 的 `receivePortRemark`、`polRemark`、`poT1Remark`、`poT2Remark`、`podRemark`、`deliverPortRemark` | **触发/依赖：** 应收应付与更改单顶部订单信息六段港口均展示备注字段，非 `*Name`。 | 备注为空显示 `--`。 |
| **委托单位 / 起运港** | 服务项目联动查询入参。 | `transportOrder.clientId`、`polId`；`GetServiceTypesByPOLAsync` | **触发/依赖：** 任一变更触发联动；`polId` 为空清空勾选。`polId` 查询用于可见范围，`polId+clientId` 查询用于默认勾选。 | 与新建页同一套 `form.vue` 逻辑。 |
| **服务项目 / serviceTypes** | POL 配置下的服务节点勾选结果（与执行方字段解耦）。 | `serviceTypeNodes`；提交字段 `serviceTypes: number[]` | **触发/依赖：** **新建**：节点来自 `GetServiceTypesByPOLAsync`；**编辑**：节点仅来自 `seaExportServices`，POL 不参与。label 来自 `ServiceType` 枚举。 | 勿再用执行方字段或 `organizationUnits` 推断节点勾选。 |
| **货物类型 cargoId** | 普通货/冻柜/危险品/超限箱。 | `transportOrder.cargoId`；枚举 `CargoType`（S=0/R=1/D=2/O=3） | **触发/依赖：** 货物信息 Card 标题行内联选择；`R` 展示冻柜 7 项，`D` 展示危险品 11 项；切换离开对应类型清空扩展字段。 | 全部可选；扩展字段经 `transportOrder` 提交。 |
| **危险品扩展字段** | 危品申报信息（等级、编号、联系人等）。 | `transportOrder.dgLevel` 等 11 项 | **触发/依赖：** 仅 `cargoId=2` 时展示与提交。 | 字符串最长 32；`dgMarinePollution` 三态 bool。 |
| **冻柜扩展字段** | 冷藏温度、通风、湿度等。 | `transportOrder.reeferTemperature` 等 7 项 | **触发/依赖：** 仅 `cargoId=1` 时展示与提交；`reeferTemperatureUnit` 前端枚举 `0=℃/1=℉`。 | 全部可选；`reeferVentOpen` 三态 bool。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：海出 ID 与运输单 ID 不能混用]** 编辑路由上的 `:id` 是海出主记录 ID；费用和更改单使用的是 `detail.transportOrder.id`。派车、分单使用 `seaExportId`。新增子模块时必须先确认使用哪一个上下文 ID。
>
> **[卡点 2：基础信息表单是嵌入复用]** 编辑工作台没有重新实现基础信息，而是用 `form.vue` 的 `embedded` 模式。修改新建页字段时往往也会影响编辑页，需同步确认 `isEdit`、详情回填和 DTO 构造。
>
> **[卡点 3：锁定状态目前以透传为主]** 编辑表单已移除业务/费用锁定 Tag 展示，保存 DTO 时仍保留 `isBusinessLocking`/`feeLocked` 原值，但不提供直接切换入口。锁费相关实际操作应与费用锁定页面或后端状态规则保持一致。
>
> **[卡点 4：费用标签数量是轮询统计]** `editor.vue` 每 60 秒刷新费用数量。若后续增加组件卸载、缓存或多工作台实例，需要注意定时器生命周期，否则可能出现重复请求。
>
> **[卡点 5：费用与更改单共享展示配置]** 两个页面共用 `order_fee_display_config` 作为显示字段配置缓存。调整字段 key 或默认显示项时，会同时影响费用和更改单顶部摘要。
>
> **[卡点 6：编辑服务项目会重新生成全部任务]** 保存时若起运港或勾选服务项集合相对详情变化、且本票已有任务，弹重建二次确认；确认后清空全部服务任务进度并按新配置重新生成（含已完成任务）。仅前端 `sortId` 变化不重建（后端以港口配置为准）。取消完成会删除大于当前 `sortId` 的后续任务。

> [!IMPORTANT] **[卡点 7：编辑改起运港/委托单位会重写勾选并清空进度]** 编辑改 `polId` 或 `clientId` 会按新港+客户 `checked` 重写勾选、丢弃任务进度并回到「新建态」流水线；已完成任务锁定的字段（`seServiceLocks`）会被置只读，需先取消完成才能改。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-07-11 | `Style` | 运踪模块去除第三方服务商名称（i18n/注释/历史文档补漏）。 | 用户可见层统一「运踪」表述；内部 API 字段名保持不变。 |
| 2026-07-11 | `Style` | 顶栏精简：移除订阅状态 Tag 与「取消」按钮；「复制」并入「保存」为悬浮下拉（`Dropdown.Button`），主键保存、下拉复制。运踪时间轴改苹果风（实心圆点+系统色+胶囊标签），「待发生」拆为「计划中/未到」。 | 删除 `handleCancel`/`yundangSubscribeStatusMeta`；`DropdownButton = Dropdown.Button`；`yundang-tracking-modal.vue` 圆点与分割线对齐 12px 中轴。 |
| 2026-07-11 | `Feature` | 顶栏新增「查看运踪」按钮（`Admin.ExternalApi.Get`），弹窗对接 `GetOceanPushInfoAsync`，含等待推送轮询。 | 复用 `useYundangOceanTrack` 与列表同源 `yundang-tracking-modal.vue`。 |
| 2026-07-11 | `Feature` | 顶栏：未订阅不展示状态 Tag（靠「运踪订阅」按钮判断）；失败/成功展示 Tag，按钮文案「运踪订阅/重新订阅」，成功时禁用；订阅后重拉详情。 | `loadEditData` 回填两字段；复用 `getYundangSubscribeStatus(Meta)`；`none` 不渲染 Tag。 |
| 2026-07-11 | `Refactor` | 无（纯代码组织调整，行为不变）。 | 基础信息表单收敛至 `basic-info-form/` 目录：迁入 `form.vue`/`form.css` 及 5 个私有拆分文件（`sea-export-detail-mapper`/`service-type-nodes`/`ai-extract-utils`/`use-order-users`/`use-sea-export-ai-recognize`/`use-sea-export-submit`），新增 README 梳理职责与依赖；路由 `SeaExportCreate` 与 `editor.vue` 引用同步更新；清理 `form.vue` 5 处未使用声明（`ArrowLeft`/`Users`/`pageTitle`/`isServiceTypeNodeDone`/`handleBack`）。共享文件保留原位（`data.ts`/`service-type.ts`/`use-sea-export-copy`/`use-yundang-ocean-subscribe`）。 |
| 2026-07-11 | `Refactor` | 无（纯代码组织调整，行为不变）。`form.vue`（新建/编辑共用）按批次拆分，累计 6581→约 3191 行（样式移至 `form.css`）。 | 批次 1 抽 `sea-export-detail-mapper.ts`（映射）；批次 2 抽 `service-type-nodes.ts`（服务项纯逻辑）；批次 3 抽 `use-order-users.ts`（干系人 composable，模板仍在 form.vue）；批次 4 把 AI 字段白名单/规范化下沉 `modules/ai-extract-utils.ts`，编排抽为 `use-sea-export-ai-recognize.ts`（DOM 触发 `aiExtractFileInputRef`/`handleAiRecognize` 留 form.vue，规避 Volar 对模板 `ref=""` 不计读取的误报）；批次 5 把 `buildDto` 抽为纯函数 `buildSeaExportDto`、`submitting`/校验/重建确认/提交/脏检查抽为 `use-sea-export-submit.ts`；批次 6 把 `<style scoped>` 外链为 `form.css`（`<style scoped src>`），并为共享 stylelint 配置放宽 `.css`/`.scss` 的 `:deep`/`:global`。基线 stash 对比确认类型错误集无新增（批次 5 另消除 1 处 `polId` 历史报错）。 |
| 2026-07-11 | `Feature` | 编辑工作台记住当前顶部 Tab：离开后再进入同一票自动打开离开前的标签。 | `editor.vue` 用 `sessionStorage` + `buildBrandStorageKey('sea-export-edit-active-tab:{id}')`；`watch(activeTab)` 写入、`watch(editId)`/初始化读取；非法 key 回退 `basic`。 |
| 2026-07-11 | `Style` | 顶部 Tab 与表单间距改为只靠内容区 padding 控制（去掉外层 `gap-2`）；服务流水线组间间距缩小（内联 `4px` / 普通 `6px`）。 | `editor.vue` 外层去掉 `gap-2`；`.service-chevron-flow__group + .group` 间距下调。 |
| 2026-07-11 | `Fix` | 服务流水线同 `sortId` 组内节点未合并、组间露三角缝修复：改为组内无缝咬合、组间留间距区分、整条保持箭头链流向。 | 咬合位移由 `chevron-step` 下沉到 `service-chevron-flow__item` 层（普通 `-12px`/inline `-7px`），每组组首 `item` 不做位移；`isServiceChevronFlowFirst/Last` 改回按整条链全局首尾计算；组间 `margin` 恢复。 |
| 2026-07-11 | `Style` | 服务流水线视觉分组只按 `sortId` 合并成块，不再区分任务状态（移除仅「还未到」组合并的特判）；组内服务仍各自单独完成/取消完成。 | 删除 `isServiceGroupAllUpcoming`/`formatServiceGroupLabels`/`isServiceChevronGroupFirst`/`isServiceChevronGroupLast` 与合并单标签块模板；`isServiceChevronFlowFirst/Last` 改为按组内首尾节点计算。 |
| 2026-07-11 | `Feature` | 编辑页服务项目重接 POL 联动：首屏拉配置仅作元数据（勾选/进度仍以详情为准）；改起运港/委托单位按 `checked` 重写勾选并回到新建态流水线；已完成任务的 `seServiceLocks` 字段只读；保存时按「港变或集合变且已有任务」弹重建确认；补齐服务责任角色预校验。 | 新增 `applyServiceTypeStateForEditInitial`/`getServiceLockedFieldNames`/`applyServiceLockedFields`/`confirmServiceTaskRebuild`；移除 `syncServiceTypesByPol`/`queueSyncServiceTypesByPol` 的 `isEdit` 短路，改用 `suppressServiceTypeLinkage`；删除 `applyServiceTypeStateFromDetail`/`buildServiceTypeNodesFromDetail`；`handleSubmit` 增加重建判定与确认。 |
| 2026-07-10 | `Fix` | 编辑页服务项目与 POL 解耦：仅新增页拉取 POL 渲染；编辑态只读详情 `seaExportServices`，改起运港/委托单位不再重查 POL。（本条已被 2026-07-11 重接 POL 联动取代） | `applyServiceTypeStateFromDetail`；`syncServiceTypesByPol`/`queueSyncServiceTypesByPol` 在 `isEdit` 短路。 |
| 2026-07-09 | `Fix` | 服务项目顶栏流水线与配置弹窗按 `sortId` 视觉分组：同组节点紧密排列为一块，不同优先级组之间留出间距。 | `checkedServiceTypeNodeGroups` / `serviceTypeNodeGroups` 复用 `groupServiceTypeNodesBySortId`；Chevron 首尾样式按全局首尾节点计算。 |
| 2026-07-08 | `Fix` | 服务流水线按 `sortId` 分组推进：同组服务同时处于「处理中」、展示处理人且均可完成；组内全部完成后才进入下一优先级。 | `getServicePipelineActiveSortId` 替代按数组下标找首个未完成节点；`canCompleteServiceTypeNode` 要求处于当前活跃组。 |
| 2026-07-08 | `Feature` | 船期信息标题栏新增「同步日期」：船名+航次+开船日期齐全后可按历史票证回填 ATD/ETA/截 VGM/截单/截舱单。 | 与新建页共用 `form.vue` + `use-sync-shipment-dates.ts`。 |
| 2026-07-08 | `Style` | 箱型箱量标题栏新增/删除等按钮改为紧跟标题靠左，不再顶到右侧。 | 共用 `order-ctn-table.vue`；去掉标题 `flex: 1`。 |
| 2026-07-07 | `Feature` | 货物信息区按 `cargoId` 条件展示危险品（11 项）与冻柜（7 项）扩展字段；切换类型清空对应数据；新建/编辑共用。 | `useDgFormSchema`/`useReeferFormSchema`；`flattenDetail`/`buildDto` 映射 `transportOrder`；列表不改。 |
| 2026-07-07 | `Feature` | 编辑工作台新增「附件」Tab（单证信息之后）：按附件类型分组、即时上传/删除、默认客户可见；仅编辑页可用。 | 对接 `GetAttachmentsAsync`/`AddAttachmentsAsync`/`DeleteAttachmentsAsync`；`moduleType` 经 `resolveModuleTypeByLabel` 解析；权限对齐 `Admin.SeaExport.Edit`。 |
| 2026-07-07 | `Feature` | 编辑页顶栏新增「复制」：未保存时警告，确认弹窗可选 `copyOrderFees`；成功后跳转新票编辑页。 | 复用 `useSeaExportCopy` + `isFormDirty`；权限 `Admin.SeaExport.Add`。 |
| 2026-07-07 | `Refactor` | 运踪订阅取消二次确认，点击按钮直接提交。 | 编辑页按钮 `:loading="subscribing"`。 |
| 2026-07-07 | `Style` | 页面旧版第三方品牌文案统一改为「运踪订阅」，不对外暴露服务商名称。 | 仅改 i18n 用户可见文案。 |
| 2026-07-07 | `Refactor` | 运踪订阅弹窗简化为确认框，仅传 `seaExportIds`；后端按 BLType 自动选择提单号或箱号订阅。 | 与列表共用 composable；权限仍为 `Admin.ExternalApi.Use`。 |
| 2026-07-07 | `Feature` | 基础信息 Tab 顶栏新增「运踪订阅」：单票对接批量运踪订阅，toast + 结果 Modal；提示按已保存数据订阅。 | `useYundangOceanSubscribe`；权限 `Admin.ExternalApi.Use`。 |
| 2026-07-07 | `Feature` | 应收应付 Tab 费用表支持勾选已保存行打印；应收 `PrintJsonType=1000`、应付 `1500`，JSON 为费用对象数组。 | `order-fee-table.vue` 复用全局 `usePrintFormat`；未保存行拦截；更改单 Tab 不展示打印。 |
| 2026-07-06 | `Feature` | 基础信息 AI 识别对接 TextIn：支持 PDF/图片、名称→id 回填、Drawer 预览 citations 定位；空值/0/空 Guid 不回填。 | 新建/编辑共用 `form.vue`；新增 `text-in-admin.ts`、`ai-extract-preview-drawer.vue`、`ai-extract-utils.ts`；移除 `runVisionOcrPdf` 调用。 |
| 2026-07-06 | `Feature` | 顶栏「打印」对接 `PrintFormatAdmin`：弹窗选模板后生成 PDF 下载；新增模式禁止打印；未保存修改二次确认后按当前表单打印，否则重新 DetailAsync。 | 全局封装 `components/print-format` + `app.vue` 挂载；业务模块传入 `printJsonType` 与 JSON 字符串。 |
| 2026-07-05 | `Fix` | 编辑页港口下拉（六段港口、签单港、付费地点）回显改为展示详情接口返回的 EDI 代码，与 `labelKey: 'ediCode'` 一致。 | `toPortSelectedItems` 注入 `ediCode`；`SeaExportDto` 补齐 `*EdiCode` 字段。 |
| 2026-07-02 | `Style` | 船期信息时间轴竖向分割条由「实际开船」后移至「预抵日期」后，左侧为货好至预抵，右侧为截 VGM/截单/截舱单。 | `.shipment-flow-divider` 左偏移 `57.14%`；横向箭头排除类由 `shipment-time-pos--3` 改为 `--4`。 |
| 2026-06-27 | `Fix` | 应收应付与更改单顶部订单信息六段港口改为展示 `*Remark` 备注字段，与表单港口备注口径一致。 | `displayList` 配置 key 仍为 `*Name` 以兼容 localStorage；数据源改读 `SeaExportDto` 备注字段。 |
| 2026-06-27 | `Feature` | 与新建页共用提单类字段全角转半角（唛头、货描、收发通、港口备注等），与英文大写串联执行。 | `toHalfWidth` 并入 `toEnglishUpperCase`；嵌入 `form.vue` 的输入组件与 AI/港口联动回填同步生效。 |
| 2026-06-27 | `Feature` | 浏览器标签栏标题随主提单号/委托编号动态更新；有主提单号优先展示主提单号。 | 嵌入 `form.vue` 调用 `useSeaExportTabTitle`；`KeepAlive` 下切换工作台子标签仍保持标题。 |
| 2026-06-22 | `Style` | 编辑/新建表单取消左侧委托栏：委托只读项与装运/订单类型并入「基础信息」标题行；业务来源、付费方式/地点、运输条款、贸易条款并入中间基础信息表单（提单/副本份数后）；备注信息与外部备注各占两列，置于收发通通知人下方；中间栏占满除右侧干系人外的宽度。 | 新增 `FrtPrepareInput` 合并 `codeFrtId`+`prepareAtId`；`blType`/`billType` 以隐藏字段存值，标题行 Select 通过 `basicInfoFormApi` 同步。 |
| 2026-06-26 | `Fix` | 干系人引用已删除用户时：`GetUserAsync` 静默请求、展示 `用户{id}（已删除）` 兜底，不再弹全局错误且 `UserSelect` 不回显纯数字 ID。 | `getUser({ silent: true })` + `skipErrorMessage`；逻辑复用 `utils/user-display.ts`。 |
| 2026-06-23 | `Style` | 顶栏服务项目 Chevron 节点宽度固定 96px；首节点（常为 Tooltip 分支）统一 `service-chevron-flow__item` 外包，避免宽度样式未命中。 | Tooltip 根节点非 `span` 时 `> :deep(span)` 选择器无效；首节点须 `margin-left: 0`。 |
| 2026-06-21 | `Style` | 服务项目流水线并入顶栏：左侧标题 + `...` 配置入口 + 紧凑 Chevron 节点，与 AI 识别等同行；配置入口悬停提示「配置服务」。 | `service-pipeline--inline` 承载顶栏内联样式，勿改全局 `.chevron-step` 以免影响其他场景。 |
| 2026-06-07 | `Fix` | 「完成」校验 `seServiceTaskUsers`，「取消完成」校验 `completionUserId`，无权限时隐藏按钮并提示。 | `showServiceCompletePermissionHint` 与 `showServiceCancelPermissionHint` 分轨。 |
| 2026-06-07 | `Fix` | 服务流水线「取消完成」增加二次确认，提示所有服务项目将重新生成任务。 | `confirmCancelCompleteServiceType` 复用 `SERVICE_TASK_REGENERATE_CONFIRM_SUFFIX` 文案。 |
| 2026-06-07 | `Fix` | 配置服务弹窗任意勾选变化即展示提示并二次确认，不再仅限取消已完成节点。 | `serviceTypeModalDraftChanged` 对比草稿与当前勾选；无变化直接关弹窗。 |
| 2026-06-07 | `Feature` | 编辑态配置服务弹窗点「确定」后自动保存；二次确认提示「编辑或取消任意服务项目后所有服务项目都会重新生成任务」。 | `applyServiceTypeModalDraftAndSave` 应用草稿后复用 `handleSubmit`；新建页仍仅应用草稿。 |
| 2026-06-17 | `Feature` | 与新建页共用提单类字段英文自动转大写（唛头、相关方备注、港口备注、主提单号、船名航次、箱号/封号等）。 | 嵌入 `form.vue` 的 `EnglishUpperInput`/`EnglishUpperTextarea` 与 `toEnglishUpperCase` 工具。 |
| 2026-06-07 | `Feature` | 服务流水线按进度三态展示，节点勾选改弹窗维护；已完成节点取消勾选对接 `CancelCompleteAsync`。 | `loadEditData` 后须再应用弹窗草稿，避免勾选态被详情覆盖。 |
| 2026-06-07 | `Style` | 服务项目 UI 改为 Chevron 箭头流水线（三态配色 + 悬浮 Tooltip），新建/编辑共用 `form.vue`。 | `clip-path` 箭头衔接；`Tooltip` 承载完成服务按钮，避免 `overflow-hidden` 裁切。 |
| 2026-06-07 | `Feature` | 船公司回显与列表对接 `carrierCnShortName`：`CarrierSelect` selectedItems 改用 `cnShortName`，列表优先展示简称。 | 与 `carrier-select.vue` 默认 labelKey 对齐；简称缺失时回退 `carrierName`。 |
| 2026-06-07 | `Feature` | 保存时按勾选服务项 `userAttribute` 动态校验干系人（每服务至少一个绑定角色已选人）；销售、操作始终静态必填。 | 与新建页共用 `validateRequiredOrderUserAssignee` + `validateServiceBoundOrderUsers`。 |
| 2026-06-07 | `Refactor` | 服务流水线改为 `ServiceTypeNode` 枚举驱动；执行方五字段与节点完全解耦、始终全量显示；删除代收支与 `organizationUnits` 提交；勾选回填改读 `seaExportServices`。 | 移除 field↔value 双向桥接层；`serviceTypes` 提交改由 `serviceTypeNodes.filter(checked)` 生成；`SeaExportDto` 对齐 OpenAPI 新增 `seaExportServices`。 |
| 2026-06-07 | `Refactor` | 编辑态 `DetailAsync` 返回的 `seaExportServices` 统一按 `serviceType` 与枚举中心 `ServiceType.value` 对齐，服务项标题使用 `ServiceType.displayName`。 | 通过运行时枚举映射替代本地常量值，服务项任务状态回填、勾选态识别与展示文案共用同一映射链路。 |
| 2026-05-30 | `Fix` | 编辑页保存、完成服务成功后均调用 `loadEditData` 重新拉取详情，避免本地状态与后端不一致。 | `handleSubmit`（编辑态）、`handleCompleteService` 成功后复用既有 `loadEditData` 回填链路。 |
| 2026-05-30 | `Fix` | 编辑态服务流水线：勾选表示任务已完成；状态/按钮按需渲染、宽度自适应；已有服务任务（任意状态）不可关闭服务。 | `getServiceItemCheckmarkShown`、`hasServiceItemTask`、`canToggleServiceItemNode`；保存仍用 `serviceItemEnabledValues`。 |
| 2026-05-30 | `Fix` | 起运港已选但未配置任何服务项时，服务项目区域展示空态提示，不再渲染空白。 | 与新建页共用 `form.vue`；空态判定依赖联动查询完成后的可见服务集合。 |
| 2026-05-30 | `Fix` | 服务项节点与保存 `serviceTypes` 顺序统一按接口 `sortId`；编辑页若详情未返回 `seaExportServices/serviceTypes`，服务项保持灰态未勾选，不再被起运港默认勾选覆盖。 | 服务项联动拆分为“可见范围（按 `polId`）”与“勾选来源（编辑态优先详情）”两层语义，避免历史单据状态被联动默认值污染。 |
| 2026-06-07 | `Style` | 干系人角色图标按货代岗位职责语义映射（销售握手、商务运价表、操作集卡、客服沟通、单证签发、海外协同）。 | 嵌入模式共用 `form.vue` 的 `getOrderUserRoleIcon`，仅影响展示。 |
| 2026-05-30 | `Refactor` | 嵌入式基础信息中的服务项类型值映射改为复用统一常量 `SERVICE_TYPE_VALUE`，与新建页和其他服务项页面统一。 | 编辑工作台复用 `form.vue`，因此服务项枚举值口径与新建页天然同源；本次把数值源头进一步收敛到 `service-type.ts`。 |
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
