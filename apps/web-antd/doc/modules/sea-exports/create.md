---
title: 海运出口新建
module: 海运出口
author: auto-doc-sync
last_updated: 2026-08-31
---

# 1. 业务背景说明 (Background)

**白话解释：** 海运出口新建页用于从零创建海出委托主记录。页面以委托信息、基础信息、相关方、船期、港口、货物、服务项目、箱型箱量和备注为核心录入区。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/sea-exports/create` |
| 路由名称 | `SeaExportCreate` |
| 页面组件 | `src/views/sea-export-admin/basic-info-form/form.vue` |
| 权限口径 | 路由未声明独立权限；通过 `activePath: /sea-exports` 归属海运出口菜单 |
| 关键源码 | `src/router/routes/modules/sea-export.ts`<br/>`src/views/sea-export-admin/list.vue`<br/>`src/views/sea-export-admin/basic-info-form/form.vue`（及同目录 README 与私有拆分文件）<br/>`src/views/sea-export-admin/editor.vue`<br/>`src/views/sea-export-admin/data.ts`<br/>`src/views/sea-export-admin/orderFee/data.ts`<br/>`src/api/sea-export/sea-export-admin.ts`<br/>`src/api/sea-export/order-fee-admin.ts`<br/>`src/api/sea-export/change-order-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **AI 识别辅助：** 顶栏「AI识别」点击后弹出拖拽上传区（`ai-extract-upload-modal.vue`），支持 PDF、图片（png/jpg/jpeg/bmp/tiff/webp）与 Office（doc/docx/xls/xlsx/rtf）；拖入或点击选文件后自动调用 TextIn `ExtractSeaExportToAddDtoAsync`，由后端完成名称→id 匹配并回填表单；六段港口 Id 与对应 `*Remark` 一并映射进港口表单（空值、`0`、空 Guid 不回填）。识别成功自动关窗；失败可在弹窗内重试。
- **基础信息 6 列顺序：** 第 1 行委托单位、船公司、船名/航次、船代、订舱代理、车队；第 2 行订舱编号、主提单号、保险公司、报关行、仓库、场站；第 3 行签单方式、提单/副本份数、付费方式/付款地点、运输条款/贸易条款、合同号。由 `BASIC_INFO_FIELD_ORDER` 控制；头部委托编号/会计期间/应结日期/归属组织/业务来源/装运方式/订单类型不占栅格。
- **品名选择交互：** “品名”改为可搜索的多选下拉，直接在主表单中完成选择，不再通过弹窗维护列表；下拉项与已选值展示为“品名-海关代码”，输入区宽度支持随内容自适应扩展（上限为父容器剩余宽度）。
- **干系人角色约束：** 面板默认固定展示销售、商务、操作、客服、单证五个岗位（无人员时岗位行仍保留）；销售、操作标签显示红色必填标识，不可删除且必须已选人（销售必须且只能有一人）；海外客服不默认展示，需通过「+ 添加角色」手动添加。选择委托单位后调用 `Client/GetDishonestStakeholdersAsync`（登录即可）按客户绑定干系人默认回填；操作/单证/客服若客户未绑定则兜底当前登录账号。干系人 `UserSelect` 走全量用户缓存：未选归属组织时候选为当前登录用户所属各公司人员，选定组织后收窄为该销售组织所属公司；客户默认带回的人不受过滤限制、始终显示昵称。保存时另按**当前勾选服务项**的 `userAttribute` 动态校验：每个服务至少需一个绑定角色在干系人中且已选人。干系人展示信息与编辑页共用 `GetUserListByIdsAsync` 批量回显。
- **右侧栏与场站联系人：** 右侧主卡片为「干系人」。场站联系人/邮箱/手机/电话与编辑页一致挂在「场站」标签旁只读展示（新建态通常为空显示 `-`）；保存时随 `SeaExportAddDto` 透传（新建多为空）。
- **委托单位 / 订舱代理联系人：** 标签右侧按场站同款展示联系人姓名，悬停看邮箱 / 手机 / 电话。选客户后拉该客户未禁用联系人（优先默认，否则第一条）并随保存提交 Id；清空客户则清空联系人。本轮无独立联系人下拉。
- **服务项目联动（Chevron 三态流水线）：** 选择起运港后查询 POL 服务节点；流水线仅展示已勾选节点，按顺序呈现已完成/处理中/还未到三态。节点勾选在「配置服务」弹窗维护，并按 `ServiceType.extra1` 分为「主流程 / 非主流程」，组内仍按 `sortId` 排序。未选起运港提示先选起运港；POL 无配置时展示空态；无勾选节点时提示「去配置」。`GetServiceTypesByPOLAsync` 的展示/锁定/必填已改为对象数组（`seaExportPropEnum` + `requireValues`），前端取枚举值时需兼容，不可再当 `number[]` 直接使用。
- **提交创建：** 保存时并行校验多个表单分区，构造 `SeaExportAddDto`，调用 `/services/app/SeaExportAdmin/AddAsync`。校验失败时 toast 点名缺失必填字段（如「请完善必填项：归属组织」）；头部归属组织带红色 `*`。货物类型新建默认「普通货」，可改可清。
- **船期时间校验：** 截关节点展示为截单 → 截港 → 截关；保存时逐项校验上述日期，任一晚于开船日期或实际开船日期时提示对应字段并阻止保存。
- **付费地点联动：** 选择到付（中文名含“到付”或 EDI 代码 `CC`）时，付费地点自动带出目的港；选择预付（中文名含“预付”或 EDI 代码 `PP`）时，自动带出起运港，带出后仍可手动修改。
- **箱包装默认值：** 新增箱型箱量行时，将货物信息中的订单级总包装 ID 与文本复制到箱行包装；箱行包装仍可独立修改。
- **箱型箱量批量新增：** 标题栏「批量新增」打开 Popover，分页拉取全部启用箱型并可按名称搜索；按箱型填数量后确认，一次生成对应条数「一行一柜」记录（预填箱型，带出总包装默认值）；单条「+」添加仍保留。
- **创建后跳转：** 新增成功后优先解析接口返回的记录 ID，以 `router.replace` 进入 `/sea-exports/{id}/edit`；若返回值无法解析，则 `replace` 回 `/sea-exports` 列表。跳转后关闭原新建页顶部标签，避免残留空白 Tab。
- **顶部标签栏标题：** 浏览器标签栏标题随录入状态动态变化：未保存且无主提单号时为「海运出口」；录入主提单号后为「海运出口-{主提单号}」；保存后无主提单号时为「海运出口-{委托编号}」。主提单号优先于委托编号。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **委托单位** | 委托客户，是运输单必填主体。 | `transportOrder.clientId`；`ClientSelect`（客户属性为委托单位）；`Client/GetDishonestStakeholdersAsync` | **触发/依赖：** 选择后参与服务项目联动查询（`clientId`）；并调用 `applyClientDefaultOrderUsers` 按客户绑定干系人回填，操作/单证/客服未绑定兜底当前账号。标签右侧展示默认联系人，提交 `transportOrder.clientContactId`。 | **必填项**（`selectRequired`）。 |
| **委托编号** | 业务委托号。 | `transportOrder.commissionNum`；按编号生成规则自动生成 |  | 前端禁用，不手工录入。 |
| **会计期间** | 财务期间。 | `transportOrder.accountDate` | **触发/依赖：** 新建、编辑保存后，后端按开船日期精度到月计算；无开船日期则取当前时间（到月）。 | 禁止手动修改。 |
| **应结日期** | 结算日期。 | `transportOrder.settlementDate` | **触发/依赖：** 新建、编辑保存后，后端按开船日期精度到天计算；无开船日期则取当前时间（到天），并结合委托单位账期规则。 | 禁止手动修改。 |
| **所属公司** | 业务单所属公司。 | `organizationUnits` | **触发/依赖：** 新建、编辑保存后，后端根据干系人中销售所属公司自动生成。 | 禁止手动修改。 |
| **归属组织** | 委托直属组织（必填）；头部按销售绑定可选范围，标签带 `*`。 | `orgId`；`UserOrgSelect`（`salesUserId` + `selectedItems` 回显） | **触发/依赖：** 干系人销售变化时选项范围切换；`formatOrgPathLabel` 展示完整路径；schema 隐藏载体保留 `selectRequired`；缺值时 toast 点名。 | **必填项**。 |
| **合同号** | 运输单合同号。 | `transportOrder.contractNum` | **触发/依赖：** 提交/回填走 `transportOrder`；复制入库由后端置空；栅格排在运输条款/贸易条款之后。 | 可空；`maxlength: 64`。 |
| **业务来源** | 订单业务来源分类；头部可下拉，选项来自基础资料业务来源。 | `transportOrder.codeSourceId` / `codeSource`；`CodeSourceSelect` | **触发/依赖：** 选委托单位后 `applyClientCodeSource` 用客户维护值自动带出，允许再改或清空。 | 可选。 |
| **付费方式** | 运费付费方式。 | `transportOrder.codeFrtId`；与付费地点合并为 `FrtPrepareInput` | **触发/依赖：** 与 `prepareAtId` 同栏展示。 | - |
| **付费地点** | 运费支付地点港口。 | `transportOrder.prepareAtId`；`PortSelect`（基础数据） | **触发/依赖：** 付费方式为预付时带出起运港（`polId`）；为到付时带出目的港（`podId`），带出后允许修改。 | - |
| **运输条款 / 贸易条款** | 运输服务条款与贸易术语；视觉合并为一个表单项。 | `ServiceTradeTermsInput` -> `codeServiceId` + `tradeTermsType`（贸易条款枚举 CIF/FOB 等） | **触发/依赖：** 主字段 `codeServiceId`，第二字段经 `formContext` 写回 `tradeTermsType`；内部宽度 1:1。 | - |
| **订舱代理** | 订舱服务执行方客户。 | `bookingAgentId`；`ClientSelect`（`industryCategory: 'o'`） | **触发/依赖：** 与船公司/船代/场站一并迁入基础信息区，排在船代后、车队前；与服务流水线解耦，始终展示。标签右侧展示默认联系人，提交 `bookingAgentContactId`；清空代理则联系人传 `null`。 | 可选；须为含订舱代理属性的客户。 |
| **委托单位 / 订舱代理联系人** | 标签旁只读展示的客户联系人。 | `ClientContactAdmin/GetPagedListAsync`；保存 `clientContactId` / `bookingAgentContactId` | **触发/依赖：** 选客户后优先 `isDefault`，否则第一条未禁用；悬停邮箱/手机/电话。 | UI 只读；无联系人显示 `-`。 |
| **船名航次** | 船名和内航次；海出侧船名:船次宽度 **3:2**。 | `VesselVoyageInput` -> `vessel`、`innerVoyno`（`mainRatio:3` / `secondRatio:2`） | **触发/依赖：** 一个组合输入维护两个字段。 | 文本可为空，格式以后端为准。 |
| **签单地点 / 签单日期** | 签单港与签单时间。 | `signingPortId`、`signingTime` | **触发/依赖：** 表单当前 `hidden`，模型保留可提交。 | - |
| **业务锁定** | 业务资料是否锁定。 | `transportOrder.isBusinessLocking`；后端默认未锁定 | - | 禁止手动修改。 |
| **费用锁定** | 费用是否锁定。 | `transportOrder.feeLocked`；后端默认未锁定 | - | 禁止手动修改。 |
| **装运方式** | 整柜、拼箱分票、拼箱主票。 | `blType`；枚举 `0` 整柜 / `1` 拼箱分票 / `2` 拼箱主票 | **触发/依赖：** 默认整柜。 | - |
| **订单类型** | 直单或分单。 | `billType`；枚举 `0` 直单 / `1` 分单 | **触发/依赖：** 默认直单。 | - |
| **货物类型** | 普通货/冻柜/危险品/超限箱；货物卡片标题栏内联。 | `transportOrder.cargoId`；枚举 `CargoType`（S=0/R=1/D=2/O=3） | **触发/依赖：** 新建默认普通货（`CARGO_TYPE.S`）；编辑回填详情；危险品/冻柜才展示扩展字段。 | 可改可清。 |

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
>
> **[卡点 6：新建保存后必须关闭原 Tab]** `/create` 与 `/:id/edit` 是不同 Tab key；仅 `push`/`replace` 都会留下新建页标签。须在跳转前缓存 create 的 `fullPath`，跳转后 `closeTabByKey`，否则顶部会残留空白标签。
>
> **[卡点 7：往来单位联系人 Id 层级不同]** 委托单位联系人在 `transportOrder.clientContactId`，订舱代理联系人在海出根 `bookingAgentContactId`。保存必须带回当前 Id，漏传会被空覆盖；展示学场站标签，数据不要抄场站四段字符串。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-08-31 | `Fix` | 委托单位、订舱代理标签旁按场站同款展示联系人；选客户带出默认联系人并随保存提交 Id。 | TAPD 1000904。详见 `changelogs/change-log-2026-08-31-sea-export-party-contact-label.md`。 |
| 2026-08-31 | `Fix` | 新建时货物类型默认「普通货」，可改可清。 | TAPD 1000913；`cargoId` 用 `CARGO_TYPE.S`（值为 0），提交须用 `??` 不能用逻辑或。编辑仍走详情回填。详见 `changelogs/change-log-2026-08-31-sea-export-default-cargo-normal.md`。 |
| 2026-08-31 | `Fix` | 主单毛重/体积、集装箱毛重/皮重/体积改为最多 4 位小数，末尾 0 不展示。 | TAPD `#1161580498001000905`。与编辑页共用 schema。详见 `changelogs/change-log-2026-08-31-weight-volume-4-decimal.md`。 |
| 2026-08-23 | `Feature` | 新建页 KeepAlive：未保存切走可回来继续填，点 X 关闭才丢。 | `keepAlive` + `keepAliveName: SeaExportAdminForm`。详见 `changelogs/change-log-2026-08-23-detail-keep-alive-unsaved.md`。 |
| 2026-08-19 | `Fix` | 包装下拉改为全量缓存并前端搜索；基础资料删除包装后下拉不再能搜到。 | 与 `UserSelect` 同构：`codePackageListCache` + `useCachedSelect`。详见 `changelogs/change-log-2026-08-19-code-package-select-full-cache.md`。 |
| 2026-08-19 | `Feature` | `GetServiceTypesByPOLAsync` 展示/锁定/必填改为对象数组；必填可含附件类型 `10001`。 | 取值走 `toSeaExportPropEnum`；普通必填仍映射表单字段，`10001` 不参与字段校验。详见 `changelogs/change-log-2026-08-19-se-service-require-attachment-types.md`。 |
| 2026-08-19 | `Feature` | 干系人下拉改为全量用户缓存；未选归属组织时看当前用户各公司，选了组织后看该销售组织所属公司。客户默认干系人仍带回且显示昵称。 | 与编辑页共用 `form.vue` 的 `company-ids`。详见 `changelogs/change-log-2026-08-19-user-select-full-cache-company-filter.md`。 |
| 2026-08-17 | `Style` | 基础信息 6 列顺序改为：订舱编号/主提单号/保险公司/报关行/仓库/场站为第二行，合同号排在运输条款之后。 | 只改 `BASIC_INFO_FIELD_ORDER`；schema 与提交映射不变。详见 `changelogs/change-log-2026-08-17-sea-export-basic-info-field-order.md`。 |
| 2026-08-16 | `Feature` | 收发通改为灰色折叠条（默认展开）；内部/外部备注挪到货物区件重尺右侧，顶部 Tab 切换。 | 折叠与 Tab 均用 `v-show` / CSS 隐藏。详见 `changelogs/change-log-2026-08-16-sea-export-party-collapse-remark-tabs.md`。 |
| 2026-08-16 | `Fix` | 头部业务来源改为可下拉选择；选委托单位仍自动带出，允许再改。 | 见 `changelogs/change-log-2026-08-16-sea-export-code-source-select.md`。 |
| 2026-08-10 | `Fix` | 头部业务来源改为固定宽只读文案，消除带出/回显时布局抖动。 | 去掉 `CodeSourceSelect` 与「-」互切；回填读 `codeSource.cnName`。详见 `changelogs/change-log-2026-08-10-sea-export-code-source-layout-jitter.md`。 |
| 2026-08-10 | `Fix` | 保存必填失败时 toast 点名缺失字段；头部归属组织补 `*`；换销售带出组织防竞态。 | `collectInvalidFieldLabels`；`UserOrgSelect` 换人一次写入；详见 `changelogs/change-log-2026-08-10-sea-export-required-field-toast.md`。 |
| 2026-08-09 | `Feature` | 箱型箱量支持「批量新增」：全量启用箱型 + 搜索 + 按数量一次生成多行。 | 共用 `order-ctn-table.vue`；对应 TAPD `#1161580498001000694`。详见 `changelogs/change-log-2026-08-09-sea-export-ctn-batch-add.md`。 |
| 2026-08-09 | `Fix` | AI 识别回填六段港口备注及收货地/中转港 Id；后端 `seaExport.*Remark` 有值时写入港口表单。 | `buildAiExtractFormPayload` 此前只映射部分港口 Id、未 `assignScalar` 备注；白名单有字段仍会丢。对应 TAPD `#1161580498001000737`（1）。详见 `changelogs/change-log-2026-08-09-sea-export-ai-extract-port-remarks.md`。 |
| 2026-08-05 | `Style` | 截 VGM→截港日期、截舱单→截关日期；船期时间轴右侧顺序改为截单→截港→截关。 | 与编辑页共用 `data.ts` 与 i18n；API 字段名不变。详见 `changelogs/change-log-2026-08-05-sea-export-cutoff-labels-order.md`。 |
| 2026-07-30 | `Refactor` | 选择委托单位后改走 `Client/GetDishonestStakeholdersAsync` 带出业务来源与干系人，不再调 `ClientAdmin/DetailAsync`。 | `getClientDishonestStakeholders` 入 `#/api/common/client`；`applyClientCodeSource` 读嵌套 `codeSource`；编辑态仍只更新来源、不重写干系人。详见 `changelogs/change-log-2026-07-30-sea-export-client-dishonest-stakeholders.md`。 |
| 2026-07-26 | `Feature` | 干系人用户信息改为与编辑页共用的 `GetUserListByIdsAsync` 批量获取，不再逐个拉详情。 | 共用 `use-order-users.ts`；详见 `changelogs/change-log-2026-07-26-sea-export-order-users-batch-get.md`。 |
| 2026-07-25 | `Perf` | 箱型选择从 option 取名称，选中时不再请求箱型详情 | 共用 `order-ctn-table`；`@change` 写 `ctnCodeName`，`syncCtnNameMap` 仅兜底回显 |
| 2026-07-24 | `Feature` | 「AI识别」改为点击弹窗拖拽上传，放入文件后自动开始识别，成功回填后关窗。 | 新增 `ai-extract-upload-modal.vue`；`recognizeAiFile(File)` 替代隐藏 file input。详见 `changelogs/change-log-2026-07-24-sea-export-ai-extract-drag-upload-modal.md`。 |
| 2026-07-24 | `Fix` | 已选委托单位但无业务来源时改为纯文本「-」，不再渲染禁用下拉占宽。 | `showCodeSourceEmptyDash` 控制分支。详见 `changelogs/change-log-2026-07-24-sea-export-code-source-empty-dash.md`。 |
| 2026-07-24 | `Fix` | 委托单位带出业务来源时仅传 id，名称由 `CodeSourceSelect` 自拉取；头部来源下拉 placeholder 字号缩小。 | `applyClientCodeSource` 不再拼 `client.codeSource.cnName`。详见 `changelogs/change-log-2026-07-24-sea-export-code-source-self-fetch.md`。 |
| 2026-07-24 | `Feature` | 基础信息新增合同号；头部「归属组织」改用按销售绑定的 `UserOrgSelect`（完整路径回显）。 | `contractNum` 经 `flattenDetail`/`buildSeaExportDto` 挂 `transportOrder`；`clearOnUserChange` 仅切换用户时清空。详见 `changelogs/change-log-2026-07-24-sea-export-contract-num.md`。 |
| 2026-07-14 | `Fix` | 销售/操作显示必填标识；截关日期不得晚于开船/实际开船；预付/到付自动带出起运港/目的港；新增箱行默认复制总包装 ID 与文本。 | 总包装与箱行包装共用 `CodePackageSelect` 数据源但分属订单级与箱行级字段；通过选择事件缓存文本，新增行无需再拉包装详情。 |
| 2026-07-14 | `Fix` | 修复文本字段（收货人/发货人/通知人内容、各备注）「输入后又删空」恢复原状，切标签/跳转仍被误拦的问题。 | 脏检查比对由裸 `JSON.stringify` 改为经 `normalizeForDirtyCheck`（`undefined`/`null`/`''` 等价、递归 + 键排序）的 `stableDtoJson`；`syncFormSnapshot`/`isFormDirty` 共用，提交侧 `buildDto` 不变。详见 `changelogs/change-log-2026-07-14-sea-export-dirty-check-empty-value-normalize.md`。 |
| 2026-07-14 | `Feature` | 新建页填写后未保存就切标签页/点菜单跳转/浏览器后退时，弹二次确认「有未保存的内容」，确认才离开。对应 TAPD `#1161580498001000498`。 | 接入全局工具 `useUnsavedGuard({ isDirty: isFormDirty, enabled: () => !props.embedded })`（详见 `modules/shared/unsaved-guard.md`）。新建态 `onMounted` 补 `syncFormSnapshot()` 建立空白基线，否则 `isFormDirty` 恒为 false 永不弹窗；`use-sea-export-submit.ts` 新建保存成功后、`router.replace` 前补 `syncFormSnapshot()` 避免误拦保存跳转。 |
| 2026-07-14 | `Feature` | AI 识别上传放开 Word/Excel/RTF（doc/docx/xls/xlsx/rtf），与原有 PDF/图片一并可选。 | 仅放宽 `AI_EXTRACT_ACCEPT` / `isAiExtractSupportedFile` 与前端提示；仍走 `ExtractSeaExportToAddDtoAsync`，识别效果依赖后端 TextIn 对 Office 的支持。 |
| 2026-07-12 | `Fix` | 新建保存成功后 `replace` 进编辑页并关闭原新建页 Tab，消除顶部残留空白标签。 | `useSeaExportSubmit` 注入 `closeTabByKey`/`getCurrentTabKey`；关闭须用跳转前缓存的 create key。 |
| 2026-07-12 | `Fix` | 保存 DTO 带回场站联系人四字段（与编辑页同源修复，避免漏传被后端空覆盖）。 | 与编辑页共用 `collectCurrentFormValues` + `buildSeaExportDto`；新建态通常为空透传。 |
| 2026-07-12 | `Fix` | 基础信息区补齐「订舱代理」字段，可选行业类别为订舱代理的客户并随单保存。 | 与编辑页共用 `form.vue`；`bookingAgentId` 纳入 `BASIC_MODULE_EXTRA_FIELD_NAMES` 从船期 schema 迁入，避免只剔除不迁入导致字段消失。 |
| 2026-07-12 | `Feature` | 配置服务项目弹窗按「主流程 / 非主流程」分组展示。 | 与编辑页共用 `form.vue`；分类读取 `ServiceType.extra1`，任务优先级仍读取 POL 配置 `sortId`。 |
| 2026-07-12 | `Feature` | 船名/航次宽度 3:2；运输条款与贸易条款合并为一项（1:1）；签单地点/日期表单隐藏（模型保留）。 | 与编辑页共用 `data.ts`/`form.vue`；新增 `ServiceTradeTermsInput`。 |
| 2026-07-12 | `Feature` | 右侧拆为上下两卡：上「干系人」、下只读「场站信息」（联系人/邮箱/手机/电话）；新建态为空显示 `-`。 | 与编辑页共用 `form.vue`/`form.css`；字段挂 `SeaExportDto`，经 `entrustReadonlyInfo` 展示，不入提交 DTO。 |
| 2026-07-11 | `Feature` | 干系人面板默认固定展示销售/商务/操作/客服/单证；海外客服不默认展示；选择委托单位后按客户绑定干系人默认回填，操作/单证/客服未绑定兜底当前账号；委托单位与起运港加必填标识。 | 与编辑页共用 `form.vue`/`use-order-users.ts`；`data.ts` 为 `clientId`/`polId` 设 `selectRequired`。 |
| 2026-07-11 | `Style` | 箱型箱量表格列宽优化：收窄序号/箱型列，加宽箱号/封号列。 | 共用 `order-ctn-table.vue`；列宽通过 `tableColumns.width` 与 `order-ctn-table__*-col` CSS 双处固定。 |
| 2026-07-11 | `Refactor` | 无（纯代码组织调整，行为不变）。 | 基础信息表单收敛至 `basic-info-form/` 目录：迁入 `form.vue`/`form.css` 及 5 个私有拆分文件（映射/服务项纯逻辑/AI 规范化/干系人/AI 识别/保存提交），新增 README 梳理职责与依赖；路由与 `editor.vue` 引用同步更新；清理 `form.vue` 5 处未使用声明。共享文件（`data.ts`/`service-type.ts`/`use-sea-export-copy`/`use-yundang-ocean-subscribe`）保留原位。 |
| 2026-07-08 | `Feature` | 船期信息标题栏新增「同步日期」：船名+航次+开船日期齐全后可按历史票证回填 ATD/ETA/截 VGM/截单/截舱单。 | `GetDates` + `use-sync-shipment-dates.ts`；仅回填非 null 字段，无数据静默。 |
| 2026-07-08 | `Style` | 箱型箱量标题栏新增/删除等按钮改为紧跟标题靠左，不再顶到右侧。 | 共用 `order-ctn-table.vue`；去掉标题 `flex: 1`。 |
| 2026-07-06 | `Feature` | AI 识别对接 TextIn：支持 PDF/图片、Drawer 预览 citations 定位、箱型箱量/品名回填；空值/0/空 Guid 不回填。 | 与编辑页共用 `form.vue`；新增 `text-in-admin.ts` 与预览 Drawer 组件。 |
| 2026-07-02 | `Style` | 船期信息时间轴竖向分割条移至预抵日期后，与编辑页一致。 | 共用 `form.vue` 的 `.shipment-flow-divider` 与箭头排除规则。 |
| 2026-06-27 | `Feature` | 提单类字段（唛头、货描、收发通、港口备注等）输入时全角英数字/标点/空格自动转半角，与既有英文大写规范串联执行。 | `toHalfWidth` 并入 `toEnglishUpperCase`；港口联动备注与 AI 回填同步生效。 |
| 2026-06-27 | `Feature` | 顶部浏览器标签栏标题按主提单号/委托编号动态展示，未保存新建单默认「海运出口」。 | 逻辑收敛至 `use-sea-export-tab-title.ts`，新建页与编辑工作台嵌入表单共用。 |
| 2026-06-17 | `Feature` | 唛头、货物描述、相关方备注、港口备注、主提单号、船名航次、箱号/封号等提单类字段输入英文时自动转大写；港口联动备注与 AI 识别回填同步处理。 | 复用 `EnglishUpperInput`/`EnglishUpperTextarea` + `toEnglishUpperCase`；新建/编辑共用 `form.vue`。 |
| 2026-06-07 | `Feature` | 保存时按勾选服务项的 `userAttribute` 动态校验干系人：每服务至少一个绑定角色已选人；销售、操作始终静态必填。 | `validateRequiredOrderUserAssignee` + `validateServiceBoundOrderUsers`；读 `latestAvailableServiceTypes` 缓存。 |
| 2026-06-07 | `Style` | 服务项目 Chevron 节点尺寸紧凑化（40px 高、12px 字号），单节点最大宽度 140px。 | 对齐工作台 `workbench-business-table` Chevron 规格。 |
| 2026-06-07 | `Feature` | 服务流水线三态展示，节点勾选改弹窗维护（新建页无取消完成接口）。 | 与编辑页共用 `form.vue`。 |
| 2026-06-07 | `Style` | 服务项目 UI 改为 Chevron 箭头流水线（三态配色 + 悬浮 Tooltip）。 | 与编辑页共用 `form.vue`；`clip-path` 箭头衔接，Tooltip 避免 `overflow-hidden` 裁切。 |
| 2026-06-07 | `Style` | 干系人角色图标按货代岗位职责语义映射（销售握手、商务运价表、操作集卡、客服沟通、单证签发、海外协同）。 | `getOrderUserRoleIcon` 仅影响展示，校验与提交逻辑不变。 |
| 2026-06-07 | `Refactor` | 服务流水线改为 `ServiceTypeNode` 枚举驱动，与执行方五字段完全解耦；删除代收支与 `organizationUnits` 提交。 | 新建/编辑共用 `form.vue`；节点来自 POL 配置 + `ServiceType` displayName，提交 `serviceTypes` 由勾选节点 value 集合生成。 |
| 2026-06-07 | `Refactor` | 服务项目枚举值与节点文案不再使用前端硬编码 `0~5`，统一在运行时从 `getEnumItems('ServiceType')` 读取并映射。 | 新建页与编辑页共用 `form.vue`，服务项勾选、提交 `serviceTypes` 与节点名称均收敛到同一枚举源，降低枚举中心变更带来的前端漂移风险。 |
| 2026-05-30 | `Fix` | 服务项目空态改为紧凑一行提示；未选/清空起运港时不渲染服务节点并提示先选起运港；可见服务项与顺序完全由起运港配置回显。 | 初始可见态改为全隐藏，`getServiceItemVisible` 仅 `=== true` 时展示。 |
| 2026-07-11 | `Refactor` | 无（纯代码组织调整，行为不变）。共用 `form.vue` 按批次拆分，累计 6581→约 3191 行（样式移至 `form.css`）。 | 抽出 `sea-export-detail-mapper.ts`（映射）、`service-type-nodes.ts`（服务项纯逻辑）、`use-order-users.ts`（干系人）、`use-sea-export-ai-recognize.ts` + `modules/ai-extract-utils.ts`（AI 识别编排/规范化）、`use-sea-export-submit.ts`（`buildSeaExportDto` 纯函数 + 提交/脏检查 composable）；`<style scoped>` 外链为 `form.css` 并放宽共享 stylelint 的 `.css`/`.scss` 深度选择器。调用点等价替换，DTO 与校验链路不变。详见 `changelogs/change-log-2026-07-11-sea-export-form-modularization.md`。 |
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
