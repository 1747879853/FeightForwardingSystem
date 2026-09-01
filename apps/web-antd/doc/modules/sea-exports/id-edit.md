---
title: 海运出口编辑工作台
module: 海运出口
author: auto-doc-sync
last_updated: 2026-09-01
---

<!-- 说明：本页复用 `basic-info-form/form.vue`，其脚本已按批次拆分为 `sea-export-detail-mapper.ts`（映射）、`service-type-nodes.ts`（服务项纯逻辑）、`use-order-users.ts`（干系人）、`use-sea-export-ai-recognize.ts` + `ai-extract-utils.ts` + `ai-extract-upload-modal.vue`（AI 识别）、`use-sea-export-submit.ts`（保存提交/脏检查）等模块，样式外链至 `form.css`。 -->

# 1. 业务背景说明 (Background)

**白话解释：** 海运出口编辑工作台是海出委托创建后的日常操作中心。它以路由中的委托 ID 作为上下文，聚合基础信息维护、费用录入与审核、更改单、派车、分单、附件与运踪等子业务，使业务、单证、操作、客服、财务能够围绕同一运输单协同处理。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/sea-exports/:id/edit` |
| 路由名称 | `SeaExportEdit` |
| 页面组件 | `src/views/sea-export-admin/editor.vue` |
| 权限口径 | 路由参数限定为 36 位 GUID；通过 `activePath: /sea-exports` 归属海运出口菜单 |
| 关键源码 | `src/router/routes/modules/sea-export.ts`<br/>`src/views/sea-export-admin/list.vue`<br/>`src/views/sea-export-admin/basic-info-form/form.vue`（及同目录 README 与私有拆分文件）<br/>`src/views/sea-export-admin/editor.vue`<br/>`src/views/sea-export-admin/data.ts`<br/>`src/views/sea-export-admin/orderFee/data.ts`<br/>`src/api/sea-export/sea-export-admin.ts`<br/>`src/api/sea-export/order-fee-admin.ts`<br/>`src/api/sea-export/change-order-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **工作台标签导航：** `editor.vue` 维护顶部标签，当前可见：基础信息、应收应付、更改单、**附件**、派车、**监装**、分单、运踪信息。「监装」需 `Admin.SeaExport.LoadingOrder.Get`，无权限时整 Tab 不出现、也不参与 Tab 记忆恢复。已挂载组件的标签均可进入对应子页；**服务详情 / 单证信息 / 问题记录 / 修改历史** 暂从顶部导航隐藏（代码中注释保留，便于恢复）。「服务详情 / 单证信息」原为滚动定位到基础信息表单内船期/港口区块，隐藏页签后区块内容仍在「基础信息」页内可编辑。
- **码头船舶：** 编辑态在船名/航次字段右侧展示一个图标按钮，点击调 `FeituoAdmin/QueryTerminalScheduleAsync`（只传业务单 Id，船名/码头航次/起运港由后端自取；**纯查询，不写库**）。有可引入字段则弹窗让用户选一条（即使只有一条也不自动取）；`filteredByTerminalVoyno=false` 时提示这是该船在该港的全部挂靠计划。点「确定引入」后前端回填 `atd`（实际开船）、**`terminalVoyno`（出口 `evoyage`，码头航次）**、`closeVgmTime`（截港）、`closeDocTime`（截单）、`closeManifestTime`（截关），并立刻走原有编辑保存。**不要把 `evoyage` 写进 `innerVoyno`。** 无数据或没有可引入字段只提示。不回填计划离港 `etd`，也不把 `eta`/`ata`（抵达起运港）当成预抵。新建态不显示该按钮。
- **基础信息字段布局：** 6 列栅格顺序为：第 1 行委托单位/船公司/船名航次/码头航次/船代/订舱代理（车队落到下一行）（由 `BASIC_INFO_FIELD_ORDER` 控制）。船名/航次使用 `VesselVoyageInput`，海出侧比例 **3:2**；码头航次是独立输入框 `terminalVoyno`；运输条款/贸易条款合并为 `ServiceTradeTermsInput`（内部 1:1，字段仍为 `codeServiceId` + `tradeTermsType`）；**订舱代理**（`bookingAgentId`）与船公司/船代/场站一并迁入基础信息区，排在船代之后、车队之前；**签单地点 / 签单日期** 表单 `hidden`（模型保留可提交）；应收应付与更改单左侧「海运出口信息」面板不再展示签单日期。
- **工作台 Tab 记忆：** 切换顶部标签时，按当前委托 ID 将 `activeTab` 写入 `sessionStorage`（键经 `buildBrandStorageKey` 品牌隔离）；再次进入同一票编辑页时自动恢复离开前的 Tab。仅恢复当前可见且有对应面板的 Tab key；关闭浏览器标签后会话清空，下次默认回到「基础信息」。工作台「前往上传」会先写 pending Tab，再带 `?tab=attachments`；二者都优先于会话记忆。路由 `fullPathKey: false`，避免 query 变化整页重挂。命中后会立刻写入记忆并 `replace` 掉 `tab` 参数。基础信息表单内滚动**不再**改写工作台 `activeTab`（已移除分区 Tab 双向联动）。
- **缓存页冻结委托 id：** 编辑工作台及费用/更改单/附件/派车/监装/分单从路由取 id 时走 `useKeepAliveRouteParamId`。本页可见才同步地址栏；KeepAlive 藏起来后冻结上次 id，避免海进等同名 `:id` 页把海出缓存页带去打进口详情（或反过来）。
- **浏览器标签栏标题：** 由嵌入的 `form.vue` 通过 `useSeaExportTabTitle` 动态设置：有主提单号显示「海运出口-{主提单号}」，否则显示「海运出口-{委托编号}」；主提单号录入或详情回填后实时更新。
- **基础信息维护：** 基础信息标签内复用 `form.vue` 的编辑态，以 `embedded` 模式嵌入工作台；详情来自 `getSeaExportDetail`，保存调用 `editSeaExport`。保存 / 只读以当次详情根上的 `isEditable` 为准（并要有 `Admin.SeaExport.Edit`）；为假则整页只读、保存禁用，复制仍可用。详情能打开不代表能保存。
- **保存后跨 Tab 联动：** 编辑保存成功后 `loadEditData` 返回最新 `SeaExportDto`，经 `form` → `saved` → `editor.savedDetail` 下发给费用/更改单（`:latest-detail`）；同时调用 `clearOrderDetailCache` 清掉 `useOrderFeeLinkage` 模块级订单详情缓存，避免 KeepAlive 子页继续展示或联动旧数据。
- **AI 识别辅助：** 与新建页共用 `form.vue` 顶栏「AI识别」：点击弹出拖拽上传区，支持 PDF/图片/Word/Excel/RTF（doc/docx/xls/xlsx/rtf）；放入文件后自动对接 TextIn `ExtractSeaExportToAddDtoAsync`；识别结果覆盖回填（含六段港口 Id/`*Remark`；空值/0/空 Guid 跳过），成功后关窗。
- **服务项目联动：** 嵌入的 `form.vue` 在变更委托单位或起运港时执行双语义查询：仅 `polId` 决定节点可见范围，`polId+clientId` 决定默认勾选。**新建页**与**编辑页**均走 POL 联动，但语义不同：
  - **编辑首屏**：拉 `GetServiceTypesByPOLAsync`（按 `polId`）仅作为**元数据**（`sortId`/`userAttribute`/`seServiceLocks`/`seServiceRequires`）；勾选与任务进度以详情 `seaExportServices` 为准；港口配置缺失的历史服务项照常保留（回填期间 `suppressServiceTypeLinkage` 抑制误触发）。
  - **编辑改起运港 / 改委托单位**：按新 `polId(+clientId)` 的 `checked` **重写勾选**（客户排除项默认不勾、可手动勾回），并**丢弃任务进度**，流水线回到「新建态」仅展示服务项、不显示待处理/已完成任务，直至保存成功后 `loadEditData` 恢复真实任务态。
- **服务项目流水线（Chevron 三态）：** 仅展示已勾选节点，**完全按 `sortId` 分组**：同 `sortId` 节点在 Chevron 流中无缝咬合成一块：咬合位移下沉到 `item` 层（每个非组首节点重叠一个箭头宽），组内相邻节点稳定无缝、跨组仍保持箭头链流向，仅整条链全局首端左收圆、尾端右收圆；不同 `sortId` 组之间保留间距以区分分组。**视觉分组只看 `sortId`，不再区分待处理/已完成/还未到**（旧的「仅全『还未到』组才合并成单标签块」逻辑已移除）；组内每个服务仍各自渲染、单独完成/取消完成。组内服务为同一优先级，轮到该组时全部待处理节点同时显示「处理中」、展示处理人且均可操作，组内全部完成后才进入下一 `sortId` 组。**顶栏内联展示**：与 AI 识别等同处 `content-section__actions` 一行，左侧为「服务项目」标题、`...` 配置入口与紧凑流水线，右侧为操作按钮。节点增删在「配置服务」弹窗维护：按 `ServiceType` 枚举项 `extra1` 分为「主流程 / 非主流程」，组内仍按 `sortId` 排序；**任意勾选变化**时编辑态点「确定」弹出二次确认后自动保存（弹窗内无常驻提示）。悬浮 Tooltip 可「完成服务」/「取消完成」；若配置了必填附件类型且本票还缺，完成按钮旁提示「完成前需上传」及缺失类型，「去上传」会切到附件 Tab（橙色按钮）；已传齐则不显示该提示。点完成只提示缺的必填类型，不自动跳转。后端缺附件时报 `完成任务需要上传以下附件: …`，由全局错误弹窗展示。保存提交 `serviceTypes: number[]`。
- **执行方字段独立：** `bookingAgentId`/`teamId`/`custBrokerId`/`warehouseId`/`insuranceId` 与流水线节点完全解耦，始终全量显示，不随节点勾选状态联动。
- **干系人角色约束：** 可选角色由「系统管理 → 枚举管理」的 `SeaExportUserAttribute` 枚举维护（子项 `value`=`UserAttribute` 位值、`displayName`=角色名、`enable`=是否可用、`extra1`=是否进页面即展示；子项顺序即面板顺序），前端不再写死 6 项。**销售、操作为固定角色**：无论枚举是否配置都展示、标签带红色必填标识、不可删除且必须已选人（销售必须且只能有一人）；枚举漏配时二者兜底补在最前。勾了 `extra1` 的角色进页面即渲染，**编辑态订单未保存该角色时也会补一张空卡**（保存时无人员会被过滤，不写库）；未勾 `extra1` 的角色（如海外客服）只在详情已有人员或手动「添加角色」后出现。枚举拉取失败/未配置时，面板只剩销售与操作，这是预期兜底。新建态选择委托单位后按客户绑定干系人默认回填（`Client/GetDishonestStakeholdersAsync` → `applyClientDefaultOrderUsers`）；操作/单证/客服若客户未绑定则兜底当前登录账号。编辑态改委托单位只更新业务来源，不重写已保存干系人。干系人 `UserSelect` 走全量用户缓存：未选归属组织时候选为当前登录用户所属各公司人员，选定组织后收窄为该销售组织所属公司；客户默认带回与编辑回填的已选人不受过滤限制、始终显示昵称。保存时另按当前勾选服务项的 `userAttribute` 动态校验（每服务至少一个绑定角色已选人）。干系人展示信息（昵称/启用态/手机/邮箱/组织路径）统一走 `User/GetUserListByIdsAsync` 按 id 批量获取，初始化与委托单位回填一次请求；未命中 id 展示「已删除」兜底，悬停卡片副标题为组织路径。
- **场站联系方式展示与保存：** 编辑态在基础信息「场站」字段标签行最右侧展示 `yardContact`（场站联系人），与字段右边界对齐；悬浮联系人后展示 `yardEmail`（场站邮箱）、`yardMobile`（场站手机）、`yardTel`（场站电话）。值来自详情 `SeaExportDto`，经 `flattenDetail` 写入 `entrustReadonlyInfo`（UI 只读）；保存时由 `collectCurrentFormValues` 取出并经 `buildSeaExportDto` 写入 `EditAsync` 根字段，避免漏传被后端空覆盖。空值显示 `-`。右侧栏仅保留「干系人」卡片。
- **委托单位 / 订舱代理联系人：** 与场站同款挂在标签右侧。编辑回填详情对象 `clientContact` / `bookingAgentContact`；用户改选客户后改拉默认联系人。保存带回 `transportOrder.clientContactId` 与 `bookingAgentContactId`。无独立联系人下拉。
- **详情回填：** `form.vue` 通过 `flattenDetail` 把 `SeaExportDto` 和内层 `transportOrder` 拉平成多个表单分区，同时通过 `selectedItems` 避免客户、港口、船公司等选择组件重复请求详情。港口字段已对象化（`pol`/`pod`/`pot1`/`pot2`/`receivePort`/`deliverPort`/`prepareAt`/`signingPort`），编辑回填用 `toPortObjectSelectedItems` 整对象注入；航线/国家取自目的港 `pod.lane` / `pod.country`。
- **船期与付费联动：** 船期截关节点展示顺序为截单 → 截港 → 截关（字段仍为 `closeDocTime` / `closeVgmTime` / `closeManifestTime`）；保存时校验上述日期不得晚于开船日期或实际开船日期；详情回填或用户切换付费方式时，到付自动以目的港覆盖付费地点，预付自动以起运港覆盖付费地点。
- **箱包装默认值：** 新增箱型箱量行时，从订单级总包装复制包装 ID 与显示文本，避免远程下拉只显示数字 ID；复制后箱行包装仍可单独修改。
- **箱型箱量批量新增：** 标题栏「批量新增」打开 Popover，分页拉取全部启用箱型并可按名称搜索；按箱型填数量后确认，一次生成对应条数「一行一柜」记录（预填箱型，带出总包装默认值）；单条「+」添加仍保留。
- **船公司选中回显：** 详情接口返回同级 `carrierLogo` 与对象 `carrier`（含 `cnShortName`/`cnName`/`code`/`ediCode`）后，编辑页在 `carrierId` 的 `selectedItems` 中拼接 `carrier.cnShortName || carrier.cnName`、`code`（若有）与 `logo`，确保 `CarrierSelect` 首屏即显示“Logo + CODE(简称)”。往来单位（委托单位/收发通/船代/订舱代理/场站/车队等）回显统一取 `*.name`。
- **锁定状态展示：** 左侧委托信息显示委托编号、会计期间、应结日期、所属公司，并以标签展示“业务已/未锁定”和“费用已/未锁定”。保存时会把只读锁定状态带回 `transportOrder`。
- **委托编号重新生成：** 基础信息页头「委托编号」右侧的刷新图标（仅编辑态、需 `Admin.SeaExport.Edit` **且** `detail.isEditable`）调用 `UpdateCommissionNumAsync`（PUT，入参仅 `{ id }`），由后端按编号规则重新取号并写回同 Id 的 `TransportOrder.CommissionNum`；前端用返回的新编号即时替换页头展示并标记列表待刷新。该操作立即生效、不随「保存」提交；点击前若表单本无未保存修改会同步脏检查基线，避免误触发未保存拦截。
- **费用数量提示：** 工作台进入后调用 `getOrderFeePagedList({ TransportOrderId })`，统计应收 `paySide === 0` 与应付 `paySide === 1` 数量，将费用标签显示为“应收应付 x - y”，并每 60 秒刷新一次。
- **订单费用处理：** 费用页基于运输单 ID 加载应收应付费用，字段覆盖费用代码、结算对象、币种、汇率、单价、金额、税率、开票/结算金额、可开票、机密、费用状态等；费用状态包括录入、提交审核、审核通过、驳回、申请修改、申请删除、部分结算、结算完毕。改币别时汇率只取「费用币别兑所属公司本位币」且业务日期（海出=开船日）有效的记录，对不上留空手填；费用币别本身就是本位币则锁 1。工具栏新增「**创建付费申请**」（需 `Admin.PaymentApplication.Add`）：勾选应付且组合状态为审核通过/部分结算、同一结算对象、跳转前先 `GetOrderFeeGroupAsync` 回捞，成功后进入付费申请新增页预填（`orderFeeIds` query）。应收/应付表工具栏「打印」：`printJsonType` 分别为 `1000`（应收）/ `1500`（应付），拉模板列表传 `bizType=0`（海运出口，结果含通用模板）；由后端按 `transportOrderId` 取数，勾选已保存费用时传 `orderFeeListInput.ids` 仅打勾选项，未勾选则打整票。
- **更改单处理：** 更改单页基于运输单 ID 管理变更原因、会计期间和关联费用，接口使用 `/services/app/ChangeOrderAdmin`；更改单 DTO 带 `feeLocked` 和费用锁定人/时间信息。
- **派车处理：** 派车页按 `seaExportId` 分页加载派车记录，支持新增、编辑、删除，维护车队、要求时间、派车时间、工厂联系人、堆场、截关时间、工厂、区域地址、注意事项以及派车箱明细。
- **监装工单：** Tab 文案为「监装」，位于派车与分单之间；需 `Admin.SeaExport.LoadingOrder.Get`，无权限时整 Tab 不出现、也不参与 Tab 记忆恢复。进入即调 `LoadingOrderAdmin/DetailBySeaExportIdAsync`（**传海出 id**），返回 `null` 且有 `.Add` 时直接进入新建表单（不先点「新建」）；无 `.Add` 才显示空态。版式按 Figma 节点几何：工号只在基础信息第一格（带复制），顶栏仅状态 +「保存 / 提交 / 删除」；五列栅格（列间距 13px、行间距 12px），控件用默认 middle 高度；第三行预计到货/堆场/师傅各占一列，师傅为多选（人数不限）；堆场标签旁橙色「推荐」可点：先选预计到货时间且已保存船公司，弹窗调 `GetYardUsersAsync`，单选一行后回填堆场与师傅（接口只回名称，前端对本地 id）；监装要求已选标签区常驻一行高度，避免 0→1 勾选抖动；详细说明读写工单 `remark`（高 62px，最长 1024，未提交可改）；集装箱 32px 浅蓝标题条，列表头 36/行 50，照片采集按钮 123×30 用稿面相机 SVG。**明细包装与堆场的候选项只认已保存的海运出口**（基础信息未点保存不会带到监装；切回监装 Tab 会重拉堆场）。无船公司与船公司未维护堆场时下拉不禁用、打开为空列表，用不同空态文案。师傅 `userAttribute=512`，人数前后端都不卡。按状态：未提交（保存/删除/提交）、待认领（仅撤回）、已认领与已完成（全部禁用并提示联系监装师傅）。工单号由后端按 `LoadingOrder.LoadingOrderNum` 生成。干系人里的「监装」与工单师傅列表是两套，互不同步。
- **分单处理：** Tab 内按 [Figma 分单稿](https://www.figma.com/design/6Fp1XCtTc0rfw2hLtZCOCn/Untitled?node-id=24-654) 做成页内工作台，不再用列表+弹窗。顶栏用分提单号胶囊切换已保存分单，蓝色「+」开新草稿；右侧「删除 / 打印 / 保存」。主卡左列收发通（Shipper / Consignee / Notify Party 与第二通知人切换，二者都是下拉+地址，切过去即可改；第二通知人从主单带出，不随分单保存），右列主/分提单号、签单方式、提单份数（主单只读 `noBillEnum/copyNoBillEnum`）、运输条款、付费方式、代理及装箱明细表。其下两张白卡：船期与港口（ETD/预抵/船名/船次及收货地·起运港·目的港·交货地代码+名称，全部主单只读）、货物明细（唛头、货描大文本底边与右侧件数/包装/毛重/体积齐平）。**新增默认**只带主单条款与装箱，不带收发通/货描；装箱标题栏「读入主单」才整包覆盖。打印走海出 `PrintJsonType=0`。切换分单 Tab 若有未保存修改会确认丢弃。
- **附件管理：** 附件 Tab（位于单证信息之后）按附件详细类型以**卡片网格**展示（大屏一行 3 个）；每张卡片的文件列表固定显示 3 个文件项，超出后卡片内纵向滚动；卡片标题行右侧合并「客户可见」勾选与「上传」；**可把文件拖到卡片上上传**（可多文件），空态提示「点击或拖拽上传」；文件列表支持点击预览、下载、删除，且每个文件项带一个「客户可见」`Switch`（如实回显 `item.clientVisible`）；网格末尾虚线卡片可「添加其他类型」。每个文件项在文件名下方将「大小 · 上传人：{姓名} · 上传时间：{YYYY-MM-DD HH:mm:ss}」压缩到同一行（分别取 `creatorUserName` 与 `creationTime`，时间经 `@vben/utils` 的 `formatDateTime` 格式化，值为空则隐藏对应字段）。上传/删除即时调用 `AddAttachmentsAsync`/`DeleteAttachmentsAsync`。**客户可见性可回改**：单文件切换 `Switch` 或点击卡片标题行「客户可见」`Checkbox`（该类型批量），均调用 `Attachment/UpdateAttachmentItemsClientVisibleAsync`（PUT，入参 `[{ id, clientVisible }]`，`id` 为 `AttachmentItem.id`）；标题行 `Checkbox` 由该类型下各文件可见态计算全选/半选，勾选即批量提交全部文件，同时作为新上传的默认值（**新上传仍默认客户不可见**）。无 `Admin.SeaExport.Edit` 时只读。点击文件打开全局 `AttachmentViewerModal`：PDF 内嵌 iframe、Office 走微软在线预览、图片直接展示，工具栏同步展示上传人和上传时间。
- **打印：** 顶栏「打印」调用全局 `usePrintFormat().openPrint`（`PrintJsonType=0`，`detailInput={id}`，`bizType=0`，后端 `GetPrintAsync` 自动取数）；应收应付费用表打印用 `PrintJsonType=1000/1500` + `orderFeeListInput` + `bizType=0`。模板列表走非管理端接口并按当票签单方式/船公司/分公司/业务类型筛选（`bizType` 相等或为空）。打印弹窗：标题行选模板（默认不选），选中后 iframe 预览 PDF（原始文件名地址）；底部为分裂式「打印」按钮，PDF/Excel/Word 统一静默拉取后浏览器下载（友好名仅去掉末尾纯数字时间戳）。新增模式禁止打印；有未保存修改仅提示「使用已保存数据」（后端按 id 取库）。
- **保存 / 复制（合并按钮）：** 编辑页顶栏「保存」为 `Dropdown.Button`，主键点击保存；鼠标悬浮展开下拉「复制」（需 `Admin.SeaExport.Add`）。`isEditable === false` 时保存禁用、复制拆成独立按钮以免被一起禁用。复制若表单有未保存修改先警告，确认后弹窗可选 `copyOrderFees`（默认不复制），`CopyAsync` 成功后 `replace` 至新票编辑页。新建态无复制项，退化为普通「保存」按钮。顶栏不再有「取消」按钮与订阅状态 Tag。
- **运踪订阅：** 基础信息 Tab 顶栏「运踪订阅」（仅编辑态，需 `Admin.ExternalApi.Use`）；点击直接发起单票订阅，无二次确认；与列表共用 `useYundangOceanSubscribe`。提交仅 `seaExportIds`，字段明细见 [运踪订阅字段清单](./yundang-subscribe-fields.md)。
- **运踪信息：** 编辑工作台顶部「运踪信息」Tab 内直接查看（`Admin.ExternalApi.Get`）；调用 `GetOceanPushInfoAsync` 展示订阅概要、运单概要、里程碑、**航段**、集装箱轨迹；等待推送态自动轮询刷新；内容区 padding 12px。基础信息 Tab 顶栏不再提供「查看运踪」按钮。运单概要在船名航次/港口/ETD·ETA·ATA 外，按需补充 AIS 预计到港、首次预计到港、交货地及其 ETA/ATA、备注（有值才渲染）。**里程碑**节点「已完成」仅看 `actualityTime` 是否有值，不再用 `isCurrent` 标「进行中」。**航段 Tab** 按 `sno` 升序表格展示 序号/类型（大船·驳船·陆运）/航线（港口中文名优先）/船名航次/ETD·ATD·ETA·ATA。**集装箱**补充件数/毛重/VGM、甩柜/异常 Tag 与「费用/免箱期」小表（费用类型/最后免费日 LFD/免费天数）。展示字段均以后端 `YundangShipmentInfoDto` 返回为准、判空后渲染。
- **完成服务：** 编辑态服务流水线「完成服务」/「取消完成」成功后重新拉取详情，同步任务状态、勾选展示及只读摘要。「完成」仅 `seServiceTaskUsers` 处理人可操作；「取消完成」仅 `completionUserId` 对应完成人可操作；无权限时悬浮展示提示。
- **已完成服务锁定字段只读：** 编辑态按「所有已完成任务对应服务项的 `seServiceLocks` 并集」将相关表单字段置为 `disabled`（`SeaExportPropEnum → 字段名` 映射，广播到基础/船期/港口表单）；取消完成或改港重写后自动解除。锁定字段虽 `disabled`，其值仍随 DTO 提交、由后端用库值覆盖。
- **保存重建二次确认：** 编辑保存时，若 `polId` 或勾选 `serviceType` 集合相对详情发生变化，**且本票已存在任意服务任务**，弹确认「将清空全部服务任务进度并重新生成」，取消则中止保存。配置弹窗「确定」后直接应用勾选并保存，重建确认统一由保存流程处理。
- **服务责任角色预校验：** 保存前复用 `validateServiceBoundOrderUsers`，按当前勾选服务项的 `userAttribute` 校验干系人（每服务至少一个绑定角色已选人）；编辑态因已取到 POL 配置的 `userAttribute` 而生效。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| 页面初始 | 用户进入 `/sea-exports/:id/edit` | 工作台加载 | 路由只匹配 36 位 GUID，工作台以该 ID 作为海出上下文。 |
| 基础信息标签 | 组件挂载 | 详情回填 | 调用 `DetailAsync`，把海出字段和运输单字段展开到多分区表单。 |
| 基础信息编辑中 | 点击保存且校验通过 | 编辑成功 | 调用 `EditAsync`，成功提示后停留当前编辑上下文，`loadEditData` 重新拉取详情并 `emit('saved')`，联动刷新费用/更改单且清理费用联动缓存。 |
| 基础信息编辑中 | 点击取消 | 返回列表 | 跳转 `/sea-exports`。 |
| 基础信息编辑中 | 点击复制并确认 | 新票编辑页 | 若有未保存修改先警告；调 `CopyAsync` 后 `replace` 至 `/sea-exports/{newId}/edit`。 |
| 任意工作台状态 | 切换顶部标签 | 写入 Tab 记忆 | `activeTab` 按委托 ID 存入 `sessionStorage`。 |
| 再次进入编辑页 | 组件挂载 / `editId` 变化 | 恢复离开前 Tab | 仅读取当前可见且有面板的 `TabKey`；无记录或非法/已隐藏值时回退「基础信息」。 |
| 基础信息内滚动 | 用户滚动表单分区 | 停留当前 Tab | 不再通过 `sectionChange` 改写工作台 `activeTab`，避免切到已隐藏 key 导致空白页。 |
| 任意工作台状态 | 切换到费用标签 | 费用列表加载 | `OrderFee` 以运输单 ID 查询费用明细，并可维护应收/应付。 |
| 费用录入状态 | 提交审核 | 提交审核 | 费用状态由录入进入审核链路，审核结果在费用审核模块处理。 |
| 费用提交审核 | 审核通过 | 审核通过 | 费用可进入后续开票、付款、对账、结算链路。 |
| 费用提交审核 | 审核驳回 | 驳回 | 费用回到可修正状态，具体可编辑范围以后端状态规则为准。 |
| 费用已审核或结算中 | 申请修改/删除 | 申请修改/申请删除 | 通过审核任务处理已进入管控状态的费用变动。 |
| 费用锁定 | 用户进入更改单 | 更改单承载变更 | 更改单记录变更原因与费用列表，保留锁费状态和锁费人/时间。 |
| 派车/分单标签 | 页内保存当前分单 | 子记录更新 | 分单以 `seaExportId` 为外键；保存后刷新 Tab 列表并停留在刚保存的分提单。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **海出 ID** | 工作台路由上下文主键。 | 路由动态段 `:id` / `SeaExportDto.id` | **触发/依赖：** 用于加载海出详情、派车、分单等子资源。 | 路由正则要求 36 位 GUID。 |
| **运输单 ID** | 费用、更改单等公共业务的上下文主键。 | `detail.transportOrder.id` | **触发/依赖：** 费用统计、费用分页、更改单查询均依赖 `TransportOrderId`。 | 详情必须返回有效运输单 ID。 |
| **委托编号 / 会计期间 / 应结日期 / 所属公司** | 基础信息标题行只读摘要（所属公司文案）。 | `transportOrder.commissionNum/accountDate/settlementDate`、`orgs` | **触发/依赖：** 加载详情后刷新 `entrustReadonlyInfo`；归属组织已改为头部可编辑 `UserOrgSelect`，勿与只读所属公司文案混淆。 | 前端展示为只读（归属组织除外）。 |
| **归属组织** | 委托直属组织（必填）；头部按干系人销售绑定可选范围，标签带 `*`。 | `orgId`；`UserOrgSelect` + `salesUserId` + `headerOrgSelectedItems`（`formatOrgPathLabel(orgs)`） | **触发/依赖：** 详情用 `orgs` 路径兜底回显；销售切换时仅「从另一用户切过来」清空已选；缺值时 toast 点名。 | **必填项**；schema 隐藏载体保留校验。 |
| **合同号** | 运输单合同号。 | `transportOrder.contractNum` | **触发/依赖：** `flattenDetail`/`buildSeaExportDto`；复制确认展示源票值，入库由后端置空；栅格排在运输条款/贸易条款之后。 | 可空；最长 64。 |
| **场站联系人 / 邮箱 / 手机 / 电话** | 「场站」标签右侧展示联系人，悬浮后展示邮箱、手机、电话；保存时透传以防被空覆盖。 | `SeaExportDto` / `SeaExportEditDto` 的 `yardContact` / `yardEmail` / `yardMobile` / `yardTel` | **触发/依赖：** `flattenDetail` → `refreshEntrustReadonlyInfo`；与 `yardId` 选择解耦，当前不随改场站即时刷新；`collectCurrentFormValues` + `buildSeaExportDto` 写入提交 DTO。 | UI 只读；保存必须带回当前值；空值显示 `-`。 |
| **委托单位 / 订舱代理联系人** | 标签右侧展示姓名，悬停邮箱/手机/电话。 | 详情 `clientContact` / `bookingAgentContact`；改选客户后 `ClientContactAdmin/GetPagedListAsync` | **触发/依赖：** 回填用详情对象，不在加载时改写成默认；保存 `clientContactId`（运输单）与 `bookingAgentContactId`（海出根）。 | UI 只读；无下拉；空显示 `-`。 |
| **业务锁定** | 业务资料是否已锁定。 | `transportOrder.isBusinessLocking` | **触发/依赖：** 编辑页以锁图标标签展示，保存时保留当前只读值。 | 不在当前表单中直接切换。 |
| **费用锁定** | 费用是否允许继续变动。 | `transportOrder.feeLocked`、更改单 `feeLocked` | **触发/依赖：** 影响订单费用与更改单业务判断；费用锁定/解锁入口在费用管理模块。 | 当前页展示并随 DTO 带回，不直接切换。 |
| **费用标签数量** | 应收与应付费用数量摘要。 | `getOrderFeePagedList` / `paySide` | **触发/依赖：** 每 60 秒按运输单 ID 统计一次，应收为 `paySide=0`，应付为 `paySide=1`。 | 仅作为提示，不代表金额汇总。 |
| **船期时间（ETD/ATD/ETA）** | 预计开船、实际开船、预计到港时间。 | `transportOrder.etd/atd/eta` | **触发/依赖：** 编辑页详情回填到基础信息表单，费用页与更改单顶部摘要按同一字段显示。 | 允许为空，提交时统一转 ISO 字符串。 |
| **carrierLogo / carrierId / carrier** | 船公司主数据、简称与 Logo 回显。 | `SeaExportAdmin` 返回 `carrier`（`cnName`/`cnShortName`/`enName`/`code`英文简称/`ediCode`）与同级 `carrierLogo`；`CarrierSelect` 默认 `labelKey=cnShortName` | **触发/依赖：** 编辑页回填 `selectedItems` 用 `carrier.cnShortName \|\| carrier.cnName`，并附带 `logo`、`code`；列表/工作台/费用摘要优先展示简称。 | Logo 或对象缺失时回退全称/纯文本，不阻断保存。 |
| **订单费用** | 应收应付明细。 | `OrderFeeAdminApi.OrderFeeDto` / `/services/app/OrderFeeAdmin` | **触发/依赖：** 费用状态进入审核、开票、付款、对账、结算链路。 | 费目、结算对象、币种、金额、税率等以后端校验为准。 |
| **费用状态** | 费用生命周期状态。 | `getFeeStatusOptions` | **触发/依赖：** 录入、提交审核、审核通过、驳回、申请修改、申请删除、部分结算、结算完毕。 | 不同状态下可编辑范围不同，需以后端和费用表格逻辑为准。 |
| **更改单** | 业务变更记录及其关联费用。 | `ChangeOrderAdminApi.ChangeOrderDto` / `/services/app/ChangeOrderAdmin` | **触发/依赖：** 更改单携带 `accountDate`、`reason`、`orderFees` 和锁费信息。 | 必须保持同一 `transportOrderId`。 |
| **派车记录** | 出口拖车/派车执行信息。 | `dispatch/index.vue` / `dispatch-admin` | **触发/依赖：** 以 `seaExportId` 查询和保存；包含车队、堆场、工厂、地址和派车箱明细。 | 子记录需绑定当前海出 ID。 |
| **分单记录** | 分票提单及其货物/箱明细；页内按分提单号 Tab 编辑。 | `modules/separate-bill.vue` / `sea-export-separate-admin` | **触发/依赖：** 以 `seaExportId` 分页（`pageSize=100`）列出并保存；装箱列对齐稿面（序号/箱型/箱号/封号/件数/包装/重量/尺码/箱皮重/备注）；船期港口只读自主单；第二通知人从主单带出、界面可改，不写分单 DTO。 | 子记录需绑定当前海出 ID。 |
| **附件分组** | 按附件详细类型（提单、托书等）以卡片网格展示的上传区域与文件列表。 | `GetListByModuleTypesAsync` + `GetAttachmentsAsync` / `SeaExportAdmin` | **触发/依赖：** `moduleType` 取枚举「海运出口」；空配置类型仍展示上传槽位；点击文件打开 `AttachmentViewerModal` 预览。 | 上传需 `Admin.SeaExport.Edit`；新上传 `clientVisible` 默认 `false`。 |
| **客户可见（clientVisible）** | 单个附件对客户端是否可见。 | `AttachmentItemDto.clientVisible` / `Attachment.UpdateAttachmentItemsClientVisibleAsync`（PUT） | **触发/依赖：** 文件项 `Switch` 单条切换；卡片标题行 `Checkbox` 按类型批量切换（全选/半选由各文件计算）；入参 `[{ id: AttachmentItem.id, clientVisible }]`。 | 需 `Admin.SeaExport.Edit`；`id<=0` 忽略，空集合不报错。 |
| **显示字段配置** | 费用/更改单顶部摘要字段显示控制。 | `useDisplayFieldConfig` / localStorage key `order_fee_display_config` | **触发/依赖：** 费用页与更改单页共用同一配置缓存。 | 仅影响前端展示。 |
| **港口备注（费用摘要）** | 收货地/起运港/中转港1/2/目的港/交货地备注。 | `SeaExportDto` 的 `receivePortRemark`、`polRemark`、`poT1Remark`、`poT2Remark`、`podRemark`、`deliverPortRemark` | **触发/依赖：** 应收应付与更改单顶部订单信息六段港口均展示备注字段，非 `*Name`。 | 备注为空显示 `--`。 |
| **订舱代理** | 订舱服务执行方客户。 | `SeaExportDto.bookingAgentId` / `bookingAgent?.name`；`ClientSelect`（`industryCategory: 'o'`） | **触发/依赖：** 与流水线节点解耦，始终展示；schema 自船期迁入基础信息（`BASIC_MODULE_EXTRA_FIELD_NAMES`）；编辑回显走 `basicInfoFormApi` 的 `selectedItems`（名称取自 `bookingAgent?.name`）。改选后带出默认联系人，提交 `bookingAgentContactId`。 | 可选；须为含订舱代理属性的客户。 |
| **码头航次** | 港区航次，与船公司航次 `innerVoyno` 是两套编号。 | `SeaExportDto.terminalVoyno` | **触发/依赖：** 排在船名/航次后；码头船舶引入写这里（`evoyage`），不写 `innerVoyno`。 | 可空；上限 64。 |
| **委托单位 / 起运港** | 服务项目联动查询入参；委托单位亦为干系人默认来源。 | `transportOrder.clientId`、`polId`；`GetServiceTypesByPOLAsync`；`Client/GetDishonestStakeholdersAsync` | **触发/依赖：** 任一变更触发服务项联动；`polId` 为空清空勾选。`polId` 查询用于可见范围，`polId+clientId` 查询用于默认勾选。新建态 `clientId` 变更额外触发干系人默认回填；编辑态改委托单位只更新业务来源。 | **必填项**（`selectRequired`）；与新建页同一套 `form.vue` 逻辑。 |
| **服务项目 / serviceTypes** | POL 配置下的服务节点勾选结果（与执行方字段解耦）。 | `serviceTypeNodes`；提交字段 `serviceTypes: number[]` | **触发/依赖：** 节点范围与优先级来自 `GetServiceTypesByPOLAsync` / `seaExportServices`；label 与主流程标记来自 `ServiceType` 枚举，其中 `extra1=true` 表示主流程。配置弹窗按主/非主流程分组，任务顺序仍按 `sortId`。 | 勿再用执行方字段或 `organizationUnits` 推断节点勾选；缺失 `extra1` 按非主流程。 |
| **货物类型 cargoId** | 普通货/冻柜/危险品/超限箱。 | `transportOrder.cargoId`；枚举 `CargoType`（S=0/R=1/D=2/O=3） | **触发/依赖：** 货物信息 Card 标题行内联选择；`R` 展示冻柜 7 项，`D` 展示危险品 11 项；切换离开对应类型清空扩展字段。 | 全部可选；扩展字段经 `transportOrder` 提交。 |
| **危险品扩展字段** | 危品申报信息（等级、编号、联系人等）。 | `transportOrder.dgLevel` 等 11 项 | **触发/依赖：** 仅 `cargoId=2` 时展示与提交。 | 字符串最长 32；`dgMarinePollution` 三态 bool。 |
| **冻柜扩展字段** | 冷藏温度、通风、湿度等。 | `transportOrder.reeferTemperature` 等 7 项 | **触发/依赖：** 仅 `cargoId=1` 时展示与提交；`reeferTemperatureUnit` 前端枚举 `0=℃/1=℉`。 | 全部可选；`reeferVentOpen` 三态 bool。 |
| **毛重 KGS / 体积 CBM** | 整票毛重、体积。 | `transportOrder.kgs` / `cbm`；库列 `decimal(20,4)` | **触发/依赖：** 输入最多 4 位小数，末尾 0 不展示。 | 可选，非负。 |
| **集装箱毛重 / 皮重 / 体积** | 箱明细重量体积；分单 kgs/cbm 与分单装箱同步同一精度。 | `orderCtns.grossWeight/tareWeight/volume`；分单 `kgs/cbm` | **触发/依赖：** 与主单同一套 `weight-volume-precision`。 | 可选，非负。 |
| **派车箱毛重 / 皮重 / 体积** | 派车明细重量体积。 | `dispatch/index.vue` 箱行 `grossWeight/tareWeight/volume` | **触发/依赖：** 与主单同一套 4 位去尾 0。 | 可选，非负。 |
| **费用.数量** | 计价数量；单位为毛重/尺码时等于 Kgs/Cbm。 | `OrderFee.Quantity`；库列 `decimal(20,4)` | **触发/依赖：** Handsontable 与编辑弹窗最多 4 位、去尾 0；金额仍 2 位。 | 可选，非负。 |
| **内部备注 / 外部备注** | 货物区右侧同一卡片，顶部 Tab 切换；内部仅内部可见；文本框字号 14px，与件数等输入框一致。 | `transportOrder.internalRemark`、`transportOrder.remark` | **触发/依赖：** 两字段同时挂在 `CargoRemarkForm`，用 CSS 隐藏非当前 Tab；详情回填、提交 DTO、AI 提取均读写运输单字段；勿用海出根级 `SeaExport.remark`。 | 可选文本；删空后脏检查按空值归一。 |
| **监装工单备注（详细说明）** | 监装 Tab 文本框；管理端新建/编辑填写。 | `LoadingOrderAdmin` 的 `remark`；`AddAsync` / `EditAsync` / `DetailBySeaExportIdAsync` | **触发/依赖：** 详情回填 `form.remark`，保存随工单提交；与拒接原因 `rejectReason`、监装要求主/子表 `remark` 无关。 | 可选，最长 1024；空串按 `null` 提交；仅未提交可改。 |
| **监装推荐堆场/师傅** | 点「推荐」弹出该到货日该船公司已排师傅的堆场，选中回填。 | `LoadingOrderAdmin/GetYardUsersAsync` | **触发/依赖：** 要有预计到货时间 + 已保存 `carrierId`；回填覆盖当前堆场和 `userIds`。 | 接口无 id；堆场名对不上当前船公司则不回填。 |

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

> [!IMPORTANT] **[卡点 8：干系人角色靠 `SeaExportUserAttribute` 枚举，`extra1` 决定默认展示]** 枚举名大小写敏感，写错或未配置时面板只剩销售与操作；角色加进枚举但未勾 `extra1` 时只能从「+ 添加角色」手动加，不会默认出现。服务项配置的用户属性下拉仍是固定 6 项，未随本次改动走枚举。

> [!IMPORTANT] **[卡点 9：往来单位联系人须带回 Id]** 委托单位联系人在 `transportOrder.clientContactId`，订舱代理联系人在海出根 `bookingAgentContactId`。详情回填期间不要拉默认联系人覆盖已保存人选；漏传 Id 会被空覆盖。

> [!IMPORTANT] **[卡点 10：能看 ≠ 能改]** 详情按查询口径，编辑/删除/重新生成委托编号按 `isEditable`（编辑口径）。缺字段按 false。不要用功能权限代替行级字段，也不要读 `transportOrder.isEditable`。
>
> **[卡点 11：分单没有第二通知人字段]** 分单 Tab 第二通知人从主单带出，界面可改，但 `SeaExportSeparate` 无对应列，分单保存不会写入。要落库请改基础信息并保存主单。
>
> **[卡点 12：飞驼航次是码头航次]** 码头船舶条目的 `evoyage` 必须写入 `terminalVoyno`，禁止回填 `innerVoyno`。`filteredByTerminalVoyno=false` 时不要默认取第一条。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- | --- | --- | --- | --- |
| 2026-09-01 | `Feature` | 基础信息新增「码头航次」；码头船舶引入把 `evoyage` 写入码头航次，不再改船公司航次。 | 共享 `buildTerminalScheduleFormPatch`。详见 `changelogs/change-log-2026-09-01-sea-export-import-terminal-voyno.md`。 |
| 2026-08-31 | `Fix` | 委托单位、订舱代理标签旁按场站同款展示联系人；改选客户带出默认联系人，保存带回 Id。 | TAPD 1000904。回填用详情对象，加载时 `suppressServiceTypeLinkage` 避免改写成默认。详见 `changelogs/change-log-2026-08-31-sea-export-party-contact-label.md`。 |
| 2026-08-31 | `Fix` | 派车箱毛重/皮重/体积、应收应付费用数量改为最多 4 位小数，末尾 0 不展示。 | 后端同日扩到派车与 `OrderFee.Quantity` `decimal(20,4)`。详见 `changelogs/change-log-2026-08-31-dispatch-preorder-fee-qty-4-decimal.md`。 |
| 2026-08-31 | `Fix` | 主单毛重/体积、集装箱毛重/皮重/体积、分单 kgs/cbm 及分单装箱改为最多 4 位小数，末尾 0 不展示。 | TAPD `#1161580498001000905`。对齐后端 4 位小数。详见 `changelogs/change-log-2026-08-31-weight-volume-4-decimal.md`。 |
| 2026-08-30 | `Change` | 费用汇率只认「费用币别兑所属公司本位币」，对不上留空；本页原先已是严格匹配，与缓存去掉跨本位币兜底对齐。 | 共用 `exchange-rate-cache` 删掉宽松兜底和 `strictLocalCurrency`。详见 `changelogs/change-log-2026-08-30-exchange-rate-no-local-fallback.md`。 |
| 2026-08-28 | `Feature` | 应收应付 Tab 新增「创建付费申请」：勾选应付费用跳转付费申请新增并预填（需 `Admin.PaymentApplication.Add`）。 | 与海进/空出共用 `open-from-order-fees.ts`；详见 `changelogs/change-log-2026-08-28-order-fee-create-payment-application.md`。 |
| 2026-08-25 | `Feature` | 附件类型卡片支持把文件拖进去上传，空态为「点击或拖拽上传」。 | TAPD `#1161580498001000779` 附件上传统一。详见 `changelogs/change-log-2026-08-25-sea-import-tapd-1000779.md`。 |
| 2026-08-24 | `Style` | 分单货物明细唛头、货描文本框底边与右侧件数/包装/毛重/体积对齐；标签到输入框间距仍为 6px。 | 两列 `auto 1fr` 只拉高文本框。详见 `changelogs/change-log-2026-08-24-separate-bill-cargo-align.md`。 |
| 2026-08-24 | `Fix` | 分单切到第二通知人后可改客户和下拉地址，不再只读。 | 分单实体无该字段，仍从主单带出、不随分单保存。详见 `changelogs/change-log-2026-08-24-separate-bill-second-notifier-editable.md`。 |
| 2026-08-24 | `Style` | 分单 Tab 按 Figma 改为页内多提单胶囊工作台：左收发通、右条款+代理+装箱，下方船期港口与货物明细；去掉列表弹窗。 | 新增默认仍只带条款+箱；船期港口只读主单（港口拆代码/名称）；打印复用海出 `PrintJsonType=0`。详见 `changelogs/change-log-2026-08-24-separate-bill-figma-layout.md`。 |
| 2026-08-24 | `Fix` | 货物区「内部备注 / 外部备注」字号改为 14px，与件数等输入框一致。 | TAPD `#1161580498001000872`。详见 `changelogs/change-log-2026-08-24-cargo-remark-font-size.md`。 |
| 2026-08-23 | `Fix` | KeepAlive 缓存的海出编辑页不再跟着别人地址栏的 `:id` 拉详情。 | `useKeepAliveRouteParamId` 只认本实例 path；路由先变、停用后到时也不抢跑。详见 `changelogs/change-log-2026-08-23-keepalive-route-id-freeze.md`。 |
| 2026-08-23 | `Feature` | 编辑页 KeepAlive：切走提示后缓存草稿；点 X 才销毁。离开时基础信息或应收应付任一未落库都算脏。 | 路由 `keepAlive` + `defineOptions({ name: 'SeaExportEdit' })`；费用表快照见 `fee-table-dirty.ts`。详见 `changelogs/change-log-2026-08-23-detail-keep-alive-unsaved.md`。 |
| 2026-08-23 | `Fix` | 监装新建成功后先记下工单 id，详情 500 时再保存走编辑而不是再新建。 | `AddAsync` 回 id；有师傅时详情 AutoMap `LoadingOrderUsers` 会炸。详见 `changelogs/change-log-2026-08-23-loading-order-save-keep-id.md`。 |
| 2026-08-23 | `Fix` | 监装师傅不再限制最多 2 人，选几个传几个。 | 与后端一致，不卡人数；`userIds` 顺序仍是 `sortId`。详见 `changelogs/change-log-2026-08-23-loading-order-no-supervisor-limit.md`。 |
| 2026-08-23 | `Feature` | 监装「推荐」弹窗拉已排师傅的堆场，选中后回填堆场与师傅。 | `GetYardUsersAsync` 只回名称；堆场对 `carrierYards`，师傅对用户缓存。详见 `changelogs/change-log-2026-08-23-loading-order-recommend.md`。 |
| 2026-08-23 | `Style` | 监装可编辑输入框 hover/focus 恢复蓝色描边。 | 稿面灰边 `#e4e8ef` 盖过了 Ant 主色；只读格不套蓝。详见 `changelogs/change-log-2026-08-23-loading-order-input-focus.md`。 |
| 2026-08-23 | `Feature` | 监装「详细说明」改为读写工单 `remark`，不再拼接已勾要求明细备注。 | `AddAsync`/`EditAsync` 带 `remark`；空串按 `null`；与 `rejectReason` 及要求资料 `remark` 无关。详见 `changelogs/change-log-2026-08-23-loading-order-remark.md`。 |
| 2026-08-23 | `Feature` | 单据打印与费用打印拉模板列表传入 `bizType=0`。 | 费用模板跨业务共用 1000/1500，必须按业务类型筛；结果含 `bizType` 为空的通用模板。详见 `changelogs/change-log-2026-08-23-order-fee-print-biztype.md`。 |
| 2026-08-23 | `Fix` | 监装堆场：切回 Tab 重拉已保存船公司的堆场；无船公司与无堆场提示分开。 | KeepAlive 导致先开监装再保存船公司仍灰掉；占位不再误报「未选择船公司」。见 `changelogs/change-log-2026-08-22-loading-order-figma.md`。 |
| 2026-08-22 | `Style` | 监装要求已选区常驻一行高度；师傅改为真正多选回显；全页输入改为默认尺寸，不再用 small。 | 标签区不再 `v-if` 等到有选中才出现；UserSelect 改绑 `modelValue`；去掉 24px 强制高度以免多选被压扁。见 `changelogs/change-log-2026-08-22-loading-order-figma.md`。 |
| 2026-08-22 | `Fix` | 无监装工单时有 `.Add` 直接进新建表单，不必再点「新建」；无权限才显示空态。 | 删除工单后 `loadDetail` 同样自动进新建；草稿顶栏只留保存。见 `changelogs/change-log-2026-08-22-loading-order-figma.md`。 |
| 2026-08-22 | `Style` | 监装 Tab 按 Figma 节点几何 1:1：五列 24px 控件、要求浅蓝井+橙色计数圆点、集装箱 32px 标题条与 123×30 照片按钮。 | 工号不在顶栏重复；师傅单列；推荐角标无接口；详细说明不入库；照片只预览。见 `changelogs/change-log-2026-08-22-loading-order-figma.md`。 |
| 2026-08-22 | `Feature` | 新增「监装工单」Tab（位于派车与分单之间）：按海出查工单、未提交可编辑/删除/提交、待认领可撤回、已认领与已完成只读；勾选监装要求；箱型与监装照片只读。 | TAPD #1000122。`DetailBySeaExportIdAsync` 传的是**海出 id**；明细包装/堆场只认已保存的包装与船公司，基础信息未保存改动不联动；师傅最多 2 人由前端限制；无 `Admin.SeaExport.LoadingOrder.Get` 时整 Tab 隐藏且不参与 Tab 记忆。详见 `changelogs/change-log-2026-08-22-loading-supervision-frontend.md`。 |
| 2026-08-19 | `Fix` | 业务联系单引入的费用，「录入方式」不再显示数字 6，改为「业务联系单引入」。 | Handsontable 该列为 `type:text`，值被写成 `"6"`；`getDataEntryMethodLabel` 改为数值比较。详见 `changelogs/change-log-2026-08-19-pre-order-fee-currency-subtotal-settlement.md`。 |
| 2026-08-19 | `Fix` | 包装下拉改为全量缓存并前端搜索；基础资料删除包装后下拉不再能搜到。 | 与 `UserSelect` 同构：`codePackageListCache` + `useCachedSelect`。详见 `changelogs/change-log-2026-08-19-code-package-select-full-cache.md`。 |
| 2026-08-19 | `Feature` | 详情保存、只读、重新生成委托编号对接票根 `isEditable`；无权限时整页只读，复制仍可用。 | 以当次 `DetailAsync` 为准。见 `changelogs/change-log-2026-08-19-ticket-is-editable.md`。 |
| 2026-08-19 | `Fix` | 服务项悬浮仅缺附件时显示「去上传」；已传齐不再出现。点完成只提示缺的类型。 | 对照 `GetAttachmentsAsync` 已传类型；KeepAlive 回来会刷新。详见 `changelogs/change-log-2026-08-19-se-service-require-attachment-types.md`。 |
| 2026-08-19 | `Fix` | 工作台点「前往上传」后默认打开本页附件 Tab（pending Tab 覆盖会话记忆）。 | `fullPathKey: false` 避免 query 变化重挂；命中后立刻写入记忆再 `replace` 掉 `tab`。详见 `changelogs/change-log-2026-08-19-se-service-require-attachment-types.md`。 |
| 2026-08-19 | `Feature` | 完成服务前按配置提示并预检必填附件类型；POL 三个列表改为对象数组。 | `10001` 不参与字段必填；附件是否够以后端为准。详见 `changelogs/change-log-2026-08-19-se-service-require-attachment-types.md`。 |
| 2026-08-19 | `Feature` | 干系人下拉改为全量用户缓存；未选归属组织时看当前用户各公司，选了组织后看该销售组织所属公司。客户默认干系人仍带回且显示昵称。 | `UserSelect` 直绑 Select + `createBizSelectCache`；`company-ids` 由 `resolveOrderUserCompanyIds` 计算。详见 `changelogs/change-log-2026-08-19-user-select-full-cache-company-filter.md`。 |
| 2026-08-17 | `Feature` | 「码头船舶」改为查询接口：有可引入数据才弹窗，确定引入后回填实际开船/航次/截港/截单/截关并自动保存；无数据只提示。 | 接口从 `SyncTerminalScheduleAsync` 换成 `QueryTerminalScheduleAsync`，后端不再写库；不填 `etd`/`eta`/`ata`。共享 composable 与海进复用。详见 `changelogs/change-log-2026-08-17-terminal-schedule-query-import.md`。 |
| 2026-08-17 | `Style` | 基础信息 6 列顺序改为：订舱编号/主提单号/保险公司/报关行/仓库/场站为第二行，合同号排在运输条款之后。 | 只改 `BASIC_INFO_FIELD_ORDER`；schema 与提交映射不变。详见 `changelogs/change-log-2026-08-17-sea-export-basic-info-field-order.md`。 |
| 2026-08-16 | `Feature` | 收发通改为灰色折叠条（默认展开）；内部/外部备注挪到货物区件重尺右侧，顶部 Tab 切换。 | 折叠与 Tab 均用 `v-show` / CSS 隐藏。详见 `changelogs/change-log-2026-08-16-sea-export-party-collapse-remark-tabs.md`。 |
| 2026-08-16 | `Refactor` | 非 sjtd 品牌「运踪」Tab 的异常预警明细改为弹窗查看，且仅在有预警时才出现「异常预警(N)」按钮，不再常驻底部空表。 | 详见 `changelogs/change-log-2026-08-16-tracking-warning-modal.md`。 |
| 2026-08-16 | `Feature` | 多箱票的轨迹节点显示箱号，并可在「整票 / 按箱」间切换查看。 | 同名节点重复多为各箱进度差异或摘车后重新编组；按箱视图每箱一条时间轴。详见 `changelogs/change-log-2026-08-16-tracking-timeline.md`。 |
| 2026-08-16 | `Feature` | 非 sjtd 品牌的「运踪」Tab 新增「轨迹节点」时间轴：整票合并各箱节点，区分实际/预计/当前；顶栏状态标签改为「进行中 / 已完成」。 | 节点取运踪快照 `containers[].status[]`（同一节点在多箱重复，按代码+时间+地点+描述去重），共享 `timeline-nodes.ts` + `tracking-timeline.vue`，无新增请求。详见 `changelogs/change-log-2026-08-16-tracking-timeline.md`。 |
| 2026-08-16 | `Feature` | 「运踪」Tab 与基础信息单票订阅按钮按打包品牌分流：sjtd 保持原运踪面板与订阅；其他品牌换成新服务商面板（摘要、全量异常预警明细、轨迹地图、刷新运踪）与新服务商订阅。 | Tab 内容改为 `components/tracking/container-tracking-panel.vue`（`load-detail` 模式自取详情以拿全量预警，另读本地快照补箱清单与轨迹页链接），与列表运踪弹窗共用同一面板；开关取 `utils/tracking-brand.ts`。「刷新运踪」走订阅接口（服务商订阅与查询同一接口，重复调用等同刷新快照）。详见 `changelogs/change-log-2026-08-16-tracking-vendor-brand-split.md`。 |
| 2026-08-16 | `Fix` | 头部业务来源改为可下拉选择；选委托单位仍自动带出，允许再改。 | 见 `changelogs/change-log-2026-08-16-sea-export-code-source-select.md`。 |
| 2026-08-16 | `Feature` | 船名/航次右侧新增「码头船舶」按钮（仅编辑态）：命中唯一一条直接回填并刷新单据，多条时弹窗单选后再同步。 | 共享 `src/components/terminal-schedule/`（composable + 单选弹窗）与海进复用；`applied` 才刷新，`needSelect` 时后端一字未写。顺带把 `vessel` 的 `componentProps` 工厂从 schema 初始化与 `applyServiceLockedFields` 两处收敛为 `buildVesselComponentProps`。详见 `changelogs/change-log-2026-08-16-terminal-schedule-sync.md`。 |
| 2026-08-10 | `Fix` | 头部业务来源改为固定宽只读文案，消除带出/回显时布局抖动。 | 回填改读 `codeSource.cnName`（不再用已删除的 `codeSourceName`）。详见 `changelogs/change-log-2026-08-10-sea-export-code-source-layout-jitter.md`。 |
| 2026-08-10 | `Fix` | 保存必填失败时 toast 点名缺失字段；头部归属组织补 `*`；换销售带出组织防竞态。 | 新建/编辑共用 `use-sea-export-submit`；`UserOrgSelect` 一次写入。详见 `changelogs/change-log-2026-08-10-sea-export-required-field-toast.md`。 |
| 2026-08-10 | `Refactor` | 业务字典/签单方式/分单往来与港口/派车车队改读 SimpleDto；费用箱型名读 `ctnCode.ctnName`。 | 契约去掉平铺 Name；分单编辑将对象拍平为表单展示名。详见 `changelogs/change-log-2026-08-10-foreign-key-simple-dto-alignment.md`。 |
| 2026-08-09 | `Feature` | 箱型箱量支持「批量新增」：全量启用箱型 + 搜索 + 按数量一次生成多行。 | 共用 `order-ctn-table.vue`；对应 TAPD `#1161580498001000694`。详见 `changelogs/change-log-2026-08-09-sea-export-ctn-batch-add.md`。 |
| 2026-08-09 | `Fix` | 费用表带汇率时应收/应付取反修复：应收取 `drValue`、应付取 `crValue`。 | `adapter/vxe-table.ts` 的 `FeeCodeSelect` / `CurrencySelect` 渲染器把 `props?.type`（0 应收 / 1 应付）当布尔用，0 落到 else 分支导致口径互换；改判 `Number(props?.type) === 1`。历史已录费用行不会自动纠正。详见 `changelogs/change-log-2026-08-09-order-fee-exchange-rate-dr-cr-fix.md`。 |
| 2026-08-09 | `Refactor` | 费用 Tab 的费用代码/币别/结算对象列全部改读嵌套对象；更改单费用汇总同步。 | `OrderFeeDto` 删六个平铺外键新增 `feeCode`/`currency`/`settlement`：vxe 列 `field` 改点号路径、`all-order-fee-table` 的 `formatter`、`submission-order-fee-table` 的 `dataIndex` 数组路径、`useOrderFeeData` 币别聚合均同步。Handsontable 的结算对象缓存键由 `row.settlementName` 改为私有 `row.__settlementName`，读取顺序 `settlement?.name ?? __settlementName`。详见 `changelogs/change-log-2026-08-09-order-fee-statement-foreign-key-objectification.md`。 |
| 2026-08-09 | `Fix` | AI 识别回填六段港口备注及收货地/中转港 Id（与新建页共用）。 | `buildAiExtractFormPayload` 补 `assignScalar`；对应 TAPD `#1161580498001000737`（1）。详见 `changelogs/change-log-2026-08-09-sea-export-ai-extract-port-remarks.md`。 |
| 2026-08-08 | `Fix` | 集装箱合计栏增加体积汇总。 | `ctnSummary` 累加 `volume`。详见 `changelogs/change-log-2026-08-08-sea-export-ctn-summary-volume.md`。 |
| 2026-08-08 | `Fix` | 基础信息保存成功后，费用/更改单 Tab 用最新详情整体替换订单摘要；并清理费用联动订单详情缓存。 | `loadEditData` 返回 DTO → `onSaved`/`emit('saved')` → `editor.savedDetail` → `:latest-detail`；`clearOrderDetailCache` 同时清字符串/数字键。详见 `changelogs/change-log-2026-08-08-edit-workspace-saved-detail-sync.md`。 |
| 2026-08-07 | `Feature` | 港口详情对接后端对象化；编辑回填整对象注入 PortSelect，航线/国家改读目的港嵌套字段。 | 新增 `PortCodeSimpleDtoForOrder` 与 `toPortObjectSelectedItems`；扁平 `*Name`/`*EdiCode` 标废弃。详见 `changelogs/change-log-2026-08-07-sea-export-port-objectification.md`。 |
| 2026-08-05 | `Style` | 截 VGM→截港日期、截舱单→截关日期；船期时间轴右侧顺序改为截单→截港→截关。 | 仅改 i18n 与 `shipment-time-pos` 字段顺序；API 字段名不变。详见 `changelogs/change-log-2026-08-05-sea-export-cutoff-labels-order.md`。 |
| 2026-08-04 | `Fix` | 运踪里程碑「已完成」改仅用 `actualityTime` 判断，不再用 `isCurrent` 显示「进行中」。 | `getOceanNodeVisual` 去掉 `isCurrent` 优先分支；无实际时间时仍按预计/计划展示。详见 `changelogs/change-log-2026-08-04-yundang-ocean-node-completed-by-actuality-time.md`。 |
| 2026-08-02 | `Feature` | 页头委托编号旁新增刷新按钮，一键调 `UpdateCommissionNumAsync` 由后端重新生成并替换旧编号（仅编辑态、需编辑权限）。 | 新增 `updateSeaExportCommissionNum(id)`（PUT，仅传 id，出参为新编号）；`commissionNum` 属提交 DTO 字段，改写会污染脏检查快照，故仅在原本无未保存修改时 `syncFormSnapshot()` 重置基线；失败提示交由全局拦截器展示 ABP 报错。详见 `changelogs/change-log-2026-08-02-sea-export-regenerate-commission-num.md`。 |
| 2026-07-31 | `Feature` | 干系人可选角色改由枚举 `SeaExportUserAttribute` 配置（`extra1` 控制是否默认展示），不再写死 6 项；销售/操作固定兜底且不可删。 | 新增共用 `composables/use-order-user-roles.ts`（枚举名按 bizType 映射、`syncOrderUserRows` 补行排序）；`use-order-users.ts` 删除 `orderUserRoleOptions`/`defaultOrderUsers`，「海外客服有人才显示」泛化为「非默认展示角色无人不显示」；角色异步到位后 watch 补行，快照前 `await whenOrderUserRolesReady()` 防误报未保存。详见 `changelogs/change-log-2026-07-31-order-user-role-enum.md`。 |
| 2026-07-30 | `Refactor` | 委托单位变更改走 `Client/GetDishonestStakeholdersAsync` 带出业务来源（编辑态）/干系人（仅新建态），不再调 `ClientAdmin/DetailAsync`。 | 共用 `form.vue`/`use-order-users.ts`；详见 `changelogs/change-log-2026-07-30-sea-export-client-dishonest-stakeholders.md`。 |
| 2026-07-26 | `Feature` | 干系人用户信息改为 `User/GetUserListByIdsAsync` 一次批量获取；悬停卡片副标题改为组织路径；启停用读 `enable`；未命中 id 仍展示「已删除」兜底。 | `getUserListByIds` 使用 `paramsSerializer: 'repeat'`；`use-order-users` 以 `loadOrderUserDetailsByIds` 替代逐个 `getUser`；无有效 id 不发请求以免空 ids 拉全量。详见 `changelogs/change-log-2026-07-26-sea-export-order-users-batch-get.md`。 |
| 2026-07-25 | `Fix` | 移除基础信息滚动与顶部 Tab 联动；隐藏 Tab key 不再参与记忆恢复，避免空白页。 | 分区 Tab 隐藏后 `onSectionChange` 仍把 `shipment`/`port` 写入 `activeTab` 且无面板；表单侧 scroll 监听与 `sectionChange` 一并删除。详见 `changelogs/change-log-2026-07-25-sea-export-remove-section-tab-sync.md`。 |
| 2026-07-25 | `Perf` | 箱型选择从 `CtnSelect` option 取名称写入行，选中时不再请求箱型详情 | 原路径：只写 `ctnCodeId` → `syncCtnNameMap` 缺名打 `DetailAsync`；现 `@change` 同步 `ctnCodeName` + 本地汇总 map |
| 2026-07-25 | `Parsing` | 无 | 运踪订阅字段独立清单：请求仅 `seaExportIds`；编辑页行上下文仅结果展示。详见 [yundang-subscribe-fields.md](./yundang-subscribe-fields.md)。 |
| 2026-07-24 | `Feature` | 「AI识别」改为点击弹窗拖拽上传，放入文件后自动开始识别，成功回填后关窗。 | 与新建页共用 `ai-extract-upload-modal.vue` + `recognizeAiFile`。详见 `changelogs/change-log-2026-07-24-sea-export-ai-extract-drag-upload-modal.md`。 |
| 2026-07-24 | `Refactor` | 基础信息/分单/费用/更改单对接往来单位与船公司对象化；结算对象名称映射改读 `client?.name` 等。 | 扁平 `*Name` 已删；`carrierLogo` 仍同级。详见 `changelogs/change-log-2026-07-24-sea-export-party-carrier-objectification.md`。 |
| 2026-07-24 | `Fix` | 已选委托单位但无业务来源时改为纯文本「-」，不再渲染禁用下拉占宽。 | `showCodeSourceEmptyDash` 控制分支。详见 `changelogs/change-log-2026-07-24-sea-export-code-source-empty-dash.md`。 |
| 2026-07-24 | `Fix` | 打印导出改为静默下载；文件名清洗仅去掉末尾纯数字时间戳，避免友好名含 `-` 时 404。 | PDF 复用预览原始文件名；`downloadFileFromBlob`。详见 `changelogs/change-log-2026-07-24-print-format-silent-download.md`。 |
| 2026-07-24 | `Fix` | 委托单位带出业务来源时仅传 id，名称由 `CodeSourceSelect` 自拉取；头部来源下拉 placeholder 字号缩小。 | `applyClientCodeSource` 不再拼 `client.codeSource.cnName`。详见 `changelogs/change-log-2026-07-24-sea-export-code-source-self-fetch.md`。 |
| 2026-07-24 | `Feature` | 基础信息新增合同号；头部「归属组织」改用按销售绑定的 `UserOrgSelect`；复制摘要含合同号。 | 字段挂 `transportOrder.contractNum`；`selectedItems` 兜底 `orgs` 路径回显。详见 `changelogs/change-log-2026-07-24-sea-export-contract-num.md`。 |
| 2026-07-21 | `Feature` | 分单弹窗按业务动线重组；新增默认仅带条款+箱，收发通/货描需手动「读入主单」。 | 船期港口默认折叠；付费地点归运费条款。详见 `changelogs/change-log-2026-07-21-separate-bill-workflow-layout.md`。 |
| 2026-07-21 | `Style` | 国外代理（podAgent）从通知人标签中独立，置于通知人下方；文案用 `overseasAgent`。 | 字段仍为 `podAgentId`/`podAgentContent`。 |
| 2026-07-21 | `Style` | 目的港代理并入左侧通知人同槽标签切换（通知人/第二通知人/目的港代理）。 | 对齐基础信息收发通交互。 |
| 2026-07-21 | `Style` | 签单方式移入「签单信息」区，与签单日期/地点同组。 | 右上元数据区不再放签单方式。 |
| 2026-07-21 | `Style` | 分单去掉「来自主单，只读」文案；只读字段改为纯文本展示，不再用禁用输入框。 | 详见 `changelogs/change-log-2026-07-21-separate-bill-readonly-display.md`。 |
| 2026-07-21 | `Feature` | 分单通知人/第二通知人改为标签切换（默认通知人，第二通知人只读主单），对齐基础信息展示形式。 | 同槽位切换，不占双栏高度。 |
| 2026-07-21 | `Feature` | 分单只读补齐订舱号/船公司/ATD/ETA/中转港/第二通知人；新增弹窗默认静默读入主单。 | 第二通知人仅展示不入库。详见 `changelogs/change-log-2026-07-21-separate-bill-master-readonly-expand.md`。 |
| 2026-07-21 | `Feature` | 分单弹窗展示主单只读船期/港口/主提单号/提单份数；「读入主单」复制收发通、代理、条款、货物与装箱。 | 只读不写分单 DTO；截关用 `closingTime`。详见 `changelogs/change-log-2026-07-21-separate-bill-master-readonly.md`。 |
| 2026-07-21 | `Feature` | 分单弹窗按截图重组：左收发通、右元数据+代理+装箱、中签单、下唛头/货描/件毛体；装箱「更新合计」回填件数/毛重/体积。 | 仅布局与本地合计；未接主提单号/船期港口/读入主单。详见 `changelogs/change-log-2026-07-21-separate-bill-modal-layout.md`。 |
| 2026-07-21 | `Fix` | 内部备注与外部备注均读写 `TransportOrder`：`internalRemark` / `remark`；外部备注不再走海出根级 `remark`。 | 提交 `buildSeaExportDto`、详情 `flattenDetail`、AI 提取三处对齐；详见 `changelogs/change-log-2026-07-21-sea-export-remark-transport-order.md`。 |
| 2026-07-25 | `Fix` | 打印预览/导出 PDF 静态地址强制后端端口，不再走前端同源 `/PrintTempFile`。 | `buildStaticFileUrl` 禁止回退 `window.location.origin`；`downloadPrintFile` 仅 fetch 后端绝对 URL。见 `changelogs/change-log-2026-07-25-print-format-backend-static-url.md`。 |
| 2026-07-21 | `Feature` | 普通费用打印支持勾选传 `orderFeeListInput.ids`（未勾选仍打整票）；打印弹窗底部改为分裂式「打印」按钮；点击打印 PDF 新窗口打开。 | Handsontable 费用表须显式传 `selectedFeeIds`，否则 `GetPrintAsync` 请求体无 `ids`；`DropdownButton` 替代悬停下拉；PDF 由 `downloadFileByUrl` 改为 `window.open`。 |
| 2026-07-20 | `Feature` | 详情打印与应收/应付费用打印改为后端自动取数：详情打印传 `detailInput={id}`，费用打印按 `transportOrderId` 取数（可附 `ids`）；更改单 Tab 放开打印入口；模板列表按当票签单方式/船公司/分公司筛选；未保存修改仅提示「使用已保存数据」。 | 全局打印 `openPrint` 由 `{printJsonType,json}` 重构为 `{printJsonType,codeIssueTypeId,carrierId,orgId,detailInput,orderFeeListInput,isChangeOrderPrint}`；`loadTemplates` 走非管理端 `PrintFormat/GetPagedListAsync`，取数走 `PrintFormatAdmin/GetPrintAsync`；返回文件名含 `-` 时截断保留扩展名（`cleanReturnedFilename`）。详见 `changelogs/change-log-2026-07-20-print-format-backend-fetch-getprint.md`。 |
| 2026-07-14 | `Fix` | 销售/操作显示必填标识；截关日期不得晚于开船/实际开船；预付/到付自动覆盖为起运港/目的港；新增箱行默认复制总包装 ID 与文本。 | 总包装与箱行包装使用同一包装基础资料，但分别保存于 `transportOrder.codePackageId` 与 `orderCtns[].codePackageId`；选择组件通过 `change(value, option)` 提供文本，避免新增行再请求详情。 |
| 2026-07-14 | `Fix` | 修复文本字段（收货人/发货人/通知人内容、各备注）「输入后又删空」恢复原状，切标签/跳转仍被误拦的问题。 | 脏检查比对由裸 `JSON.stringify` 改为经 `normalizeForDirtyCheck`（`undefined`/`null`/`''` 等价、递归 + 键排序）的 `stableDtoJson`；`syncFormSnapshot`/`isFormDirty` 共用，提交侧 `buildDto` 不变。详见 `changelogs/change-log-2026-07-14-sea-export-dirty-check-empty-value-normalize.md`。 |
| 2026-07-14 | `Feature` | 编辑工作台有未保存修改时，切标签页/点菜单跳转/关闭当前标签/浏览器后退弹二次确认，确认才离开；无论停留在哪个内部标签都以基础信息表单脏状态为准。对应 TAPD `#1161580498001000498`。 | 接入全局工具 `useUnsavedGuard`（详见 `modules/shared/unsaved-guard.md`）：`editor.vue` 以 `() => formRef.value?.isFormDirty?.()` 登记，`FormExpose` 补 `isFormDirty`；嵌入 `form.vue` 以 `enabled: () => !props.embedded` 关闭自身守卫，避免重复登记。编辑保存走 `loadEditData` 末尾 `syncFormSnapshot` 刷新基线，无跳转不会误拦。 |
| 2026-07-14 | `Feature` | 附件 Tab 支持回改已上传附件的「客户可见」：文件项 `Switch` 单条切换、卡片标题行 `Checkbox` 按类型批量切换（全选/半选），加载时按 `item.clientVisible` 回显。 | 新增 `api/system/attachment.ts` 封装 `Attachment/UpdateAttachmentItemsClientVisibleAsync`（**PUT**，非需求文档写的 POST）；入参 `[{ id, clientVisible }]` 的 `id` 为 `AttachmentItemDto.id`（≠删除用的 `attachmentId`）；标题行 `Checkbox` 语义由「上传默认值」升级为「类型全部可见 + 上传默认值」，`groups` 深层响应式直接改 `item.clientVisible` 回显。 |
| 2026-07-14 | `Feature` | AI 识别上传放开 Word/Excel/RTF（doc/docx/xls/xlsx/rtf），与原有 PDF/图片一并可选。 | 与新建页共用 `AI_EXTRACT_ACCEPT` / `isAiExtractSupportedFile`；识别仍走 TextIn，Office 效果依赖后端能力。 |
| 2026-07-12 | `Feature/Fix` | 打印弹窗：模板改标题行下拉、默认不选（选后才渲染 PDF）、窗口加大（1200 宽 / 76vh 高）；修复本地开发 PDF 静态地址落到 localhost 无法加载。 | 移除左侧 `RadioGroup` 两栏布局，`Modal #title` 内嵌模板 `Select`；`loadTemplates` 不再自动选首个/预览；新增 `getStaticFileOrigin`/`buildStaticFileUrl` + `.env.development` 的 `VITE_GLOB_STATIC_URL`，`resolvePrintFileUrl` 改用之直连后端静态目录。 |
| 2026-07-12 | `Style` | PDF 弹窗预览（附件 / 打印）隐藏浏览器自带工具栏与左侧缩略图分页，只显示正文。 | 统一 `buildPdfEmbedUrl` → `#toolbar=0&navpanes=0`；仅绑 iframe，下载/新窗口仍用原始 URL。 |
| 2026-07-12 | `Fix` | 保存时带回场站联系人/邮箱/手机/电话，避免编辑保存后被空覆盖。 | 四字段仅存 `entrustReadonlyInfo`，须同时改 `collectCurrentFormValues` 与 `buildSeaExportDto`；Add/Edit DTO 类型对齐 OpenAPI。 |
| 2026-07-12 | `Fix` | 基础信息区补齐「订舱代理」字段（新建/编辑共用），可选行业类别为订舱代理的客户并随单保存。 | 根因：`bookingAgentId` 仅在 `SHIPMENT_MOVED_TO_BASIC` 剔除船期区，未进 `BASIC_MODULE_EXTRA_FIELD_NAMES` 迁入基础信息；回显 `selectedItems` 同步改挂 `basicInfoFormApi`。 |
| 2026-07-12 | `Feature/Fix` | 场站联系人移至「场站」字段标签右侧，悬浮展示邮箱、手机、电话；删除右侧独立场站信息卡片，并修复详情已返回联系人但标签未显示。 | 联系方式继续复用详情只读字段与 `entrustReadonlyInfo`，不进入保存 DTO；场站标签使用正式 `defineComponent` 组件，在初始 schema 和详情 `updateSchema` 时显式绑定，避免 DOM 注入受动态表单 patch 清除。 |
| 2026-07-12 | `Feature` | 配置服务项目弹窗按「主流程 / 非主流程」分组展示。 | 流程分类来自 `ServiceType` 枚举子项 `extra1`；弹窗分组与任务 `sortId` 推进保持独立。 |
| 2026-07-12 | `Feature`/`Fix`/`Perf` | ①应收应付费用新增/删除后，顶部「应收应付 x - y」Tab 数字实时刷新；②订单信息卡片「船公司」改显中文简称 `carrierCnShortName`（兜底全称），应收应付与更改单页一致；③消除进入更改单/应收应付 Tab 时 `DetailAsync` 被请求 3 次的冗余。 | ①`order-fee-table.vue` 经 `sync-fee` 上抛行数→`orderFee/index.vue` 汇总为 `fee-count-change`→`editor.vue` `setFeeNumber` 更新 Tab 标签（计数含未保存新建行，属即时反馈）；②`displayList` `carrierName` 分支改 `carrierCnShortName |  | carrierName |  | '--'`；③三次来源：父页 `loadSeaExportData`1 次 + 两个`order-fee-table`各`onMounted`拉 1 次。改为`order-fee-table`新增`orderDetail`prop，由父组件`:order-detail="formValues"`传入并`watch(immediate)` 应用箱型/基础数据，`onMounted` 不再自请求；切换单据（`editId`变化）时仍强制拉一次防`KeepAlive` 旧值；`openBatchImportModal`复用`orderBaseData`。 |
| 2026-07-12 | `Feature` | 全局打印弹窗升级为「PDF 预览 + 多格式导出」：选模板后自动拉 PDF 用 iframe 预览，底部下拉选 PDF/Excel/Word 导出——PDF 下载、Excel/Word 新窗口打开。详情打印与费用打印透明复用。 | 后端 `PrintAsync` 新增 `format`（`PrintExportFormat` 0/1/2）；前端 `types.ts` 加枚举、`GetPrintFileDto` 加 `format`、`use-print-format.ts` + `print-format-modal.vue` 重构；`openPrint` 签名不变。端到端预览待后端稳定后实测。 |
| 2026-07-12 | `Fix` | 恢复应收应付费用表「打印」按钮：勾选已保存行后按应收 `1000` / 应付 `1500` 打开全局打印；未保存行拦截；更改单模式不展示。同日二次修复「点了没反应」：打印按钮去掉 `:disabled`，未勾选时提示「请先勾选要打印的费用」（原引用了不存在的 i18n key `common.selectDataFirst`）。 | `74d0eabf` 改费用表时误删；按 `f071268c` 恢复，且不回退 checkbox `trigger: 'row'`。浏览器实测：勾选→弹出「选择打印模板」可打印。 |
| 2026-07-12 | `Feature` | 附件 Tab 文件项将大小、上传人、上传时间合并为一行展示；预览弹窗工具栏同步展示上传人和上传时间，空值分别隐藏。 | 上传人对接 `AttachmentItemDto.creatorUserName`，时间取 `creationTime` 并经 `formatDateTime` 格式化；`AttachmentViewerModal` 新增可选的 `uploader` / `uploadTime` props，不影响其他调用方。 |
| 2026-07-12 | `Feature` | 船名/航次宽度 3:2；运输条款与贸易条款合并为一项（1:1）；签单地点/日期表单与费用/更改单左侧面板隐藏；顶部预留 Tab（服务详情/单证信息/问题记录/修改历史）暂时隐藏。 | 新增 `ServiceTradeTermsInput`；`VesselVoyageInput` 支持 `mainRatio`/`secondRatio`；`codeServiceId` 回显补丁须保持函数式 `componentProps`。 |
| 2026-07-12 | `Feature` | 基础信息右侧拆为上下两卡：上「干系人」、下只读「场站信息」（联系人/邮箱/手机/电话）；详情回填，不参与保存。 | `SeaExportDto` 补齐四字段；`flattenDetail` + `entrustReadonlyInfo` 承载；`right-column` 改为纵向 flex 容器。 |
| 2026-07-13 | `Feature` | 云当运踪推送信息全字段对接：类型补全到后端契约全集；面板新增「航段」Tab、运单概要补充 AIS/首次 ETA/交货地及其 ETA·ATA/备注；集装箱补件数/毛重/VGM、甩柜异常 Tag、免箱期费用表。 | `yundang-admin.ts` 按文档 §5–10 补全 DTO；`yundang-tracking-panel.vue` 新增航段 Tab 与扩展字段展示；箱费用后端字段名为 `charges`（非上游 `chargeDatas`）。 |
| 2026-07-13 | `Style` | 运踪面板移除里程碑「进度 count/total」与箱轨迹「来源」展示，降低时间轴信息密度。 | 删除 `translateSource` 与相关 i18n；`resolveRolledTag` 改为返回带 `show` 的对象，避免模板非空断言。 |
| 2026-07-13 | `Fix` | 集装箱轨迹状态不再前端推断「进行中/已完成」；不做蓝色当前高亮，仅 `isEstimate` 展示「预计」。 | `getContainerStatusVisual` 仅区分 `isEstimate`；标题仍用 `statusDesc`。 |
| 2026-07-13 | `Fix` | 运踪里程碑与集装箱轨迹取消前端排序，完全按 `GetOceanPushInfoAsync` 返回顺序展示。 | `yundang-tracking-panel.vue` 移除 `oceanNodes` 的 `actualityTime` 排序与 `sortContainerStatuses`。 |
| 2026-07-12 | `Fix` | 运踪里程碑：仅按 `actualityTime` 升序排列；无实际时间且非当前节点不再显示「未到」，仅保留节点名称（可能为非适用服务点）。（已被 2026-07-13 取消前端排序取代） | `yundang-tracking-panel.vue` 移除 `pending` 状态；无时间时不渲染状态胶囊与时间行。 |
| 2026-07-12 | `Feature` | 附件 Tab 改为卡片网格（一行 3 个）：标题行合并客户可见与上传；点击文件全局弹窗预览（PDF iframe / Office embed.aspx / 图片直显）；默认客户不可见；支持 webp/svg/ppt 等格式上传；「添加其他类型」并入网格末尾虚线卡片。 | 新增 `attachment-viewer-modal.vue`；`attachments/index.vue` 移除 Table 改卡片列表；`getClientVisible` 默认 `false`；`ALLOWED_TYPES` 扩展图片与 Office 后缀。 |
| 2026-07-12 | `Fix` | 编辑态干系人：销售/商务/操作/客服/单证五个默认岗位始终显示——订单未保存某默认角色时补一张空卡（此前编辑态只按已存数据渲染，如缺「商务」会漏卡）；海外客服仍「有值才显示」不变。 | `use-order-users.ts` 的 `createOrderUserRows` 编辑分支：映射+海外客服过滤后，用 `presentRoles` 计算缺失默认角色并补空行，再按 `defaultOrderUsers` 顺序排序（非默认角色/海外客服排其后）；空卡无 `userId`，保存时被 `sanitizeOrderUsers` 过滤不写库。 |
| 2026-07-11 | `Style` | 运踪 Tab：里程碑/集装箱时间轴改为水平展示；运踪页白底铺满。 | `yundang-tracking-panel.vue` 新增 `track-timeline--horizontal`；集装箱轨迹按时间升序左→右，最新节点标记为「进行中」。 |
| 2026-07-11 | `Feature` | 干系人面板默认固定展示销售/商务/操作/客服/单证；海外客服无值不展示；新建态按委托单位绑定干系人默认回填，操作/单证/客服未绑定兜底当前账号；委托单位与起运港加必填标识。 | `use-order-users.ts` 新增 `applyClientDefaultOrderUsers`；`form.vue` 在新建态 `clientId` onChange 调 `getClientDetail`；`data.ts` 为 `clientId`/`polId` 设 `selectRequired`。 |
| 2026-07-11 | `Feature` | 编辑工作台新增「运踪」Tab（点击直接查看运踪信息）；运踪详情去除与顶部基础信息重复的「航段」Tab；基础信息顶栏移除「查看运踪」按钮。 | 抽取 `yundang-tracking-panel.vue` 供弹窗与 Tab 复用；Tab 侧传 `resolve-state-from-subscription`，四态由 `pushInfo.subscription` 推导；`editor.vue` 新增 `tracking` TabKey。 |
| 2026-07-11 | `Style` | 箱型箱量表格列宽优化：收窄序号/箱型列，加宽箱号/封号列。 | 共用 `order-ctn-table.vue`；列宽通过 `tableColumns.width` 与 `order-ctn-table__*-col` CSS 双处固定。 |
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
