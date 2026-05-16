---
title: 海运出口列表
module: 海运出口
author: auto-doc-sync
last_updated: 2026-05-16
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

- **分页检索：** 表格通过 `getSeaExportPagedList` 调用 `/services/app/SeaExportAdmin/GetPagedListAsync`，固定传入 `PageIndex`、`PageSize`，并合并查询区条件。
- **日期区间规范化：** 查询区的 `ETDRange` 会拆成 `ETDStart` / `ETDEnd`，`CloseDocTimeRange` 会拆成 `CloseDocTimeStart` / `CloseDocTimeEnd`，提交前统一转换为 ISO 字符串。
- **单选行维护：** 列表第一列为 radio 单选，不设置行内操作列；编辑和删除都依赖当前选中行，未选中时提示“请选择一条”。
- **双击进入编辑：** 双击单元格会先设置当前行为选中态，再跳转 `/sea-exports/{id}/edit`。
- **新增委托：** 顶部主按钮跳转 `/sea-exports/create`，由新建页创建委托主记录。
- **删除委托：** 顶部删除按钮基于选中行弹出二次确认，确认后调用 `deleteSeaExport(row.id)`，成功后刷新列表。确认文案优先展示委托编号，其次主单号，最后回退为记录 ID。

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
| **起运港 / 目的港** | 航线节点筛选字段。 | `PortSelect` / `POLId`、`PODId` | **触发/依赖：** 与港口资料联动，列表展示 `polName`、`podName`。 | 需选择有效港口资料。 |
| **船名 / 航次** | 船期检索字段。 | `Vessel`、`InnerVoyno` | **触发/依赖：** 与编辑页船名航次输入保持同一字段口径。 | 文本可清空。 |
| **船公司 / 订舱代理** | 承运与订舱服务主体。 | `CarrierSelect`、客户选择组件 `industryCategory: 'o'` | **触发/依赖：** 列表展示承运人、订舱代理名称。 | 需选择有效基础资料或客户资料。 |
| **业务人员** | 销售、操作、商务、客服、单证等订单人员。 | `UserSelect` + `USER_ATTRIBUTE` 枚举 | **触发/依赖：** 列表列从 `transportOrder.orderUsers` 按角色过滤并拼接姓名。 | 需选择符合对应用户属性的用户。 |
| **所属组织** | 委托归属组织或收付款部门过滤条件。 | `OrganizationSelect` / `OrgId` | **触发/依赖：** 列表列展示 `companys[0].name`。 | 组织需来自系统组织树。 |
| **箱号** | 按箱号定位包含具体箱的委托。 | 查询参数 `CtnNo` | **触发/依赖：** 与订单箱型箱量明细相关。 | 文本可清空；匹配以后端为准。 |
| **货物类型 / 品名** | 货物维度检索字段。 | `CargoId`、`GoodsDes`；货物类型枚举 `普通/冷藏/危险品/超限` | **触发/依赖：** 与编辑页货物信息字段一致。 | 货物类型需选择枚举值。 |
| **来源 / 签单方式** | 业务来源与签单方式过滤条件。 | `CodeSourceSelect`、`CodeIssueTypeSelect` | **触发/依赖：** 列表展示 `codeSourceName`、`codeIssueTypeName`。 | 需选择有效代码资料。 |
| **装运方式 / 贸易条款 / 订单类型** | 业务属性筛选条件。 | 前端枚举：装运方式 `整柜/拼箱分票/拼箱主票`，订单类型 `直单/分单`，贸易条款 `CIF/FOB/EXW/FCA/DDP/DDU/DAP/C&F` | **触发/依赖：** 列表用 tag 展示装运方式和订单类型。 | 需选择枚举值。 |
| **费用锁定 / 业务锁定** | 控制订单费用或业务是否可继续变更。 | `transportOrder.feeLocked`、`transportOrder.isBusinessLocking` | **触发/依赖：** 列表可筛选，编辑页以锁定标签展示。 | 布尔值，是/否。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：列表字段跨 SeaExport 与 TransportOrder 两层 DTO]** 表格大量字段来自 `row.transportOrder.*`，例如委托编号、客户、件毛体、锁费状态；另一些字段来自海出主表，例如船公司、港口、船名航次。改列配置或接口 DTO 时要确认字段层级，否则会出现列表空值。
>
> **[卡点 2：日期区间不是原样提交]** `ETDRange` 和 `CloseDocTimeRange` 只存在于前端查询表单，接口实际接收的是拆分后的开始/结束字段。后端或接口联调时不能直接查找 `ETDRange` 参数。
>
> **[卡点 3：操作模式依赖单选行]** 本项目列表规范不使用操作列。编辑/删除必须先取 `getRadioRecord()`，双击行也会同步单选态；后续扩展批量操作时要避免破坏当前单选维护逻辑。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-05-16 | `Parsing` | 无 | 结合 `list.vue`、`data.ts` 与 `sea-export-admin.ts` 补全列表查询、日期区间拆参、单选行操作、删除确认和跨 DTO 字段来源说明。 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/sea-exports` 对应组件 `src/views/sea-export-admin/list.vue`，权限口径为 未在路由中声明独立权限。 |
