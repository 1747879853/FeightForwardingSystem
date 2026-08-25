---
title: 海运进口编辑工作台
module: 海运进口
author: auto-doc-sync
last_updated: 2026-08-25
---

# 1. 业务背景说明 (Background)

**白话解释：** 编辑页是海运进口的核心业务容器，聚合基础信息、费用、更改单、附件与运踪；基础信息 Tab 版式对齐海运出口。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/sea-imports/:id/edit` |
| 路由名称 | `SeaImportEdit` |
| 页面组件 | `src/views/sea-import-admin/editor.vue` |
| 权限口径 | `Admin.SeaImport`；运踪订阅 `Admin.ExternalApi.Use` |
| 关键源码 | `src/router/routes/modules/operation-management.ts`<br/>`src/views/sea-import-admin/editor.vue`<br/>`src/views/sea-import-admin/basic-info-form/form.vue`<br/>`src/views/sea-import-admin/orderFee/`<br/>`src/views/sea-import-admin/changeOrder/`<br/>`src/views/sea-import-admin/attachments/` |

# 2. 功能与操作说明 (Features & Operations)

- **未保存与整页缓存：** 离开时基础信息或应收应付任一未落库都二次确认；确认切走后整页 KeepAlive，点 X 才销毁。缓存页的委托 id 用 `useKeepAliveRouteParamId`：本页可见才跟地址栏，藏起来后冻结，避免跟海出等同名 `:id` 页抢详情。
- **基础信息维护：** `KeepAlive` 嵌入 `basic-info-form/form.vue`，布局与新建页相同。收发通（发货人/收货人/通知人）为灰色折叠条，点击展开/收起，**默认展开**；折叠用 `v-show`，不销毁表单。货物区从左到右为唛头货描、件数/包装件重尺、内外部备注（顶部 Tab 切换，多行 textarea 撑满卡片）；件数与包装合并为一个控件，交互对齐船名/航次。
- **AI 识别辅助：** 与新建页共用顶栏「AI识别」，对接 TextIn `ExtractSeaImportToAddDtoAsync`，结果覆盖回填（含进口层箱子与到港日期）。
- **码头船舶：** 编辑态在船名/航次字段右侧展示一个图标按钮，点击调 `FeituoAdmin/QueryTerminalScheduleAsync`（只传业务单 Id；**纯查询，不写库**）。有可引入数据则弹窗选择，确定引入后前端回填航次（`ivoyage` → `innerVoyno`）并走原有编辑保存；进口表单没有实际开船与截关类字段，这两类不填。无数据只提示。新建态不显示该按钮。**进口经常查不到属正常现象**：进口按起运港查，而起运港多为国外港口，码头船舶计划以国内港区为主。
- **保存后跨 Tab 联动：** 编辑保存成功后 `loadEditData` 返回最新 `SeaImportDto`，经 `form` → `saved` → `editor.savedDetail` 以 `:latest-detail` 下发给费用/更改单；子 Tab `watch` 后整体替换本地详情与订单摘要，避免 KeepAlive 残留旧数据。
- **费用 Tab：** 应收/应付费用；Tab 标签费用数量由 editor 直接查分页 `totalCount` 汇总。打印拉模板传 `bizType=1`（海运进口，结果含通用模板）。
- **更改单 / 附件：** 进口侧子模块；左侧概要字段按进口 DTO（承运人 `cnShortName`、港口 `portName` 等）。附件类型卡片支持把文件拖进去上传，空态为「点击或拖拽上传」。
- **委托编号：** 编辑态可一键重新生成（需 `Admin.SeaImport.Edit` **且** `detail.isEditable`）。
- **复制：** 保存下拉支持复制整单（可选复制费用）；`isEditable === false` 时保存禁用，复制仍可用。
- **运踪订阅：** 基础信息工具栏「运踪订阅 / 重新订阅」（仅编辑态 + `Admin.ExternalApi.Use`）；已成功订阅禁用；失败可重订；订阅后重新加载详情刷新状态。订阅读库内数据，与表单未保存输入可能不一致。与列表共用 `useContainerTrackingSubscribe`（`bizType=1`）。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |
| 编辑中 | 用户点运踪订阅 | 订阅成功/失败 | 走集装箱批量订阅接口（单票）；成功后禁用按钮；失败可「重新订阅」。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **委托 ID** | 编辑页上下文主键。 | 路由动态段 `:id` | **触发/依赖：** 用于加载详情、费用、更改单等子资源。 | 必须是有效 GUID。 |
| **业务来源** | 订单业务来源分类；头部可下拉，与新建页同一套 `form.vue`。 | `transportOrder.codeSourceId` / `codeSource`；`CodeSourceSelect` | **触发/依赖：** 详情回填 `selectedItems`；头部选择写回隐藏字段；**不**随委托单位自动带出。 | 可选，允许清空后再保存。 |
| **干系人（订单人员）** | 运输单协同角色分工。 | `transportOrder.orderUsers` / `basic-info-form/form.vue` | **触发/依赖：** 固定角色行不可删除、角色不可重复，新增仅补齐缺失角色。`UserSelect` 按当前用户各公司或所选销售组织所属公司过滤候选；已选/客户默认干系人 pin 昵称。 | 销售必须且仅一人；销售与操作必须选择人员。 |
| **订单费用** | 应收应付费用行。 | `src/views/sea-import-admin/orderFee/data.ts` / `order-fee-admin.ts` | **触发/依赖：** 提交后进入费用审核，锁费后编辑受限。 | 金额、币种、费目等校验以后端为准。 |
| **更改单** | 业务变更记录。 | `src/views/sea-import-admin/changeOrder/` / `change-order-admin.ts` | **触发/依赖：** 可能触发费用变化或审核链路。 | 需保持与原委托上下文一致。 |
| **内部备注 / 外部备注** | 货物区右侧同一卡片，顶部 Tab 切换；多行 textarea 撑满卡片高度；文本框字号 14px，与件数等输入框一致。 | `transportOrder.internalRemark` / `transportOrder.remark` | **触发/依赖：** 两字段同时挂在 `CargoRemarkForm`，用 CSS 隐藏非当前 Tab。 | 可选。 |
| **运踪订阅状态** | 是否已订阅、是否成功。 | `isFeituoSubscribed` / `isFeituoSubscribeSuccess` | **触发/依赖：** 成功则禁用订阅按钮；失败显示「重新订阅」。 | 只读；订阅读库内数据。 |
| **贸易方式** | 海运进口贸易方式。 | 枚举中心 `TradeMode`（`/system/enumeration`） | 后端只存整数。 | 不校验取值；未配置枚举时下拉为空。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：海运进口编辑工作台一致性]** 编辑工作台跨多个子模块，最关键的卡点是锁费、业务锁定、审核中费用和子模块上下文一致性。

> [!IMPORTANT] **[卡点 2：运踪订阅读库不读表单草稿]** 未保存的主提单号/箱号变更不会进入当次订阅；用户可见层不出现服务商名称。

> [!IMPORTANT] **[卡点 3：能看 ≠ 能改]** 详情能打开只说明有查询权限。保存、重新生成委托编号看 `Admin.SeaImport.Edit` ∧ `detail.isEditable`；缺字段按 false。附件增删不看 `isEditable`。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-08-25 | `Fix` | 基础信息：码头筛「码头」属性、转站+6、净重手填、贸易方式改走枚举中心 `TradeMode`；附件卡片支持拖拽上传。 | TAPD `#1161580498001000779`。详见 `changelogs/change-log-2026-08-25-sea-import-tapd-1000779.md`。 |
| 2026-08-24 | `Fix` | 货物区「内部备注 / 外部备注」字号改为 14px，与件数等输入框一致。 | TAPD `#1161580498001000872`。详见 `changelogs/change-log-2026-08-24-cargo-remark-font-size.md`。 |
| 2026-08-23 | `Fix` | KeepAlive 缓存的海进编辑页不再跟着别人地址栏的 `:id` 拉进口详情。 | `useKeepAliveRouteParamId`：可见才同步 `params.id`，停用后冻结。详见 `changelogs/change-log-2026-08-23-keepalive-route-id-freeze.md`。 |
| 2026-08-23 | `Feature` | 编辑页 KeepAlive；未保存含应收应付；点 X 才销毁。新建页补未保存守卫。 | 见 `changelogs/change-log-2026-08-23-detail-keep-alive-unsaved.md`。 |
| 2026-08-23 | `Feature` | 费用打印拉模板列表传入 `bizType=1`。 | 与海出/空出同一套费用打印，按业务类型筛模板。详见 `changelogs/change-log-2026-08-23-order-fee-print-biztype.md`。 |
| 2026-08-19 | `Feature` | 详情保存、只读、重新生成委托编号对接票根 `isEditable`。 | 见 `changelogs/change-log-2026-08-19-ticket-is-editable.md`。 |
| 2026-08-19 | `Feature` | 干系人下拉改为全量用户缓存；未选归属组织时看当前用户各公司，选了组织后看该销售组织所属公司。客户默认干系人仍带回且显示昵称。 | 与海出/空出共用 `UserSelect` 缓存层。详见 `changelogs/change-log-2026-08-19-user-select-full-cache-company-filter.md`。 |
| 2026-08-17 | `Feature` | 「码头船舶」改为查询接口：有可引入数据才弹窗，确定引入后回填航次并自动保存；无数据只提示。 | 与海出共用 `QueryTerminalScheduleAsync`；进口仅映射 `ivoyage` → `innerVoyno`。详见 `changelogs/change-log-2026-08-17-terminal-schedule-query-import.md`。 |
| 2026-08-16 | `Feature` | 货物区内外部备注由单行改为多行 textarea，撑满备注卡片高度。 | `CargoRemarkForm` 组件改为 `Textarea`。详见 `changelogs/change-log-2026-08-16-air-export-sea-import-remark-textarea.md`。 |
| 2026-08-16 | `Feature` | 内部/外部备注改为顶部 Tab 切换，并放到货物区件数/包装右侧一列；件数与包装合并为同一控件（对齐船名/航次）。 | 两备注字段仍同时挂在 `cargoRemarkFormApi`；件数/包装用 `PkgsPackageInput`，`codePackageId` 隐藏落库。详见 `changelogs/change-log-2026-08-16-sea-import-remark-tabs-pkgs-row.md`。 |
| 2026-08-16 | `Feature` | 收发通改为可折叠条（对齐业务联系单），默认展开。 | 折叠用 `v-show` 保留表单实例；新建/编辑共用 `form.vue`。详见 `changelogs/change-log-2026-08-16-sea-import-party-collapse.md`。 |
| 2026-08-16 | `Feature` | 基础信息工具栏补齐「运踪订阅 / 重新订阅」单票入口（仅编辑态 + `Admin.ExternalApi.Use`）。 | 复用列表同一套 `useContainerTrackingSubscribe`（`bizType=1`）；状态读详情 `isFeituoSubscribed` / `isFeituoSubscribeSuccess`；已成功订阅禁用，失败可重订。详见 `changelogs/change-log-2026-08-16-sea-import-edit-tracking-subscribe.md`。 |
| 2026-08-16 | `Refactor` | 运踪信息 Tab 的异常预警明细改为弹窗查看，且仅在有预警时才出现「异常预警(N)」按钮，不再常驻底部空表。 | 详见 `changelogs/change-log-2026-08-16-tracking-warning-modal.md`。 |
| 2026-08-16 | `Feat` | 多箱票的轨迹节点显示箱号，并可在「整票 / 按箱」间切换查看。 | 同名节点重复多为各箱进度差异或摘车后重新编组；按箱视图每箱一条时间轴。详见 `changelogs/change-log-2026-08-16-tracking-timeline.md`。 |
| 2026-08-16 | `Feat` | 运踪信息 Tab 新增「轨迹节点」时间轴：整票合并各箱节点，区分实际/预计/当前。 | 节点取运踪快照 `containers[].status[]`，共享 `timeline-nodes.ts` + `tracking-timeline.vue`，无新增请求。详见 `changelogs/change-log-2026-08-16-tracking-timeline.md`。 |
| 2026-08-16 | `Fix` | 运踪信息 Tab 顶栏状态标签由英文码改为「进行中 / 已完成」 | 映射逻辑在共享 `data-status.ts`，与海出/空出详情一致 |
| 2026-08-16 | `Fix` | 头部业务来源改为可下拉选择，编辑态也可再改或清空。 | 见 `changelogs/change-log-2026-08-16-sea-import-air-export-code-source-select.md`。 |
| 2026-08-16 | `Feat` | 新增「运踪信息」Tab（第 5 个标签）：展示订阅状态、当前节点、关键时间、订舱箱量、甩柜提示、集装箱清单与全量异常预警明细，并支持「查看轨迹地图」（可切中英文、复制免登录分享链接）与「刷新运踪」。 | 复用共享面板 `components/tracking/container-tracking-panel.vue`（`biz-type=1`、`load-detail` 模式：详情接口取摘要与全量预警，另读本地快照补箱清单与轨迹页链接），与海运出口编辑页、列表运踪弹窗同一套实现；Tab 记忆沿用 `sessionStorage` 白名单，已加入 `tracking`。详见 `changelogs/change-log-2026-08-16-tracking-vendor-brand-split.md`。 |
| 2026-08-16 | `Feat` | 船名/航次右侧新增「码头船舶」按钮（仅编辑态）：命中唯一一条直接回填 `ETD`/`ATD`/`InnerVoyno` 并刷新单据，多条时弹窗单选后再同步。 | 与海出共享 `src/components/terminal-schedule/`；`applied` 才刷新，`needSelect` 时后端一字未写。详见 `changelogs/change-log-2026-08-16-terminal-schedule-sync.md`。 |
| 2026-08-14 | `Feat` | 基础信息 Tab 接入 TextIn AI 识别（与新建共用）。 | 详见 `changelogs/change-log-2026-08-14-sea-import-textin-ai-extract.md`。 |
| 2026-08-14 | `Feat` | 编辑保存对齐最新接口：码头对象化、规格/型号 id、联运/分单/贸易方式；人员与商品子表回传行 id。 | 详见 `changelogs/change-log-2026-08-14-sea-import-api-doc-align.md`。 |
| 2026-08-09 | `Fix` | 费用表带汇率时应收/应付取反修复：应收取 `drValue`、应付取 `crValue`（与海出同一处渲染器）。 | `adapter/vxe-table.ts` 两处 `props?.type` 当布尔用导致口径互换，改判 `Number(props?.type) === 1`。详见 `changelogs/change-log-2026-08-09-order-fee-exchange-rate-dr-cr-fix.md`。 |
| 2026-08-09 | `Refactor` | 费用 Tab 的费用代码/币别/结算对象列改读嵌套对象（与海出同构）。 | `SeaImportOrderFeeAdminApi.OrderFeeDto` 对象化；列定义、`formatter`、`dataIndex`、币别聚合、Handsontable 的 `__settlementName` 缓存键与海出保持一致。详见 `changelogs/change-log-2026-08-09-order-fee-statement-foreign-key-objectification.md`。 |
| 2026-08-08 | `Fix` | 基础信息/列表/更改单/复制文案去掉订舱编号展示（进口无此字段）。 | UI 移除 `bookingNum`；DTO/提交仍保留兼容。详见 `changelogs/change-log-2026-08-08-sea-import-remove-booking-num.md`。 |
| 2026-08-08 | `Fix` | 基础信息保存成功后，费用/更改单 Tab 用最新详情整体替换订单摘要与信息卡片。 | 与海出同构：`onSaved`/`emit('saved')`/`savedDetail`/`latest-detail`。详见 `changelogs/change-log-2026-08-08-edit-workspace-saved-detail-sync.md`。 |
| 2026-08-04 | `Feat` | 编辑工作台基础信息对齐出口版式；新增附件 Tab；费用数量由 editor 直查；概要字段改用进口 DTO 正确属性名。 | 基础信息组件为 `basic-info-form/form.vue`（`SeaImportAdminForm`），不再使用根目录 `form.vue`。 |
| 2026-07-25 | `Perf` | 箱型选择从 option 取名称，选中时不再请求箱型详情 | 与海出同构的 `order-ctn-table`；`@change` 写 `ctnCodeName`，`syncCtnNameMap` 仅兜底回显 |
| 2026-06-07 | `Refactor` | 编辑态服务项目值映射改为运行时读取 `ServiceType` 枚举，不再使用本地固定值常量。 | 详情回填与保存提交共用同一枚举映射，避免海运进口与海运出口在服务项值上出现偏差。 |
| 2026-05-17 | `Fix` | 修复干系人补录场景：新增角色后角色下拉保持可用，仅禁用重复角色选项，支持在缺失角色中手动选择。 | 无 |
| 2026-05-17 | `Fix` | 干系人固定角色（销售/商务/操作/客服/单证）改为不可删除、不可重复添加；提交前新增“销售与操作必须选择人员”校验。 | 无 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/sea-imports/:id/edit` 对应组件 `src/views/sea-import-admin/editor.vue`，权限口径为 未在路由中声明独立权限。 |
