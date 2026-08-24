---
title: 空运出口编辑
module: 空运出口
author: auto-doc-sync
last_updated: 2026-08-24
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
- **基础信息：** 与新建同一组件，回显由详情接口一次性带回，各下拉的 `selectedItems` 直接由详情对象构造，避免逐个再调详情接口。收发通为灰色折叠条，点击展开/收起，**默认展开**；折叠用 `v-show`，不销毁表单。货物区从左到右为唛头货描、件重尺（件数与包装合并为一行）、内外部备注（顶部 Tab 切换，多行 textarea 撑满卡片）。航班与订舱代理在「航段信息」标题右侧，订舱代理回显写 header 表单。顶栏支持 AI 识别预填（与新建同一套 `form.vue`）。
- **打印：** 顶栏「打印」调用全局 `usePrintFormat().openPrint`（`PrintJsonType=5000` 空运出口详情，`detailInput={id}`，`bizType=2`，按当票 `orgId` 筛模板）。后端 `GetPrintAsync` 自动取数并带公司打印信息。新增模式禁止打印；有未保存修改仅提示「使用已保存数据」。空运无签单方式/船公司，不按这两项筛模板。应收应付费用表打印用 `1000`/`1500`，拉模板同样传 `bizType=2`。
- **运踪订阅：** 基础信息工具栏「运踪订阅/重新订阅」（仅编辑态 + `Admin.ExternalApi.Use`）；已成功订阅禁用；失败可重订；订阅后重新加载详情刷新状态。订阅读库内数据，与表单未保存输入可能不一致。
- **重新生成委托编号：** 按最新编号规则重新生成，**原编号不可恢复**，操作前二次确认。
- **复制本票：** 保存按钮下拉菜单里提供，先检查未保存修改。
- **应收应付：** 只读展示该票全部费用（含改单费用），按收/付两段分组，合计按币别分别汇总；增删改在业务费用模块进行。基础信息保存成功后，编辑工作台把最新详情经 `:latest-detail` 下发，费用列表与 Tab「收 - 付」徽标一并刷新，不再重复拉详情。
- **运踪信息：** Tab 内嵌运踪面板；四态（未订阅/订阅失败/等待推送/有动态）；有动态时展示运单摘要 + 里程碑/航段/状态轨迹；等待推送时 30s 轮询最多 20 次。
- **附件：** 按附件类型分组上传、预览、下载、删除，支持客户可见性开关。
- **未保存拦截：** 离开路由时基础信息或应收应付任一未落库都二次确认；确认切走后整页 KeepAlive，点 X 才销毁。缓存页的委托 id 用 `useKeepAliveRouteParamId`：本页可见才跟地址栏，藏起来后冻结，避免跟海进/海出等同名 `:id` 页抢详情。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| 编辑中 | 用户保存 | 重新加载详情 | 保存后原地刷新；`loadEditData` 返回最新 DTO 并 `emit('saved')`，联动只读费用列表与收付徽标。 |
| 编辑中 | 用户点运踪订阅 | 订阅成功/失败 | 走批量订阅接口（单票）；成功后禁用按钮；失败可「重新订阅」。 |
| 编辑中 | 用户重新生成委托编号 | 新编号 | 单独接口，不随表单保存。 |
| 编辑中 | 用户离开路由 | 二次确认 | 脏检查基于 DTO 快照比对，空值归一后再对比。 |
| 编辑中 | 用户点打印 | 打开打印弹窗 | 未保存修改先确认；取数按已保存 id，不读表单草稿。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **业务来源** | 订单业务来源分类；头部可下拉，与新建页同一套 `form.vue`。 | `transportOrder.codeSourceId` / `codeSource`；`CodeSourceSelect` | **触发/依赖：** 详情回填 `selectedItems`；头部选择写回隐藏字段；**不**随委托单位自动带出。 | 可选，允许清空后再保存。 |
| **录入方式** | 手动录入 / 业务联系单导入 / 复制。 | `transportOrder.inputType` | **触发/依赖：** 复制来的票显示「复制」标签。 | 只读。 |
| **会计期间 / 应结日期** | 由后端按起飞日期与账期规则算出。 | `transportOrder.accountDate` / `settlementDate` | **触发/依赖：** 随起飞日期变化，保存后回显。 | 只读。 |
| **内部备注 / 外部备注** | 货物区右侧同一卡片，顶部 Tab 切换；内部仅内部可见；多行 textarea 撑满卡片高度；文本框字号 14px，与件数等输入框一致。 | `transportOrder.internalRemark` / `transportOrder.remark` | **触发/依赖：** 两字段同时挂在 `CargoRemarkForm`，用 CSS 隐藏非当前 Tab。 | 可选，最长 1024。 |
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

> [!IMPORTANT] **[卡点 6：能看 ≠ 能改]** 详情能打开只说明有查询权限。保存、重新生成委托编号看 `Admin.AirExport.Edit` ∧ `detail.isEditable`；缺字段按 false。附件增删不看 `isEditable`。业务锁定开关在只读态一并禁用。打印不看 `isEditable`，只读票也可打。

> [!IMPORTANT] **[卡点 7：单据打印依赖空运详情模板]** 模板必须绑 `PrintJsonType=5000`；没有匹配模板时提示「暂无可用打印模板」。打印读库不读表单草稿。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- | --- | --- |
| 2026-08-24 | `Fix` | 货物区「内部备注 / 外部备注」字号改为 14px，与件数等输入框一致。 | TAPD `#1161580498001000872`。详见 `changelogs/change-log-2026-08-24-cargo-remark-font-size.md`。 |
| 2026-08-23 | `Fix` | KeepAlive 缓存的空出编辑页不再跟着别人地址栏的 `:id` 拉详情。 | 与海进/海出共用 `useKeepAliveRouteParamId`。详见 `changelogs/change-log-2026-08-23-keepalive-route-id-freeze.md`。 |
| 2026-08-23 | `Feature` | 编辑页 KeepAlive；未保存含应收应付；点 X 才销毁。 | 见 `changelogs/change-log-2026-08-23-detail-keep-alive-unsaved.md`。 |
| 2026-08-23 | `Feature` | 费用打印拉模板列表传入 `bizType=2`。 | 与单据打印同一筛选口径。详见 `changelogs/change-log-2026-08-23-order-fee-print-biztype.md`。 |
| 2026-08-23 | `Feature` | 基础信息顶栏增加单据打印：选模板后预览/导出 PDF、Excel、Word。 | 走 `PrintFormatAdmin/GetPrintAsync` + `AirExportDetail=5000`；模板列表传 `bizType=2` 与当票 `orgId`。详见 `changelogs/change-log-2026-08-23-air-export-print.md`。 |
| 2026-08-19 | `Feature` | 详情保存、只读、重新生成委托编号对接票根 `isEditable`。 | 见 `changelogs/change-log-2026-08-19-ticket-is-editable.md`。 |
| 2026-08-19 | `Feature` | 干系人下拉改为全量用户缓存；未选归属组织时看当前用户各公司，选了组织后看该销售组织所属公司。客户默认干系人仍带回且显示昵称。 | 与新建页共用 `form.vue`。详见 `changelogs/change-log-2026-08-19-user-select-full-cache-company-filter.md`。 |
| 2026-08-18 | `Feature` | 基础信息工具栏增加 AI 识别：上传单证后预填表单。 | 与新建共用 `form.vue`。详见 `changelogs/change-log-2026-08-18-air-export-textin-ai-extract.md`。 |
| 2026-08-17 | `Fix` | 选中空港后输入框只回显三字码，备注回填英文名称。 | 与新建共用 `form.vue`。详见 `changelogs/change-log-2026-08-17-air-export-airport-code-remark.md`。 |
| 2026-08-16 | `Feature` | 货物区内外部备注由单行改为多行 textarea，撑满备注卡片高度。 | `CargoRemarkForm` 组件改为 `Textarea`。详见 `changelogs/change-log-2026-08-16-air-export-sea-import-remark-textarea.md`。 |
| 2026-08-16 | `Feature` | 件数与包装合并为一行，交互对齐海运进口。 | `PkgsPackageInput`；`codePackageId` 隐藏落库。详见 `changelogs/change-log-2026-08-16-air-export-pkgs-package-row.md`。 |
| 2026-08-16 | `Feature` | 收发通改为灰色折叠条（默认展开）；内部/外部备注挪到货物区件重尺右侧，顶部 Tab 切换，样式对齐海运进口。 | 折叠与 Tab 均用 `v-show` / CSS 隐藏，勿 `v-if`。详见 `changelogs/change-log-2026-08-16-air-export-party-collapse-remark-tabs.md`。 |
| 2026-08-16 | `Refactor` | 航班与订舱代理从航段流程条下方挪到「航段信息」标题右侧。 | 见 `changelogs/change-log-2026-08-16-air-export-leg-header-fields.md`。 |
| 2026-08-16 | `Refactor` | 「运踪信息」Tab 的异常预警明细改为弹窗查看，且仅在有预警时才出现「异常预警(N)」按钮，不再常驻底部空表。 | 详见 `changelogs/change-log-2026-08-16-tracking-warning-modal.md`。 |
| 2026-08-16 | `Fix` | 轨迹节点时间轴不再显示已作废的预计记录（`DEP` 预计不再排在实际离港前面、`ARR(AIS)` 推算到达不再与实际到达并列）。 | 同事件已有实际、或预计已被最新实际进度超越即丢弃；同类型多条实际（如两次 `MAN` 预配）保留。详见 `changelogs/change-log-2026-08-16-tracking-timeline.md`。 |
| 2026-08-16 | `Feature` | 「运踪信息」Tab 新增「轨迹节点」时间轴：合并单证/运输/货物动态/装卸货地五类事件，区分实际、预计与当前节点；顶栏状态标签改为「进行中 / 已完成」。 | 事件取详情已下发的 `feituoTrackingDetail`（本次由 `Record<string, unknown>` 换成 `AirDataDto` 强类型），共享 `timeline-nodes.ts` + `tracking-timeline.vue`，无新增请求。详见 `changelogs/change-log-2026-08-16-tracking-timeline.md`。 |
| 2026-08-16 | `Fix` | 头部业务来源改为可下拉选择，编辑态也可再改或清空。 | 见 `changelogs/change-log-2026-08-16-sea-import-air-export-code-source-select.md`。 |
| 2026-08-16 | `Feature` | 「运踪信息」Tab 换成新服务商运踪面板：展示订阅状态、当前节点（预计节点带后缀）、起降与 ETA/ATA、全量异常预警明细，并支持「查看轨迹地图」与「重新订阅」；基础信息工具栏的单票订阅也切到新服务商。 | 新面板 `modules/air-tracking-panel.vue` 的数据全部来自空运出口详情下发的 `feituoTracking` / `feituoTrackingWarnings`，不轮询、不直接请求服务商；重新订阅走 `FeituoAdmin/ResubscribeAirWaybillAsync` 并二次确认（消耗配额）；轨迹地图由前端按 env 拼装，env 缺项时入口自动隐藏；后端文案统一经 `sanitizeVendorText` 清洗后展示。详见 `changelogs/change-log-2026-08-16-tracking-vendor-brand-split.md`。 |
| 2026-08-09 | `Refactor` | 只读费用列表的费用名称/币别/结算对象列改读嵌套对象。 | `AirExportAdminApi.OrderFeeDto` 对象化；`dataIndex` 改数组路径，`sumByCurrency` 取 `item.currency?.cnName?.trim() |  | item.currency?.code?.trim()`。详见 `changelogs/change-log-2026-08-09-order-fee-statement-foreign-key-objectification.md`。 |
| 2026-08-09 | `Refactor` | 「运踪信息」Tab 与工具栏订阅的接口地址迁移到合并后的云当服务，页面行为无变化。 | `GetAirPushInfoAsync` / `BatchSubscribeAirBillAsync` 前缀由 `YundangAirAdmin` 改为 `YundangAdmin`。详见 `changelogs/change-log-2026-08-09-feituo-yundang-appservice-merge-endpoints.md`。 |
| 2026-08-08 | `Feature` | 基础信息工具栏运踪订阅/重新订阅；新增「运踪信息」Tab（里程碑/航段/状态轨迹）。 | 标签从三个扩为四个；面板复用 `GetAirPushInfoAsync`；详见 `changelogs/change-log-2026-08-08-air-export-yundang-subscribe.md`。 |
| 2026-08-08 | `Fix` | 基础信息保存成功后，只读费用列表与 Tab「收 - 付」徽标用最新详情刷新。 | `onSaved`/`savedDetail`/`latest-detail`；徽标复用详情 `orderFees`，避免再调详情接口。详见 `changelogs/change-log-2026-08-08-edit-workspace-saved-detail-sync.md`。 |
| 2026-08-05 | `Feature` | 新建空运出口编辑页：三标签容器、重新生成委托编号、复制、只读费用总览与附件维护。 | 本期不做更改单，标签只有三个；只读费用直接复用详情接口返回的 `orderFees`，不再单独调费用模块接口，标签计数也由它算出。 |
