---
title: 业务联系单编辑（含新建与审核）
module: 业务联系单
author: 前端团队
last_updated: 2026-08-02
---

# 1. 业务背景说明 (Background)

**白话解释：** 这一页是业务联系单的全生命周期工作台。销售在这里录入意向业务的单据信息、干系人、箱型箱量、要做哪些服务、报价多少，然后提交审核；审核人在同一页做通过或驳回；通过后系统生成海运出口单，页面出现第二个 Tab，可以直接在里面编辑那张海运出口。

`/pre-order/add`（新建）与 `/pre-order/:id/edit`（编辑/查看）复用 `editor.vue`。表单控件不按状态禁用；仅「录入 / 驳回」显示「保存」「提交审核」，待审核/通过只保留审核相关按钮。历史 `/detail` 路由重定向到 `/edit`。

# 2. 功能与操作说明 (Features & Operations)

- **Tab 结构：** 编辑态顶部 Tab 样式与海运出口编辑器一致；新建态尚无关联海运出口，隐藏顶部仅有的「业务联系单」Tab。
  - **业务联系单**（内部 `activeTab = 'basic'`）：布局对齐海运出口基础信息页——顶部左侧服务项目 chevron 流水线（配置弹窗勾选主流程），右侧操作按钮；分区标题文案为「业务联系单」，meta 区展示业务编号/状态并内嵌「归属组织」「业务类型」「装运方式」选择器；主栏分区（单据字段 + **收发通**（发货人/收货人/通知人各一组 id + Content，布局对齐海出 party-flow；**可点击标题栏展开/折叠，默认折叠**）+ 港口信息，港口区为海出同款 5 列流转卡片：收货地 → 起运港 → 中转港（Tab 切 1/2） → 目的港 → 交货地，每个节点下方带备注）+ 下方「货物与箱型」（标题栏内联货物类型/品名；卡片内左右分栏：左箱型箱量表 + 右竖排件数/包装/毛重/尺码）、费用卡片、附件卡片；右侧干系人角色按所选业务类型从枚举读取（销售固定），每行带用户头像。
  - **关联海运出口**：仅在状态为「通过」且存在 `transportOrderId` 时出现，内嵌完整可编辑的海运出口编辑器。
- **保存：** 校验四段表单（基础 / 收发通 / 港口 / 货物）+ 干系人规则后调用 `AddAsync` / `EditAsync`（含 `attachmentGroup` 全量覆盖）。新增成功后 `replace` 到编辑路由并重新拉详情。
- **附件：** 费用区下方「附件」卡片；先 `Upload/UploadFile` 拿 `attachmentId`，本地写入分组；保存时随 Add/Edit 提交。附件类型按 `ModuleTypeId=160050` 调 `AttachmentDtlType/GetListByModuleTypesAsync`。录入/驳回可增删；待审核/通过只读展示。
- **提交审核：** 二次确认后调用 `SubmitAsync`，进入「待审核」后隐藏保存/提交按钮。
- **撤回：** 「待审核」状态下调用 `UnSubmitAsync` 回到「录入状态」，重新显示保存/提交。
- **审核通过 / 审核驳回：** 「待审核」状态下弹窗填写意见；通过时若缺少「操作」干系人，弹窗强制先指派。
- **审核后驳回：** 「通过」状态下可用，二次确认提示必须先删除关联海运出口。
- **审核流程：** 任意已保存单据可点「审核流程」，复用 `workflow-timeline`，`taskType = TaskType.PreOrder(8)`。
- **复制预填：** 带 `?copyFrom=<id>` 进入新建页时拉源单详情预填，清掉单号与子表主键。
- **按钮权限：** 保存 / 提交审核 / 撤回按 `Admin.PreOrder.Add`、`Admin.PreOrder.Edit` 控制；三个审核类按钮需要 `Admin.PreOrder.Audit`。
- **费用工具栏：** 可编辑时提供单一「添加」与「删除」icon 按钮（样式对齐海运出口箱型箱量）；新增行默认应收 + USD + 汇率 + 单位「票」，收付在行内切换；费用代码带出类别/结算/币别/税率/单位；单位可选票·重量·体积·TEU 或本单箱型名，数量只读并由单位自动带出；须先勾选行再删。
- **一键生成海运费：** 箱型箱量表工具栏「生成海运费」按钮（未选箱型时禁用）按箱型铺应收费用——每个箱型一行，收付=应收、费用代码=海运费、单位=箱型名、数量=箱量、含税单价=卖价，结算对象类别/结算对象/税率/币别/汇率仍按费用代码带出。同箱型多行会合并（箱量累加、卖价取首个非空）；重复点击按「应收 + 海运费 + 同箱型」覆盖旧行，不会重复累积；卖价为空时单价按 0 生成并提示。
- **费用体检：** 保存时对费用行做非阻断提示；**提交审核前硬拦截**「收付/费用代码/币别缺失」与「单位不可识别」的行（这些行会被后端静默丢弃或算成 0），数量为 0 的行只提示不拦截。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| —— | 销售点「保存」新建 | 录入状态(0) | 单号由后端生成 |
| 录入状态(0) | 点「提交审核」 | 待审核(1) | 若未配置审核流，后端直接置为「通过」并生成海运出口 |
| 待审核(1) | 提交人点「撤回」 | 录入状态(0) | 恢复可编辑 |
| 待审核(1) | 审核人点「审核通过」 | 通过(2) | 生成海运出口单、服务项、费用并复制附件 |
| 待审核(1) | 审核人点「审核驳回」 | 驳回(3) | 恢复可编辑，可改后重新提交 |
| 通过(2) | 点「审核后驳回」 | 驳回(3) | **必须先删除关联海运出口**，否则后端拒绝 |
| 驳回(3) | 点「提交审核」 | 待审核(1) | 重新走审核 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **归属组织** | 数据权限归属 | **组织**<br/>`UserOrgSelect`（位于标题 meta 区，不在表单内） | **依赖：** 取干系人「销售」所属组织范围；选中销售后自动带其默认组织；更换销售时清空并重带默认；编辑回显用详情 `orgs` 路径兜底展示 | **必填**（保存前手动校验，非表单 rules） |
| **委托单位** | 业务委托方 | **客户**<br/>`ClientSelect` | **触发：** ① 变更后重算服务项候选池（客户排除项）；② 可编辑态按其维护的销售/客服/操作/单证默认回填干系人（无默认取列表第一个；操作/单证/客服未绑定时兜底当前登录账号；商务等未维护角色保持原值）<br/>**回显：** 详情 `client` 经 `toSelectedItems(clientId, client.name)` 注入 `selectedItems`，与收发通/海出口径一致 | **必填** |
| **船公司** | 承运船公司 | **基础数据**<br/>`CarrierSelect` | **回显：** 优先复用详情 `carrierLogo`；缺少时补拉船公司详情，并把完整对象写入 `selectedItems`，与海运出口一致展示 Logo | 非必填 |
| **贸易条款 / 付费方式** | 贸易责任与运费支付方式 | 贸易条款字典 / `CodeFrtSelect` | **展示：** 两项下移到基础信息末段、备注之前；空值统一显示「请选择」 | 非必填 |
| **发货人 / 收货人 / 通知人** | 收发通往来单位 | **客户**<br/>`ClientSelect`（行业类别 b / e / h） | **回显：** 详情 `shipper` / `consignee` / `notifier` 经 `selectedItems` 注入 | Guid?，非必填 |
| **shipperContent / consigneeContent / notifierContent** | 对应往来单位提单内容文本 | 手填（`EnglishUpperTextarea`） | 与 id 成对提交；详情原样回填 | 最长 1024，英文自动半角大写 |
| **起运港** | POL | **港口**<br/>`PortSelect` | **触发：** 变更后重算服务项候选池；为空时服务项区不可用 | **必填**（后端生成海运出口时也校验） |
| **中转港1 / 中转港2** | POT1 / POT2 | **港口**<br/>`PortSelect` | **展示：** 共用第 3 列，通过 label 内联 Tab 切换，隐藏的一侧仍保留已填值并随保存提交 | 非必填 |
| **港口备注（6 个）** | 收货地/起运港/中转港1/中转港2/目的港/交货地备注 | 手填（`EnglishUpperTextarea`） | **触发：** 选中对应港口后自动回填 `PORTNAME, COUNTRYENNAME`；手工改过的值不会被再次覆盖 | 英文自动转半角 + 大写 |
| **业务类型** | 业务联系单业务线（本期仅海运出口） | `getPreOrderBizTypeOptions`（标题 meta 区，装运方式前） | 提交写入 `bizType`；详情回填 | **必填**，默认海运出口(0)；选项表本期仅一项 |
| **装运方式** | 整箱 / 拼箱等 | `getBlTypeOptions`（标题 meta 区选择器） | —— | **必填**；新建默认空，保存前须选择 |
| **货物类型** | 普货 / 冻柜 / 危品等 | `getCargoTypeOptions`（复用海运出口） | **展示：** 「货物与箱型」卡片标题栏内联，与海出一致 | **必填**，默认 0（普通货） |
| **品名** | 货物品名（可多选） | **基础数据**<br/>`CodeGoodsSelect`（`showNameWithHsCode`） | **展示：** 与货物类型同处标题栏内联；表单值为 `number[]`，提交映射为 `preOrderCodeGoodss` | 非必填 |
| **干系人（角色清单）** | 面板上有哪些角色卡、「+ 添加角色」能选什么 | **枚举**<br/>按业务类型取 `SeaExportUserAttribute`（`bizType=0`）/ `SeaImportUserAttribute`（`bizType=1`）；子项 `value`=`UserAttribute` 位值、`displayName`=角色名、`enable`=是否可用、`extra1`=是否默认展示，子项顺序即面板顺序 | **触发/依赖：** 切换「业务类型」后重新拉取；新枚举里不存在的角色行（含已选人员）会被清掉，销售除外；详情回填**不触发**清理，历史角色保留在末尾 | 枚举未配置/拉取失败时只剩销售，属预期兜底 |
| **干系人（销售）** | 业务归属销售 | **用户**<br/>`UserSelect` | **依赖：** 固定角色，无论枚举是否配置都展示且不可删除 | **必填且只能一人** |
| **干系人（操作）** | 后续操作负责人 | **用户**<br/>`UserSelect` | **依赖：** 是否出现取决于枚举配置；录入态非必填，可空可删；审核通过前若仍缺失则弹窗强制指派（弹窗与角色配置无关，始终可指派） | 非必填；每种角色最多 1 人 |
| **箱型箱量.卖价** | 该箱型对客报价 | 手填 | **触发：** 点「生成海运费」时作为对应费用行的含税单价（不会实时联动已生成的行） | 非负 |
| **箱型箱量.箱量** | 箱数 | 手填（表头带必填星标，`min=1`） | **触发：** 单位=TEU 的费用行重新累加数量；单位=该箱型名的费用行重新取箱量合计 | **必填**；保存须至少一行且箱型已选、箱量 > 0 |
| **服务项目** | 本单要执行的主流程服务（无任务进度） | `SeaExportAdmin/GetServiceTypesByPOLAsync` ∩ `ServiceType.extra1` | **依赖：** 起运港 + 委托单位字段 `onChange` 直传；按接口 `checked` 默认带出；港口变更后不在候选池的已选项被自动剔除 | 只能是候选池子集（可少不可多）；流水线默认「未执行」样式，勿用海出「已完成」 |
| **费用.收付类型** | 应收(0) / 应付(1) | 固定选项 | **触发：** 切换后按收付重取汇率；若已有费用代码则按应收 `defaultDebitName` / 应付 `defaultCreditName` **重写**结算对象类别与结算对象，并回写费用代码税率、重算不含税单价与金额 | —— |
| **费用.费用代码** | 费用名称来源 | **基础数据**<br/>`FeeCodeSelect` | **触发：** 带出行业类别（应收 `defaultDebitName` / 应付 `defaultCreditName`）、结算对象、币别+汇率、税率、默认单位、禁开票/机密；默认单位为「箱型/CTN」或不在四项白名单时落到「票」并提示 | —— |
| **费用.结算对象类别** | 行业类别 | `IndustryCategorySelect`（存数值 key） | **触发：** 切换后先清空结算对象；`ClientSelect` 的 `industryCategory` 改为对应字母码重新过滤；若本单已录入委托单位(p)/发货人(b)/收货人(e)/通知人(h) 则直接回填，并用名称写 `selectedItems`（走往来单位名称缓存，避免二次拉详情） | —— |
| **费用.结算对象** | 客户 | `ClientSelect` | **依赖：** `industryCategory` 字母码过滤；回显依赖 `selectedItems`（id+name） | —— |
| **费用.币别** | 结算币别 | `CurrencySelect` | **默认：** 新增行默认 USD；**触发：** 变更后拉汇率 | 生成海出费用时缺币别会被跳过 |
| **费用.汇率** | 对本位币汇率 | 手填或币别带出 | **依赖：** 币别命中归属组织本位币时**固定 1 且只读**；否则币别/收付变更后取 `getExchangeRateDetail`（应收 `crValue` / 应付 `drValue`），可再改；归属组织变更后全表重刷 | —— |
| **费用.单位** | 计价单位 | 通用四项 `票` / `重量` / `体积` / `TEU`（`PRE_ORDER_GENERIC_UNITS`） **+ 本单箱型名**（由箱型箱量表派生） | **默认：** 手工新增「票」，一键生成时=箱型名；费用代码默认单位经 `coercePreOrderFeeUnit` 落到白名单内（泛称「箱型/CTN」→票）；**触发：** 按单位自动带出数量（见「费用.数量」） | 必须是四项之一或本单已存在的箱型名，提交审核前校验；箱型行被删除后对应费用行单位落回「票」 |
| **费用.含税单价** | 对客单价 | 手填 | —— | 非负 |
| **费用.数量** | 计价数量 | 完全由单位派生，**始终只读**（后端审核通过时按单位重算并覆盖，手改无意义） | **触发：** 票=1；重量=货物 `kgs`；体积=`cbm`；TEU=各箱型 `teu×箱量` 累加；箱型名=该箱型的箱量合计。箱型、箱量、毛重/体积变更后全表重新带量 | 非负 |
| **费用.税率(%)** | 税率 | 手填或费用代码带出 | **触发：** 重算不含税单价 | —— |
| **费用.不含税单价** | 去税单价 | 计算列 | `unitPrice / (1 + taxRate/100)`，只读 | —— |
| **费用.金额** | 含税金额 | 计算列 | **触发：** 新增行即按含税单价 × 数量重算；之后单价/税率变更、单位/收付切换、TEU 依赖的箱量同步时同步重算 | 始终只读 |
| **费用.禁开票** | 是否禁开发票 | Checkbox | **默认：** false；费用代码 `isInvoiceProhibit` 可带出 | —— |
| **费用.机密** | 是否机密 | Checkbox | **默认：** false；费用代码 `isConfidential` 可带出 | —— |
| **费用.备注** | 行备注 | 手填 | —— | 最长 4096 |
| **附件分组** | 按附件详细类型分组的文件列表 | **上传** `Upload/UploadFile` + **类型** `AttachmentDtlType/GetListByModuleTypesAsync`（`ModuleTypeId=160050`）；详情 `attachmentGroup` | **提交流程：** 先上传拿 `attachmentId`，再随 `AddAsync`/`EditAsync` 的 `attachmentGroup` 全量提交（编辑先删后建） | `attachmentId<=0` 忽略；录入/驳回可增删，待审核/通过只读 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：非录入 / 驳回不显示保存]** 状态为「待审核」或「通过」时 -> 表单控件仍可操作但不显示「保存 / 提交审核」，仅保留审核相关按钮；改动不会落库。

> [!IMPORTANT] **[卡点 2：销售必填且唯一]** 销售角色不是恰好一人，或销售未选人员 -> 保存被前端拦截并提示，不发请求。操作等其余角色可空；提交时剔除未选人员的干系人行。

> [!IMPORTANT] **[卡点 3：服务项只能少不能多]** 前端候选池与后端校验用的「最大集合」同源（起运港服务项模板按委托单位剔除排除项后，再取 `extra1` 主流程），所以勾选结果天然合法；起运港 / 委托单位变更后越界的已选项会被自动剔除。

> [!IMPORTANT] **[卡点 4：审核通过必须有「操作」干系人]** 录入态操作非必填；审核通过时若单据未指派操作人 -> 审核弹窗顶部告警，且「通过」按钮在未选人前禁用（后端缺操作人无法生成海运出口）。

> [!IMPORTANT] **[卡点 5：审核后驳回须先删海运出口]** 「通过」状态下点「审核后驳回」-> 二次确认明确提示；若关联海运出口仍存在，后端会拒绝本次操作。

> [!IMPORTANT] **[卡点 6：费用单位=四项通用枚举 + 本单箱型名]** 单位下拉给「票 / 重量 / 体积 / TEU」外加本单箱型箱量表里出现过的箱型名（后端 `ResolveQuantityByUnit` 同样识别箱型名）。箱型选项由 `props.ctns` 派生，费用表脱离箱型数据使用时下拉会退回四项；删掉箱型行后引用它的费用行会静默落回「票」、数量变 1。海出口径「毛重/尺码」经 `coercePreOrderFeeUnit` 归一为「重量/体积」；泛称「箱型 / CTN」定位不到箱量，仍落到「票」；「件数」不支持。

> [!IMPORTANT] **[卡点 7：费用三要素缺一即被静默丢弃]** 后端只转换 `feeCodeId + currencyId + paySide` 三者齐全的费用行，缺一**不报错也不生成** -> 前端在「提交审核」前用 `checkPreOrderFees` 硬拦截并逐行提示；保存草稿时只提示不拦截。

> [!IMPORTANT] **[卡点 8：数量以单位重算结果为准]** 联系单录入的 `quantity` 在转换时被完全丢弃 -> 数量列只读、恒由单位派生；箱量（影响 TEU）、货物毛重/体积变更后全表重新带量，保证「预估看到的」= 「落库算出的」。

> [!IMPORTANT] **[卡点 9：未保存拦截]** 表单内容与上次基线不一致时切标签 / 跳菜单 / 前进后退 -> 弹二次确认。脏检查比对「提交 DTO 的 JSON 快照」，基线在详情加载完成和新增后跳转前各同步一次；只读状态不参与拦截。

> [!IMPORTANT] **[卡点 11：切业务类型会清掉不适用的干系人角色]** 角色清单来自业务类型对应的枚举（`SeaExportUserAttribute` / `SeaImportUserAttribute`），用户主动切换业务类型后，新枚举里没有的角色行会被清掉（含已选人员），只有销售固定保留；详情回填时不清理，历史角色原样保留在末尾。枚举名大小写敏感，写错或未配置时面板只剩销售，属预期兜底；角色未勾 `extra1` 时只能从「+ 添加角色」手动加。

> [!IMPORTANT] **[卡点 10：服务项对比标记]** 状态为「通过」后，详情返回的服务项带 `compareStatus`：`1` 显示绿色「海运出口新增」，`2` 显示红色「海运出口删除」。其中 `compareStatus = 1` 的记录由后端以 `id = 0` 追加，回显时必须过滤掉，否则会把海运出口侧新增的服务项误写回业务联系单。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-08-02 | `Feature` | 「货物与箱型」新增「生成海运费」按钮：按箱型铺应收海运费（单位=箱型、数量=箱量、单价=卖价），重复点击按同箱型覆盖；费用单位放宽为「四项 + 本单箱型名」 | 推翻 2026-07-25「不下发箱型名」的结论——箱型与费用同属一份详情 DTO，`unitOptions` 由 `props.ctns` 派生即可稳定回显；`coercePreOrderFeeUnit` / `checkPreOrderFees` 增加箱型白名单入参，回显与提交 payload 均需带上；海运费费用代码走 `getFeeCodeListAsync({isSea:true})` 三级兜底匹配并进程内缓存。详见 `changelogs/change-log-2026-08-02-pre-order-generate-ocean-freight-fee.md` |
| 2026-08-02 | `Feature` | 收发通支持点击标题栏展开/折叠，默认折叠 | `partyExpanded` 默认 `false`；`v-show` 保留表单态；去掉与基础信息的 flush 贴合 |
| 2026-08-02 | `Style` | 基础信息「备注」改为默认 1 行、占两列，并去掉字数统计 | `remark`：`rows: 1`、`col-span-2`、去掉 `showCount` |
| 2026-08-02 | `Feature` | 所属菜单从「操作管理」提升为一级「业务联系单」；编辑/新建 path 不变 | 路由模块独立为 `pre-order.ts`，与列表共用同一顶层路由树 |
| 2026-07-31 | `Feature` | 干系人可选角色改由枚举按业务类型配置（`SeaExportUserAttribute` / `SeaImportUserAttribute`，`extra1` 控制默认展示），不再写死 9 项；仅销售固定；切业务类型清理不适用角色行 | 复用新增的 `composables/use-order-user-roles.ts`；`user-defaults.ts` 以 `syncPreOrderUserRows` 取代 `DEFAULT_PRE_ORDER_USERS`/`mergeDefaultPreOrderUsers` 并重算 `sortId`；`UserTable` 改收 `roles` prop；`pendingRoleCleanup` 保证「等新角色到位再清理」，`skipBizTypeUserSync` 避免详情回填误删；`syncFormSnapshot` 前 `await whenRolesReady()` 防误报未保存。详见 `changelogs/change-log-2026-07-31-order-user-role-enum.md` |
| 2026-07-31 | `Feature` | 费用区下方接入附件分组：两步上传 + Add/Edit `attachmentGroup` 全量保存；待审核/通过只读 | `modules/attachment-groups.vue` 对齐付费申请本地维护模式；模块常量 `PRE_ORDER_MODULE_TYPE_ID=160050`；脏检查含附件 |
| 2026-07-31 | `Style` | 顶部 Tab 与主分区标题「基础信息」统一改为「业务联系单」 | 仅改展示文案；`activeTab === 'basic'` 等内部标识不变 |
| 2026-07-26 | `Feature` | 取消独立详情页与表单禁用：统一编辑页；`canSave` 控制保存/提交审核显隐 | 去掉 `commonConfig.disabled` 与子表 `readonly`；`/detail` 仅 redirect 到 `/edit` |
| 2026-07-26 | `Feature` | 待审核/通过对齐 `/detail`（独立纯展示页），录入/驳回对齐 `/edit` | （已废弃）曾用独立 `detail.vue` |
| 2026-07-26 | `Fix` | 「审核流程」弹窗加载中不再空白：有占位文案与最小高度，失败时展示 ABP 错误信息 | 根因是 `workflow-timeline-modal` 在 `loading && !data` 时三个 v-if 全 miss，Spin 无子节点高度塌缩；接口慢/超时时体感为“点了没显示” |
| 2026-07-26 | `Style`/`Fix` | 顶部「基础信息」content-tabs 不再被下方超高内容压扁，视觉对齐海运出口编辑器 Tab 条 | `pre-order-editor-page` 固定高度 + `min-h-0` 下未设 `flex-shrink:0` 的 sticky Tab 会被挤到 ~18px；补 `flex-shrink:0` + `min-height:40px` |
| 2026-07-26 | `Fix` | 委托单位编辑/复制回显用详情 `client.name` 注入 `selectedItems`，不再显示 Guid | `fillFromDetail` → `bindClientUserLinkage(toSelectedItems(...))`，与 `onChange` 同次 updateSchema，对齐海出 `clientId` 回显 |
| 2026-07-26 | `Fix` | 业务类型/装运方式/箱量改为必填：meta 与箱量表头加星标；装运方式新建默认空；保存校验拦截 | `validateForms` 校验 bizType/blType；`validateCtns` 要求至少一行且箱型+箱量>0；箱量 InputNumber `min=1` |
| 2026-07-26 | `Fix` | 干系人「操作」改为非必填：去星标、可删除；保存不再因未选操作人拦截；未选人行提交时剔除 | 必选角色仅剩销售；审核通过仍经 `audit-modal` 强制指派操作（后端生成海出卡点不变） |
| 2026-07-26 | `Feature` | 标题 meta「装运方式」前增加「业务类型」下拉；默认且当前仅「海运出口」；提交/回填走 `headerBizType` | 选项由 `PRE_ORDER_BIZ_TYPE_TEXT` / `getPreOrderBizTypeOptions` 驱动，枚举可有未开放值；与 `headerOrgId`/`headerBlType` 同属 meta 独立 ref |
| 2026-07-26 | `Fix` | 「货物与箱型」品名多选高度对齐海运出口（`size: 'small'`），选中后文字不再被裁切 | 海出靠 `mapSchemaWithSmallSize`；联系单内联 schema 原先漏了 `size: 'small'`，默认 tag 塞不进 24px selector |
| 2026-07-25 | `Fix`/`Style` | 船公司回显补 Logo；新建态隐藏顶部单一「基础信息」Tab；贸易条款与付费方式下移到备注前，空值显示「请选择」 | 船公司 selectedItems 对齐海出，优先使用 `carrierLogo`，缺失才调用 `getCarrierDetail` |
| 2026-07-25 | `Fix` | 切换结算对象类别：先清空结算对象；`ClientSelect` 按新字母码过滤；本单已有委托/发货/收货/通知人则直接回填，并写 `selectedItems`（名称缓存，避免二次拉详情） | `applySettlementByLetter` 开头强制清空；`clientNameCache` + 编辑页 `partyNameCache` 双向喂名；`settlementUiKey` 强制重挂载 |
| 2026-07-25 | `Fix` | 切换收付时按费用代码重写结算对象类别、结算对象与税率（并重算不含税单价/金额）；对方往来单位未填时清空结算对象，避免沿用旧值 | 抽 `applyFeeCodeByPaySide`；应收 `defaultDebitName` / 应付 `defaultCreditName`；税率取费用代码 `taxRate` |
| 2026-07-25 | `Fix` | 费用单位下拉去掉箱型名，仅保留票/重量/体积/TEU；新增默认「票」；历史箱型名回显强制落到「票」；含税单价恢复全程手填 | 箱型名无法作为 Select value 稳定回显（详情只有字符串、无箱型字典注入）；`coercePreOrderFeeUnit` 统一收敛；箱型表仍仅供 TEU 累加 |
| 2026-07-25 | `Fix` | 费用单位按后端契约纠正为「票/重量/体积/TEU+箱型名」（去掉后端识别不了的毛重/尺码/件数），历史数据回显自动归一；数量改为只读并恒由单位派生，货物毛重/体积或箱型变化后全表重算；提交审核前拦截会被后端静默丢弃（缺收付/费用代码/币别）或算成 0（单位不可识别）的费用行 | 单位契约与体检抽到 `modules/fee-unit.ts`（`PRE_ORDER_GENERIC_UNITS` / `normalizePreOrderFeeUnit` / `checkPreOrderFees`），因 `<script setup>` 不能导出值；`fillQuantityByUnit` 与后端 `ResolveQuantityByUnit` 逐分支对齐且未知单位显式置 0；`syncCtnDrivenRows` 升级为 `syncDerivedRows`（不再只管箱型驱动行）；`PreOrderFeeCargo` 去掉 `pkgs`——联系单后端无件数分支 |
| 2026-07-25 | `Feature` | 费用逻辑对齐海出：单位改为票/TEU/尺码/毛重/件数；按单位自动带量（毛重·尺码·件数取货物计量，TEU 累加箱型，票固定 1）；本位币汇率锁 1 只读；应付选箱型也带箱量 | 单位字符串是与后端重算的契约，不可自造别名；TEU 需 `getCtnCodeDetail().teu`（`PreOrderCtnDto` 无此字段）并按 `ctnCodeId` 缓存；本位币经 `getOrganizationUnit(headerOrgId).localCurrencyId` 解析 |
| 2026-07-25 | `Feature` | 费用表补齐 DTO：结算对象类别、汇率、不含税单价、禁开票、机密；费用代码/币别/收付/类别联动对齐海出口径 | `parties` 由编辑页实时传入 client/shipper/consignee/notifier；汇率走 `getExchangeRateDetail`；行业枚举复用海出 `getIndustryCategoryOptions` |
| 2026-07-25 | `Fix` | 费用点添加：币别默认 USD；已有箱型时单位默认首个箱型并带出卖价/箱量；**新增行始终重算金额**；切换单位后只读与金额可靠刷新 | 原先仅 `if (firstCtn)` 才 `recalcAmount`，无箱型时金额列空白；统一走 `applyCtnPriceAndQty` / `recalcAmount`；`a-table` 浅比较需 `touchDataSource` |
| 2026-07-25 | `Fix` | 箱型箱量表去掉 scroll.y，改外层滚动 + sticky 表头；列（含备注）固定宽并 table 铺满，消除右侧灰底留白 | scroll.y 拆两张表是根因；列宽/滚动条槽治标不治本 |
| 2026-07-25 | `Fix` | 服务项流水线去掉「已完成」绿勾，已勾选节点统一「未执行」灰底；仅出口对比「新增」用进行中样式 | 联系单无 `taskStatus`，`nodeState` 默认须为 `upcoming`，不可复用海出任务态默认 `done` |
| 2026-07-25 | `Feature` | 归属组织改为取干系人「销售」所属组织；选择委托单位后按客户维护的销售/客服/操作/单证回填干系人（缺操作/单证/客服兜底当前账号） | `UserOrgSelect :user-id="salesUserId"` + `orgs` 回显兜底；`applyClientDefaultPreOrderUsers` 与海出 `applyClientDefaultOrderUsers` 同构，挂在 `clientId` `onChange` |
| 2026-07-25 | `Feature` | 收发通补齐三组对称字段：往来单位 id + Content 文本；布局对齐海出 party-flow；详情回填 Content 与 SimpleDto 名称；`remark` 挪到基础信息船公司后 | schema 用 `createClientSelectSchema` + `EnglishUpperTextarea`；`fillFromDetail` 经 `toSelectedItems` 写 `selectedItems`；备注回填改走 `basicFormApi`；提交靠 spread 自然带上 |
| 2026-07-25 | `Perf`/`Fix` | 箱型选择从 `CtnSelect` option 取名称；修选中仍打 `DetailAsync`（根因是雪花 ID 被 `Number()` 丢精度导致 cell 重挂载后缓存失效） | `change(value, option)` + `selected-items` 有 id 即回传；`handleChange` 先 pin/merge；`ctnCodeId` 原样透传禁止 `Number()`；`ensureSelectedLoaded` 缓存/options 命中即跳过详情 |
| 2026-07-25 | `Style` | 箱型箱量表格铺满「基础信息」与「费用」之间的剩余高度，行数超出时表体内滚动，费用区固定在下方 | `pre-order-cargo-section` `flex:1` + `ctn-table` `ResizeObserver` 驱动 `scroll.y`；高度链挂在 `pre-order-*` 类，不改海出共用 `form.css` |
| 2026-07-25 | `Style` | 箱型箱量工具栏去掉「箱型箱量」标题条与背景色，改为与费用区相同的纯 icon 增删按钮 | 去掉本地 `order-ctn-table__title-bar` scoped 样式，工具栏改用 `Space` + `mb-2`，与 `fee-table` 对齐 |
| 2026-07-25 | `Style` | 港口区块改名「港口信息」并按海运出口重做：5 列流转卡片 + 流向箭头、中转港 1/2 内联 Tab 共用一列、每个节点带英文大写备注且选港自动回填 | 港口 schema 与海出同构但字段名是 `pot1Id/pot2Id/pot1Remark/pot2Remark`（海出为 `poT1Id/poT2Id`）；备注格式化 `formatSeaExportPortRemark` / `pickPortSelectOption` / `buildPortSelectProps` 上移到 `sea-export-admin/data.ts` 共用；两页结构同构后，海出的中转港 Tab `Teleport` 目标查询改为限定在自身 section 内，避免被内嵌场景中 DOM 更靠前的业务联系单抢占 |
| 2026-07-25 | `Style` | 费用区「添加应收/应付」合并为单一添加，添加/删除改用海出箱型表同款 icon | `handleAdd` 默认 `paySide=0`；icon 复刻 `order-ctn-table` 的 `mdi:add-box` / `mdi:close-box` |
| 2026-07-25 | `Style` | 「货物与箱型」改为左右分栏（左箱型表 / 右竖排计量）；箱型增删改用海出同款 add-box/close-box 图标按钮 | 计量表单 `wrapperClass` 切到 `cargo-metrics-wrap grid-cols-1`；箱型标题栏本地 scoped，避免依赖海出 `cargo-ctn-section` 负边距通栏 |
| 2026-07-25 | `Style` | 「货物与箱型」标题栏内联「货物类型」「品名」，对齐海运出口；品名补齐 `preOrderCodeGoodss` 读写 | 表单字段用 `orderCodeGoodss: number[]`，仅在详情回显 / 提交时与子表 DTO `preOrderCodeGoodss` 互转；样式类直接吃海出 `form.css` 的 `cargo-type-inline-*` |
| 2026-07-25 | `Feature` | 新建编辑页：双 Tab 布局、三段表单 + 四个子表、保存 / 提交 / 撤回 / 审核 / 审核后驳回、审核时间轴、复制预填 | 内嵌海运出口编辑器能免传参工作，是因为 `PreOrder.Id === TransportOrder.Id === SeaExport.Id`，被嵌组件从同一个 `route.params.id` 取值；服务项候选池直接复用 `GetServiceTypesByPOLAsync`（已含客户排除项），避免前端重复拼接 `SeServiceConfig` 与 `ClientExceptService` |
| 2026-07-25 | `Style` | 编辑页布局对齐海运出口：主栏分区标题条 + 右侧干系人面板；操作按钮进 `content-section__actions`；收发通与货物拆分；业务编号进标题 meta | 直接 `scoped src` 复用 `basic-info-form/form.css`，避免再抄一份分区/卡片样式 |
| 2026-07-25 | `Style` | 二次对齐海运出口：右栏收窄回 180px；干系人卡片加用户头像、商务改显「商务(航线)」；「归属组织」「装运方式」从表单挪到标题 meta 区选择器 | meta 区选择器脱离 vben form，用独立 ref（`headerOrgId`/`headerBlType`）承载，提交时并入 payload；归属组织改为保存前手动校验；头像走 `getUser(id, { silent: true })` 懒加载 + 本组件内缓存，未选人显示系统默认头像 |
