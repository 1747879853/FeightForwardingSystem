---
title: 海运出口新建
module: 海运出口
author: auto-doc-sync
last_updated: 2026-06-07
---

# 1. 业务背景说明 (Background)

**白话解释：** 海运出口新建页用于从零创建海出委托主记录。页面以委托信息、基础信息、相关方、船期、港口、货物、服务项目、箱型箱量和备注为核心录入区。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/sea-exports/create` |
| 路由名称 | `SeaExportCreate` |
| 页面组件 | `src/views/sea-export-admin/form.vue` |
| 权限口径 | 路由未声明独立权限；通过 `activePath: /sea-exports` 归属海运出口菜单 |
| 关键源码 | `src/router/routes/modules/sea-export.ts`<br/>`src/views/sea-export-admin/list.vue`<br/>`src/views/sea-export-admin/form.vue`<br/>`src/views/sea-export-admin/editor.vue`<br/>`src/views/sea-export-admin/data.ts`<br/>`src/views/sea-export-admin/orderFee/data.ts`<br/>`src/api/sea-export/sea-export-admin.ts`<br/>`src/api/sea-export/order-fee-admin.ts`<br/>`src/api/sea-export/change-order-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **AI 识别辅助：** 页面提供“AI识别”按钮，只接受 PDF 文件，调用 `runVisionOcrPdf` 后把识别结果映射回表单字段。
- **品名选择交互：** “品名”改为可搜索的多选下拉，直接在主表单中完成选择，不再通过弹窗维护列表；下拉项与已选值展示为“品名-海关代码”，输入区宽度支持随内容自适应扩展（上限为父容器剩余宽度）。
- **干系人角色约束：** 销售、商务、操作、客服、单证、海外客服为固定角色，不允许删除和重复添加；销售与操作必须选择具体人员后才能保存。
- **服务项目联动（Chevron 三态流水线）：** 选择起运港后查询 POL 服务节点；流水线仅展示已勾选节点，按顺序呈现已完成/处理中/还未到三态。节点勾选在「配置服务」弹窗维护。未选起运港提示先选起运港；POL 无配置时展示空态；无勾选节点时提示「去配置」。
- **提交创建：** 保存时并行校验多个表单分区，构造 `SeaExportAddDto`，调用 `/services/app/SeaExportAdmin/AddAsync`。
- **创建后跳转：** 新增成功后优先解析接口返回的记录 ID 并跳转 `/sea-exports/{id}/edit`；若返回值无法解析，则回到 `/sea-exports` 列表。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **委托单位** | 委托客户，是运输单必填主体。 | `transportOrder.clientId`；`ClientSelect`（客户属性为委托单位） | **触发/依赖：** 选择后参与服务项目联动查询（`clientId`）；并自动带出干系人。 | 必填。 |
| **委托编号** | 业务委托号。 | `transportOrder.commissionNum`；按编号生成规则自动生成 |  | 前端禁用，不手工录入。 |
| **会计期间** | 财务期间。 | `transportOrder.accountDate` | **触发/依赖：** 新建、编辑保存后，后端按开船日期精度到月计算；无开船日期则取当前时间（到月）。 | 禁止手动修改。 |
| **应结日期** | 结算日期。 | `transportOrder.settlementDate` | **触发/依赖：** 新建、编辑保存后，后端按开船日期精度到天计算；无开船日期则取当前时间（到天），并结合委托单位账期规则。 | 禁止手动修改。 |
| **所属公司** | 业务单所属公司。 | `organizationUnits` | **触发/依赖：** 新建、编辑保存后，后端根据干系人中销售所属公司自动生成。 | 禁止手动修改。 |
| **业务来源** | 订单业务来源分类。 | `transportOrder.codeSourceId`；`CodeSourceSelect`（基础数据） | - | - |
| **付费方式** | 运费付费方式。 | `transportOrder.codeFrtId`；`CodeFrtSelect`（基础数据） | - | - |
| **付费地点** | 运费支付地点港口。 | `transportOrder.prepareAtId`；`PortSelect`（基础数据） | **触发/依赖：** 付费方式为预付时显示起运港（`polId`）；为到付时显示交货地（`deliverPortId`）。 | - |
| **运输条款** | 运输服务条款。 | `transportOrder.codeServiceId`；`CodeServiceSelect`（基础数据） | - | - |
| **贸易条款** | 贸易术语类型。 | `transportOrder.tradeTermsType`；枚举（CIF / FOB / EXW 等） | - | - |
| **业务锁定** | 业务资料是否锁定。 | `transportOrder.isBusinessLocking`；后端默认未锁定 | - | 禁止手动修改。 |
| **费用锁定** | 费用是否锁定。 | `transportOrder.feeLocked`；后端默认未锁定 | - | 禁止手动修改。 |
| **装运方式** | 整柜、拼箱分票、拼箱主票。 | `blType`；枚举 `0` 整柜 / `1` 拼箱分票 / `2` 拼箱主票 | **触发/依赖：** 默认整柜。 | - |
| **订单类型** | 直单或分单。 | `billType`；枚举 `0` 直单 / `1` 分单 | **触发/依赖：** 默认直单。 | - |

| **提单/副本份数** | 正本和副本份数。 | `BillCountsInput` -> `noBillEnum`、`copyNoBillEnum` | **触发/依赖：** 一个组件同时维护两个字段。 | 选项为 One 到 Ten。 | | **签单方式** | 签单业务分类。 | `CodeIssueTypeSelect` -> `codeIssueTypeId`，兼容旧字段 `issueType` | **触发/依赖：** DTO 同时保留新版和旧版字段兼容。 | 需选择有效代码资料。 | | **船名航次** | 船名和内航次。 | `VesselVoyageInput` -> `vessel`、`innerVoyno` | **触发/依赖：** 一个组合输入维护两个字段。 | 文本可为空，格式以后端为准。 | | **起运港** | 装货港。 | `polId`；`PortSelect` | **触发/依赖：** 变更时触发 `GetServiceTypesByPOLAsync`；选择港口可联动 `polRemark`。 | 联动查询依赖起运港有值。 | | **服务项目** | 订舱、拖车、报关、仓库、保险、代收支是否启用及对应服务商。 | 服务项卡片；`getServiceTypesByPOL`；提交字段 `serviceTypes`（`0-5`） | **触发/依赖：** `clientId`/`polId` 变化后按接口 `checked` 自动勾选/取消；`checked=true` 才可选手动服务商；取消勾选清空主体。代收支勾选时 `serviceTypes` 含 `5` 且可选组织部门。 | 只提交已勾选对应类型。 | | **相关方** | 发货人、收货人、通知人、第二通知人、目的港代理及文本内容。 | 客户选择组件，行业类别分别为 `b/e/h/s` 等 | **触发/依赖：** 文本内容可作为名称资料补充；支持复制收货人到通知人。 | 需选择有效客户或填写内容，具体以后端校验为准。 | | **订单人员** | 销售、商务、操作、客服、单证等角色用户。 | `UserSelect`、`UserAttribute` 枚举 -> `transportOrder.orderUsers` | **触发/依赖：** 固定角色不可删除且不可重复，新增仅补齐缺失角色，提交前按 `sortId` 排序并清洗无效行。 | 销售必须且仅一人；销售与操作必须选择人员。 | | **港口链路** | 收货地、起运港、中转港 1/2、目的港、交货地。 | `PortSelect` -> `receivePortId/polId/poT1Id/poT2Id/podId/deliverPortId` | **触发/依赖：** 选择港口后自动写入对应备注字段。 | 港口需来自港口基础资料。 | | **船期时间** | 货好、开船、实际开船、到港、截 VGM、截单、截舱单、签单时间。 | 日期组件 -> `goodsCompleteTime/etd/atd/eta/closeVgmTime/closeDocTime/closeManifestTime/signingTime` | **触发/依赖：** 提交时统一转 ISO 字符串。 | 日期组件控制格式；可为空。 | | **货物与箱型箱量** | 品名、唛头、件数、包装、毛重、体积和箱明细。 | `OrderGoodsButton`、`OrderCtnTable`、包装/货物/箱型基础资料 | **触发/依赖：** 提交时移除 `_rowKey` 等前端字段，只保留 API 字段。 | 数量类字段限制最小值和精度；箱明细至少需有有效箱型才有业务意义。 | | **收付款部门** | 委托归属的组织单位。 | `getOrganizationUnitTree` -> `organizationUnits` | **触发/依赖：** 勾选代收支/收付款部门后提交组织数组。 | 需选择组织树中的有效节点。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：一个页面拆成多个表单实例]** 保存时会同时校验相关方、委托、基础、船期、港口、货物类型、货物主信息、备注等多个 `useVbenForm` 实例。新增字段时必须接入对应分区的 `getValues()` 合并逻辑和 `buildDto()` 映射，否则界面能填但不会提交。
>
> **[卡点 2：新建 DTO 是双层结构]** `SeaExportAddDto` 承载海出专属字段，`transportOrder` 承载运输单公共字段。客户、相关方、件毛体、订单人员、箱型箱量等不在海出根字段上，错误放层级会导致后端收不到值。
>
> **[卡点 3：前端临时字段必须清洗]** 箱型箱量行使用 `_rowKey` 支撑表格渲染，订单人员行带 `userName` 等展示字段；提交时必须经过 `sanitizeOrderCtns`、`sanitizeOrderUsers` 清洗。
>
> **[卡点 4：新增成功跳转依赖后端返回 ID]** 前端兼容 `createdId.id`、`createdId.result` 和直接返回值三种形式。若接口不返回可解析 ID，页面只能回列表，无法自动进入编辑工作台。
>
> **[卡点 5：服务项目联动是“双语义”查询]** `polId` 查询用于“显示哪些卡片”，`polId+clientId` 查询用于“默认勾选哪些卡片”；两者不可混用。若仅按 `checked` 控制展示，会把“未默认勾选”误判成“未配置服务”。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-06-07 | `Style` | 服务项目 Chevron 节点尺寸紧凑化（40px 高、12px 字号），单节点最大宽度 140px。 | 对齐工作台 `workbench-business-table` Chevron 规格。 |
| 2026-06-07 | `Feature` | 服务流水线三态展示，节点勾选改弹窗维护（新建页无取消完成接口）。 | 与编辑页共用 `form.vue`。 |
| 2026-06-07 | `Style` | 服务项目 UI 改为 Chevron 箭头流水线（三态配色 + 悬浮 Tooltip）。 | 与编辑页共用 `form.vue`；`clip-path` 箭头衔接，Tooltip 避免 `overflow-hidden` 裁切。 |
| 2026-06-07 | `Refactor` | 服务流水线改为 `ServiceTypeNode` 枚举驱动，与执行方五字段完全解耦；删除代收支与 `organizationUnits` 提交。 | 新建/编辑共用 `form.vue`；节点来自 POL 配置 + `ServiceType` displayName，提交 `serviceTypes` 由勾选节点 value 集合生成。 |
| 2026-06-07 | `Refactor` | 服务项目枚举值与节点文案不再使用前端硬编码 `0~5`，统一在运行时从 `getEnumItems('ServiceType')` 读取并映射。 | 新建页与编辑页共用 `form.vue`，服务项勾选、提交 `serviceTypes` 与节点名称均收敛到同一枚举源，降低枚举中心变更带来的前端漂移风险。 |
| 2026-05-30 | `Fix` | 服务项目空态改为紧凑一行提示；未选/清空起运港时不渲染服务节点并提示先选起运港；可见服务项与顺序完全由起运港配置回显。 | 初始可见态改为全隐藏，`getServiceItemVisible` 仅 `=== true` 时展示。 |
| 2026-05-30 | `Fix` | 起运港已选但未配置任何服务项时，服务项目区域展示空态提示，不再渲染空白。 | 新增 `polHasNoServiceConfig` 与联动 loading 态，仅在 `GetServiceTypesByPOLAsync` 成功返回且可见卡片为空时提示。 |
| 2026-05-30 | `Refactor` | 服务项类型值映射改为复用统一常量 `SERVICE_TYPE_VALUE`，与工作台/港口服务项配置/客户排除服务项保持同源。 | `form.vue` 继续承载“服务项值 -> 业务字段”映射语义，枚举数值来源收敛到 `service-type.ts`，降低 0~5 硬编码漂移风险。 |
| 2026-05-29 | `Fix` | 服务项目联动改为双查询语义：`polId` 决定可见卡片，`polId+clientId` 决定默认勾选；起运港未配置卡片隐藏。 | `form.vue` 新增可见态集合并动态渲染卡片列表，避免把默认勾选逻辑误用于可见范围。 |
| 2026-05-27 | `Fix` | 修复右侧干系人 `UserSelect` 选中人员后先闪数字 ID 再显示名称：`:key` 改为仅 `row._rowKey`，避免选中/异步回显时组件重建。 | 动态 `key` 含 `userId` 与显示名会在 `loadOrderUserDetail` 前后各触发一次 remount；Remote Select 无 options 时只能回显 value。 |
| 2026-05-27 | `Feature` | 干系人固定角色新增「海外客服」，与港口服务项配置用户属性口径一致；海外客服人员非必填。 | 复用 `UserAttribute.OverseasCustomerService`；选项来自 `getSeaExportOrderUserRoleOptions()`。 |
| 2026-05-25 | `Fix` | 修复委托单位已选仍提示「请选择委托单位」：服务项目联动改为 `onChange`，避免 `onUpdate:modelValue` 覆盖表单 `clientId`。 | `ClientSelect` 经 Vben Form 绑定 `value`；联动勿抢占 `update:modelValue`。 |
| 2026-05-25 | `Feature` | 委托单位与起运港联动 `GetServiceTypesByPOLAsync`：按 `checked` 自动勾选服务项（含代收支 `5`）；请求合并与 `queryKey` 去重。 | 联动状态独立于多表单实例，通过 `linkedClientId`/`linkedPolId` 与 `queueSyncServiceTypesByPol` 汇总；响应兼容 ABP `result` 数组包装。 |
| 2026-05-17 | `Fix` | 修复干系人补录场景：新增角色后角色下拉保持可用，仅禁用重复角色选项，支持在缺失角色中手动选择。 | 无 |
| 2026-05-17 | `Fix` | 海运出口干系人固定角色（销售/商务/操作/客服/单证）改为不可删除、不可重复添加；销售与操作新增必填人员校验。 | 无 |
| 2026-05-17 | `Fix` | 海运出口表单与相关接口 DTO 新增 `atd`（实际开船）字段，并按“开船日期（etd）→ 实际开船（atd）→ 预抵日期（eta）”顺序展示与提交。 | 无 |
| 2026-05-17 | `Fix` | 海运出口新建页“品名”由弹窗维护改为可搜索多选下拉，并统一展示为“品名-海关代码”；输入区宽度按内容自适应扩展，同时保留 `orderCodeGoodss` 提交结构。 | 无 |
| 2026-05-16 | `Parsing` | 无 | 结合 `form.vue`、`data.ts` 与 `SeaExportAddDto` 补全新建页多表单分区、服务项目、港口备注联动、AI PDF 识别、DTO 双层映射和创建后跳转逻辑。 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/sea-exports/create` 对应组件 `src/views/sea-export-admin/form.vue`，权限口径为 未在路由中声明独立权限。 |
