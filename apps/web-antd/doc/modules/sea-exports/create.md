---
title: 海运出口新建
module: 海运出口
author: auto-doc-sync
last_updated: 2026-05-16
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
- **提交创建：** 保存时并行校验多个表单分区，构造 `SeaExportAddDto`，调用 `/services/app/SeaExportAdmin/AddAsync`。
- **创建后跳转：** 新增成功后优先解析接口返回的记录 ID 并跳转 `/sea-exports/{id}/edit`；若返回值无法解析，则回到 `/sea-exports` 列表。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **委托单位** | 委托客户，是运输单必填主体。 | 客户表中客户属性是【委托单位】的客户 | **触发/依赖：** 选择委托单位后，自动带出干系人 | 必填 |
| **委托编号** | 业务委托号，需要配置编号生成规则 | 自动生成 |  | 前端禁用，不手工录入。 |
| **会计期间** | 财务期间 | `transportOrder.accountDate`、`transportOrder.settlementDate` | **触发/依赖：** 新建、编辑后，后端根据 开船日期 的时间精度到月，没有开船日期，则使用当前时间，精度到月。 | 禁止手动修改。 |
| **应结日期** | 结算日期。 | `transportOrder.accountDate`、`transportOrder.settlementDate` | **触发/依赖：** 新建态由后端/业务规则生成；更改单也依赖会计期间。 | 前端禁用。 |
| **业务来源 / 运费条款 / 服务代码 / 贸易条款** | 委托业务属性。 | `CodeSourceSelect`、`CodeFrtSelect`、`CodeServiceSelect`、贸易条款枚举 | **触发/依赖：** 写入 `transportOrder`，影响列表展示和后续业务判断。 | 选择项需来自有效基础资料或枚举。 |
| **装运方式** | 整柜、拼箱分票、拼箱主票。 | `blType` 枚举 `0/1/2` | **触发/依赖：** 默认整柜；影响箱型、分单和提单业务理解。 | 需选择枚举值。 |
| **订单类型** | 直单或分单。 | `billType` 枚举 `0/1` | **触发/依赖：** 默认直单；分单场景会继续使用编辑工作台的分单模块。 | 需选择枚举值。 |
| **提单/副本份数** | 正本和副本份数。 | `BillCountsInput` -> `noBillEnum`、`copyNoBillEnum` | **触发/依赖：** 一个组件同时维护两个字段。 | 选项为 One 到 Ten。 |
| **签单方式** | 签单业务分类。 | `CodeIssueTypeSelect` -> `codeIssueTypeId`，兼容旧字段 `issueType` | **触发/依赖：** DTO 同时保留新版和旧版字段兼容。 | 需选择有效代码资料。 |
| **船名航次** | 船名和内航次。 | `VesselVoyageInput` -> `vessel`、`innerVoyno` | **触发/依赖：** 一个组合输入维护两个字段。 | 文本可为空，格式以后端为准。 |
| **服务项目** | 订舱、拖车、报关、仓库、保险等是否启用及对应服务商。 | 服务项卡片、客户选择组件；`serviceTypes` 枚举 `0-4` | **触发/依赖：** 勾选后允许选择服务主体；取消勾选会清空主体值。 | 只提交已启用的服务类型。 |
| **相关方** | 发货人、收货人、通知人、第二通知人、目的港代理及文本内容。 | 客户选择组件，行业类别分别为 `b/e/h/s` 等 | **触发/依赖：** 文本内容可作为名称资料补充；支持复制收货人到通知人。 | 需选择有效客户或填写内容，具体以后端校验为准。 |
| **订单人员** | 销售、商务、操作、客服、单证等角色用户。 | `UserSelect`、`UserAttribute` 枚举 -> `transportOrder.orderUsers` | **触发/依赖：** 提交前按 `sortId` 排序并清洗无效行；当前用户可自动进入部分角色。 | 销售角色最多一行；无用户 ID 的行不提交。 |
| **港口链路** | 收货地、起运港、中转港 1/2、目的港、交货地。 | `PortSelect` -> `receivePortId/polId/poT1Id/poT2Id/podId/deliverPortId` | **触发/依赖：** 选择港口后自动写入对应备注字段。 | 港口需来自港口基础资料。 |
| **船期时间** | 货好、开船、到港、截 VGM、截单、截舱单、签单时间。 | 日期组件 -> `goodsCompleteTime/etd/eta/closeVgmTime/closeDocTime/closeManifestTime/signingTime` | **触发/依赖：** 提交时统一转 ISO 字符串。 | 日期组件控制格式；可为空。 |
| **货物与箱型箱量** | 品名、唛头、件数、包装、毛重、体积和箱明细。 | `OrderGoodsButton`、`OrderCtnTable`、包装/货物/箱型基础资料 | **触发/依赖：** 提交时移除 `_rowKey` 等前端字段，只保留 API 字段。 | 数量类字段限制最小值和精度；箱明细至少需有有效箱型才有业务意义。 |
| **收付款部门** | 委托归属的组织单位。 | `getOrganizationUnitTree` -> `organizationUnits` | **触发/依赖：** 勾选代收支/收付款部门后提交组织数组。 | 需选择组织树中的有效节点。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：一个页面拆成多个表单实例]** 保存时会同时校验相关方、委托、基础、船期、港口、货物类型、货物主信息、备注等多个 `useVbenForm` 实例。新增字段时必须接入对应分区的 `getValues()` 合并逻辑和 `buildDto()` 映射，否则界面能填但不会提交。
>
> **[卡点 2：新建 DTO 是双层结构]** `SeaExportAddDto` 承载海出专属字段，`transportOrder` 承载运输单公共字段。客户、相关方、件毛体、订单人员、箱型箱量等不在海出根字段上，错误放层级会导致后端收不到值。
>
> **[卡点 3：前端临时字段必须清洗]** 箱型箱量行使用 `_rowKey` 支撑表格渲染，订单人员行带 `userName` 等展示字段；提交时必须经过 `sanitizeOrderCtns`、`sanitizeOrderUsers` 清洗。
>
> **[卡点 4：新增成功跳转依赖后端返回 ID]** 前端兼容 `createdId.id`、`createdId.result` 和直接返回值三种形式。若接口不返回可解析 ID，页面只能回列表，无法自动进入编辑工作台。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-05-16 | `Parsing` | 无 | 结合 `form.vue`、`data.ts` 与 `SeaExportAddDto` 补全新建页多表单分区、服务项目、港口备注联动、AI PDF 识别、DTO 双层映射和创建后跳转逻辑。 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/sea-exports/create` 对应组件 `src/views/sea-export-admin/form.vue`，权限口径为 未在路由中声明独立权限。 |
