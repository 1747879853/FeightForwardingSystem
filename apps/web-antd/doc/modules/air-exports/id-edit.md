---
title: 空运出口编辑
module: 空运出口
author: auto-doc-sync
last_updated: 2026-08-08
---

# 1. 业务背景说明 (Background)

**白话解释：** 打开一票已存在的空运出口委托，在基础信息、费用总览、附件、运踪信息四个标签之间切换维护。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/air-exports/:id/edit` |
| 路由名称 | `AirExportEdit` |
| 页面组件 | `src/views/air-export-admin/editor.vue` |
| 权限口径 | `Admin.AirExport`（编辑 `Admin.AirExport.Edit`）；运踪订阅 `Admin.ExternalApi.Use`、查看运踪 `Admin.ExternalApi.Get` |
| 关键源码 | `src/views/air-export-admin/editor.vue`<br/>`src/views/air-export-admin/basic-info-form/form.vue`<br/>`src/views/air-export-admin/orderFee/index.vue`<br/>`src/views/air-export-admin/attachments/index.vue`<br/>`src/views/air-export-admin/modules/yundang-air-tracking-panel.vue`<br/>`src/api/yundang/yundang-air-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **标签容器：** 基础信息 / 应收应付（只读）/ 附件 / 运踪信息四个标签，按委托 ID 记忆上次停留的标签。
- **基础信息：** 与新建同一组件，回显由详情接口一次性带回，各下拉的 `selectedItems` 直接由详情对象构造，避免逐个再调详情接口。
- **运踪订阅：** 基础信息工具栏「运踪订阅/重新订阅」（仅编辑态 + `Admin.ExternalApi.Use`）；已成功订阅禁用；失败可重订；订阅后重新加载详情刷新状态。订阅读库内数据，与表单未保存输入可能不一致。
- **重新生成委托编号：** 按最新编号规则重新生成，**原编号不可恢复**，操作前二次确认。
- **复制本票：** 保存按钮下拉菜单里提供，先检查未保存修改。
- **应收应付：** 只读展示该票全部费用（含改单费用），按收/付两段分组，合计按币别分别汇总；增删改在业务费用模块进行。基础信息保存成功后，编辑工作台把最新详情经 `:latest-detail` 下发，费用列表与 Tab「收 - 付」徽标一并刷新，不再重复拉详情。
- **运踪信息：** Tab 内嵌运踪面板；四态（未订阅/订阅失败/等待推送/有动态）；有动态时展示运单摘要 + 里程碑/航段/状态轨迹；等待推送时 30s 轮询最多 20 次。
- **附件：** 按附件类型分组上传、预览、下载、删除，支持客户可见性开关。
- **未保存拦截：** 停留在任意标签离开路由时，都按基础信息表单的脏状态二次确认。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| 编辑中 | 用户保存 | 重新加载详情 | 保存后原地刷新；`loadEditData` 返回最新 DTO 并 `emit('saved')`，联动只读费用列表与收付徽标。 |
| 编辑中 | 用户点运踪订阅 | 订阅成功/失败 | 走批量订阅接口（单票）；成功后禁用按钮；失败可「重新订阅」。 |
| 编辑中 | 用户重新生成委托编号 | 新编号 | 单独接口，不随表单保存。 |
| 编辑中 | 用户离开路由 | 二次确认 | 脏检查基于 DTO 快照比对，空值归一后再对比。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **录入方式** | 手动录入 / 业务联系单导入 / 复制。 | `transportOrder.inputType` | **触发/依赖：** 复制来的票显示「复制」标签。 | 只读。 |
| **会计期间 / 应结日期** | 由后端按起飞日期与账期规则算出。 | `transportOrder.accountDate` / `settlementDate` | **触发/依赖：** 随起飞日期变化，保存后回显。 | 只读。 |
| **业务锁定** | 是否锁定业务信息。 | `transportOrder.isBusinessLocking` | **触发/依赖：** 无 schema 字段，用独立状态承载并随保存回传。 | 可编辑。 |
| **费用列表** | 该票全部费用。 | `transportOrder.orderFees`（详情接口） | **触发/依赖：** 标签上的「收 - 付」条数由它算出。 | 只读。 |
| **运踪订阅状态** | 是否已订阅、是否成功。 | `isYundangSubscribed` / `isYundangSubscribeSuccess` | **触发/依赖：** 成功则禁用订阅按钮；失败显示「重新订阅」。 | 只读；订阅读库内数据。 |
| **运踪面板** | 订阅记录 + 运单动态。 | `GetAirPushInfoAsync` | **触发/依赖：** `waiting_push` 时自动轮询。 | 查看权限 `Admin.ExternalApi.Get`。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：编辑必须整表提交子表]** 货物明细、商品、干系人做全量比对，库里存在而本次未提交的行会被删除。

> [!IMPORTANT] **[卡点 2：复制出来的票可能立刻编辑不了]** 复制不校验组织归属，源票组织若不是新销售的直属组织，一保存就报「所选组织不在数据所属人(本人)所属组织范围内。」

> [!IMPORTANT] **[卡点 3：删除前必须先清空费用]** 有费用的票删除会被后端拒绝，列表页已提前拦截。

> [!IMPORTANT] **[卡点 4：字段级权限是「字段不出现」]** 无权限时字段整个不返回，前端读取必须容忍字段缺失，而不是按空值判断。

> [!IMPORTANT] **[卡点 5：运踪订阅读库不读表单草稿]** 未保存的主运单号/航段变更不会进入当次订阅；用户可见层不出现服务商名称。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- | --- | --- |
| 2026-08-09 | `Refactor` | 只读费用列表的费用名称/币别/结算对象列改读嵌套对象。 | `AirExportAdminApi.OrderFeeDto` 对象化；`dataIndex` 改数组路径，`sumByCurrency` 取 `item.currency?.cnName?.trim() |  | item.currency?.code?.trim()`。详见 `changelogs/change-log-2026-08-09-order-fee-statement-foreign-key-objectification.md`。 |
| 2026-08-08 | `Feature` | 基础信息工具栏运踪订阅/重新订阅；新增「运踪信息」Tab（里程碑/航段/状态轨迹）。 | 标签从三个扩为四个；面板复用 `GetAirPushInfoAsync`；详见 `changelogs/change-log-2026-08-08-air-export-yundang-subscribe.md`。 |
| 2026-08-08 | `Fix` | 基础信息保存成功后，只读费用列表与 Tab「收 - 付」徽标用最新详情刷新。 | `onSaved`/`savedDetail`/`latest-detail`；徽标复用详情 `orderFees`，避免再调详情接口。详见 `changelogs/change-log-2026-08-08-edit-workspace-saved-detail-sync.md`。 |
| 2026-08-05 | `Feature` | 新建空运出口编辑页：三标签容器、重新生成委托编号、复制、只读费用总览与附件维护。 | 本期不做更改单，标签只有三个；只读费用直接复用详情接口返回的 `orderFees`，不再单独调费用模块接口，标签计数也由它算出。 |
