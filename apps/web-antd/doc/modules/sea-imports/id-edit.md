---
title: 海运进口编辑工作台
module: 海运进口
author: auto-doc-sync
last_updated: 2026-08-08
---

# 1. 业务背景说明 (Background)

**白话解释：** 编辑页是海运进口的核心业务容器，聚合基础信息、费用、更改单与附件；基础信息 Tab 版式对齐海运出口。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/sea-imports/:id/edit` |
| 路由名称 | `SeaImportEdit` |
| 页面组件 | `src/views/sea-import-admin/editor.vue` |
| 权限口径 | `Admin.SeaImport` |
| 关键源码 | `src/router/routes/modules/operation-management.ts`<br/>`src/views/sea-import-admin/editor.vue`<br/>`src/views/sea-import-admin/basic-info-form/form.vue`<br/>`src/views/sea-import-admin/orderFee/`<br/>`src/views/sea-import-admin/changeOrder/`<br/>`src/views/sea-import-admin/attachments/` |

# 2. 功能与操作说明 (Features & Operations)

- **基础信息维护：** `KeepAlive` 嵌入 `basic-info-form/form.vue`，布局与新建页相同。
- **保存后跨 Tab 联动：** 编辑保存成功后 `loadEditData` 返回最新 `SeaImportDto`，经 `form` → `saved` → `editor.savedDetail` 以 `:latest-detail` 下发给费用/更改单；子 Tab `watch` 后整体替换本地详情与订单摘要，避免 KeepAlive 残留旧数据。
- **费用 Tab：** 应收/应付费用；Tab 标签费用数量由 editor 直接查分页 `totalCount` 汇总。
- **更改单 / 附件：** 进口侧子模块；左侧概要字段按进口 DTO（承运人 `cnShortName`、港口 `portName` 等）。
- **委托编号：** 编辑态可一键重新生成。
- **复制：** 保存下拉支持复制整单（可选复制费用）。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作  | 目标状态 | 状态说明                           |
| :------- | :----------- | :------- | :--------------------------------- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **委托 ID** | 编辑页上下文主键。 | 路由动态段 `:id` | **触发/依赖：** 用于加载详情、费用、更改单等子资源。 | 必须是有效 GUID。 |
| **干系人（订单人员）** | 运输单协同角色分工。 | `transportOrder.orderUsers` / `src/views/sea-import-admin/form.vue` | **触发/依赖：** 固定角色行不可删除、角色不可重复，新增仅补齐缺失角色。 | 销售必须且仅一人；销售与操作必须选择人员。 |
| **订单费用** | 应收应付费用行。 | `src/views/sea-import-admin/orderFee/data.ts` / `order-fee-admin.ts` | **触发/依赖：** 提交后进入费用审核，锁费后编辑受限。 | 金额、币种、费目等校验以后端为准。 |
| **更改单** | 业务变更记录。 | `src/views/sea-import-admin/changeOrder/` / `change-order-admin.ts` | **触发/依赖：** 可能触发费用变化或审核链路。 | 需保持与原委托上下文一致。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：海运进口编辑工作台一致性]** 编辑工作台跨多个子模块，最关键的卡点是锁费、业务锁定、审核中费用和子模块上下文一致性。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-08-09 | `Refactor` | 费用 Tab 的费用代码/币别/结算对象列改读嵌套对象（与海出同构）。 | `SeaImportOrderFeeAdminApi.OrderFeeDto` 对象化；列定义、`formatter`、`dataIndex`、币别聚合、Handsontable 的 `__settlementName` 缓存键与海出保持一致。详见 `changelogs/change-log-2026-08-09-order-fee-statement-foreign-key-objectification.md`。 |
| 2026-08-08 | `Fix` | 基础信息/列表/更改单/复制文案去掉订舱编号展示（进口无此字段）。 | UI 移除 `bookingNum`；DTO/提交仍保留兼容。详见 `changelogs/change-log-2026-08-08-sea-import-remove-booking-num.md`。 |
| 2026-08-08 | `Fix` | 基础信息保存成功后，费用/更改单 Tab 用最新详情整体替换订单摘要与信息卡片。 | 与海出同构：`onSaved`/`emit('saved')`/`savedDetail`/`latest-detail`。详见 `changelogs/change-log-2026-08-08-edit-workspace-saved-detail-sync.md`。 |
| 2026-08-04 | `Feat` | 编辑工作台基础信息对齐出口版式；新增附件 Tab；费用数量由 editor 直查；概要字段改用进口 DTO 正确属性名。 | 基础信息组件为 `basic-info-form/form.vue`（`SeaImportAdminForm`），不再使用根目录 `form.vue`。 |
| 2026-07-25 | `Perf` | 箱型选择从 option 取名称，选中时不再请求箱型详情 | 与海出同构的 `order-ctn-table`；`@change` 写 `ctnCodeName`，`syncCtnNameMap` 仅兜底回显 |
| 2026-06-07 | `Refactor` | 编辑态服务项目值映射改为运行时读取 `ServiceType` 枚举，不再使用本地固定值常量。 | 详情回填与保存提交共用同一枚举映射，避免海运进口与海运出口在服务项值上出现偏差。 |
| 2026-05-17 | `Fix` | 修复干系人补录场景：新增角色后角色下拉保持可用，仅禁用重复角色选项，支持在缺失角色中手动选择。 | 无 |
| 2026-05-17 | `Fix` | 干系人固定角色（销售/商务/操作/客服/单证）改为不可删除、不可重复添加；提交前新增“销售与操作必须选择人员”校验。 | 无 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/sea-imports/:id/edit` 对应组件 `src/views/sea-import-admin/editor.vue`，权限口径为 未在路由中声明独立权限。 |
