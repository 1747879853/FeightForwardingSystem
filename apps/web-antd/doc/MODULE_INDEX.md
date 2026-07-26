| 模块名称 | 页面/路由 | 业务域/分类 | 一句话描述 | 文档链接 | 最近更新时间 |
| --- | --- | --- | --- | --- | --- |
| \_core | `/profile` | 账户与认证 | 当前用户维护个人资料、修改密码与头像；对接 `UserAdmin/GetMyAsync` 等接口，登录后合并信息至右上角展示。 | [个人中心](./modules/_core/profile.md) | 2026-06-03 |
| dashboard | `/analytics` | 驾驶舱 | 用于展示系统分析类指标与运营概览，是登录后的高层数据观察入口之一。 | [分析看板](./modules/dashboard/analytics.md) | 2026-05-16 |
| dashboard | `/workspace` | 驾驶舱 | 工作台：海运出口服务 + 应收应付/付费申请/业务联系单审核；审核筛选对齐费用审核页，支持费用详情深链与单据深链；业务联系单审核深链进详情。 | [工作台](./modules/dashboard/workspace.md) | 2026-07-26 |
| dashboard | `/dashboard/sea-freight-globe` | 驾驶舱 | 用于以地球可视化方式展示海运相关数据，是 dashboard 分组下的专题看板。 | [海运 3D 地球看板](./modules/dashboard/sea-freight-globe.md) | 2026-05-16 |
| clients | `/clients` | 客户管理 | 维护客户主数据列表，是客户新建、编辑、删除和业务选择的统一入口。 | [客户列表](./modules/clients/index.md) | 2026-07-12 |
| clients | `/clients/create` | 客户管理 | 创建客户基础资料，为后续联系人、账期、发票、附件等客户子资料提供主记录。 | [客户新建](./modules/clients/create.md) | 2026-05-16 |
| clients | `/clients/:id/edit` | 客户管理 | 维护单个客户的完整资料，聚合基础信息、联系人、付款条件、发票与附件等子页面；账期删除大数 ID 原样透传。 | [客户编辑](./modules/clients/id-edit.md) | 2026-07-12 |
| sea-exports | `/sea-exports` | 操作管理 / 海运出口 | 海运出口列表是委托单检索、进入新建和编辑的业务入口；支持多选后运踪批量订阅，并可按权限删除单条勾选委托。侧边栏收纳于「操作管理」分组。 | [海运出口列表](./modules/sea-exports/index.md) | 2026-07-25 |
| sea-exports | `/sea-exports/create` | 操作管理 / 海运出口 | 创建新的海运出口委托单；保存成功后 replace 进入编辑工作台并关闭原新建页标签；未保存时切标签/跳转弹二次确认。 | [海运出口新建](./modules/sea-exports/create.md) | 2026-07-25 |
| sea-exports | `/sea-exports/:id/edit` | 操作管理 / 海运出口 | 编辑页聚合基础信息、费用、更改单、附件及相关执行子模块；场站联系人在标签旁展示，保存时透传防空覆盖。 | [海运出口编辑工作台](./modules/sea-exports/id-edit.md) | 2026-07-25 |
| sea-exports | （运踪订阅字段） | 操作管理 / 海运出口 | 运踪订阅链路字段清单：请求仅 `seaExportIds`；后端按装运方式组装船公司+主提单/首箱；状态两字段与结果明细对照。 | [运踪订阅字段清单](./modules/sea-exports/yundang-subscribe-fields.md) | 2026-07-25 |
| sea-exports | `/sea-exports/:id/edit` Tab「更改单」 | 操作管理 / 海运出口 | 更改单选择器+历史抽屉；订单信息顶部通铺；费用表内切换应收应付并整体保存。 | [更改单](./modules/sea-exports/change-order.md) | 2026-07-25 |
| pre-order | `/pre-order` | 操作管理 / 业务联系单 | 业务联系单列表：海运出口委托的前置单据检索入口，支持新建、按单复制、按状态限制的删除；双击按状态进编辑或详情。 | [业务联系单列表](./modules/pre-order/index.md) | 2026-07-26 |
| pre-order | `/pre-order/add`、`/pre-order/:id/edit` | 操作管理 / 业务联系单 | 业务联系单工作台：布局对齐海运出口（主栏分区 + 右侧干系人）；基础 meta 含业务类型/装运方式；收发通（id+Content 三组）/港口信息（海出同款流转卡片 + 港口备注）/货物箱型（标题栏内联货物类型+品名；左箱型表右竖排计量）/主流程服务/费用；提交、撤回、审核、审核后驳回与审核时间轴；通过后内嵌关联海运出口编辑器；状态流转后与详情路由对齐。 | [业务联系单编辑](./modules/pre-order/id-edit.md) | 2026-07-26 |
| pre-order | `/pre-order/:id/detail` | 操作管理 / 业务联系单 | 业务联系单详情：布局对齐编辑页，字段纯文本展示（无表单控件）与审核入口；通过后可切关联海运出口。 | [业务联系单详情](./modules/pre-order/id-detail.md) | 2026-07-26 |
| sea-imports | `/sea-imports` | 操作管理 / 海运进口 | 海运进口列表是委托单检索、进入新建和编辑的业务入口。侧边栏收纳于「操作管理」分组。 | [海运进口列表](./modules/sea-imports/index.md) | 2026-07-12 |
| sea-imports | `/sea-imports/create` | 操作管理 / 海运进口 | 创建新的海运进口委托单，提交成功后进入编辑工作台继续维护费用和子业务。 | [海运进口新建](./modules/sea-imports/create.md) | 2026-07-11 |
| sea-imports | `/sea-imports/:id/edit` | 操作管理 / 海运进口 | 编辑页是海运进口的核心业务容器，聚合基础信息、费用、更改单及相关执行子模块。 | [海运进口编辑工作台](./modules/sea-imports/id-edit.md) | 2026-07-25 |
| freight-rate | `/freight-rate` | 航线管理 / 运价查询 | 维护海运运价信息，为委托费用测算和报价提供基础数据入口；侧边栏位于「航线管理」分组下。 | [运价查询](./modules/freight-rate/index.md) | 2026-07-26 |
| schedule-query | `/schedule` | 航线管理 / 船期查询 | 船期实时查询；起始/目的港用 PortSelect（EDI）；筛选一行 6 列默认收起；双击行内嵌船舶 AIS 定位。 | [船期查询](./modules/schedule-query/index.md) | 2026-07-16 |
| fee-management | `/fee-management/payment-application` | 费用管理 | 付款申请列表用于查询、创建和进入付款申请单编辑，是应付费用付款流程入口。 | [付款申请列表](./modules/fee-management/payment-application.md) | 2026-07-12 |
| fee-management | `/fee-management/payment-application/add` | 费用管理 | 创建付款申请单，选择可申请的应付费用并形成待审核付款申请。 | [付款申请新增](./modules/fee-management/payment-application-add.md) | 2026-07-24 |
| fee-management | `/fee-management/payment-application/:id/edit` | 费用管理 | 编辑已有付款申请单，在状态允许时调整明细并提交。 | [付款申请编辑](./modules/fee-management/payment-application-id-edit.md) | 2026-07-25 |
| fee-management | `/fee-management/statement` | 费用管理 | 对账单列表用于管理客户或供应商对账单，是结算确认的入口。 | [对账单列表](./modules/fee-management/statement.md) | 2026-07-11 |
| fee-management | `/fee-management/statement/add` | 费用管理 | 创建对账单，选择费用并形成可结算的对账记录。 | [对账单新增](./modules/fee-management/statement-add.md) | 2026-07-11 |
| fee-management | `/fee-management/statement/:id/edit` | 费用管理 | 编辑已有对账单，在状态允许时调整主信息和费用明细。 | [对账单编辑](./modules/fee-management/statement-id-edit.md) | 2026-07-21 |
| fee-management | `/settlement-management/receive-settlement` | 费用管理 / 收费核销 | 收费核销列表与编辑入口，支持「按费用（type=0）」与「按开票申请（发票结算 type=1）」两种结算、按类型双击进入对应表单、锁定只读与银行流水页联动；菜单在「费用管理」下，URL 不变。 | [收费核销](./modules/settlement-management/receive-settlement.md) | 2026-07-25 |
| settlement-management | `/settlement-management/payment-settlement/edit/:id` | 财务管理 | 付费结算编辑：把已审核的付费申请按结算币别折算合并为付款单，维护汇率快照与三层结算明细；结算对象与币别随第一张申请锁定。 | [付费结算编辑](./modules/settlement-management/payment-settlement-id-edit.md) | 2026-07-25 |
| settlement-management | `/bank-statement` | 财务管理 | 银行流水列表，检索流水并进入新建/编辑；操作人列展示姓名。侧边栏位于「财务管理」分组。 | [银行流水列表](./modules/settlement-management/bank-statement-list.md) | 2026-07-25 |
| settlement-management | `/bank-statement/edit/:id` | 财务管理 | 财务核销工作台：汇总流水、已核销和剩余金额；仅待核销可改流水；收费核销新增、查看与编辑统一在抽屉完成。 | [银行流水编辑](./modules/settlement-management/bank-statement-edit.md) | 2026-07-25 |
| settlement-management | `/settlement-management/fee-lock` | 财务管理 | 按运输单维度执行费用锁定或解锁，控制订单费用是否可继续变更。 | [费用锁定](./modules/settlement-management/fee-lock.md) | 2026-07-12 |
| audit-approval | `/audit-approval/expense-review` | 审核审批 | 集中处理订单费用新增、修改、删除等提交任务的审核。 | [费用审核](./modules/audit-approval/expense-review.md) | 2026-07-12 |
| audit-approval | `/audit-approval/payment-review` | 审核审批 | 处理付款申请审批任务；主从布局展示费用合计、附件与费用明细，支持审核全部与批量驳回。 | [付费审批](./modules/audit-approval/payment-review.md) | 2026-07-12 |
| audit-approval | `/audit-approval/pre-order-review` | 审核审批 | 业务联系单审核任务列表；行上并列任务信息与单据信息，双击进 `/pre-order/:id/detail` 执行审核，可查看审批时间轴。 | [业务联系单审核](./modules/audit-approval/pre-order-review.md) | 2026-07-26 |
| audit-approval | `/audit-approval/expense-review/:id/expense-detail/:entityId` | 审核审批 | 费用审核详情：支持列表内嵌与独立路由深链（路由 props 映射 transportOrderId/entityId）。 | [费用审核详情](./modules/audit-approval/expense-review-id-expense-detail-entityId.md) | 2026-07-12 |
| basic-data | `/basic-data/carrier` | 基础资料 | 船公司/承运人基础资料，为委托和运价提供承运主体。 | [船公司资料](./modules/basic-data/carrier.md) | 2026-05-30 |
| basic-data | `/basic-data/code-invoice` | 基础资料 | 维护发票相关代码，支撑客户发票资料和结算开票口径。 | [发票代码](./modules/basic-data/code-invoice.md) | 2026-05-16 |
| basic-data | `/basic-data/code-service` | 基础资料 | 维护服务项目代码，支撑委托服务项与费用识别。 | [服务代码](./modules/basic-data/code-service.md) | 2026-05-16 |
| basic-data | `/basic-data/code-goods` | 基础资料 | 维护货物类型代码，支撑委托货物信息录入。 | [货物代码](./modules/basic-data/code-goods.md) | 2026-05-16 |
| basic-data | `/basic-data/code-package` | 基础资料 | 维护包装类型代码，支撑件数、包装等货物字段。 | [包装代码](./modules/basic-data/code-package.md) | 2026-05-16 |
| basic-data | `/basic-data/code-issue-type` | 基础资料 | 维护问题或异常类型，支撑业务问题记录分类。 | [问题类型代码](./modules/basic-data/code-issue-type.md) | 2026-05-16 |
| basic-data | `/basic-data/attachment-dtl-type` | 基础资料 | 维护附件详细类型及默认展示模块，支撑业务附件分类与客户可见性配置。 | [附件类型](./modules/basic-data/attachment-dtl-type.md) | 2026-06-23 |
| basic-data | `/basic-data/code-source` | 基础资料 | 维护业务来源代码，支撑客户或委托来源识别。 | [来源代码](./modules/basic-data/code-source.md) | 2026-05-16 |
| basic-data | `/basic-data/code-frt` | 基础资料 | 维护运费相关代码，支撑费用录入和运价映射。 | [运费代码](./modules/basic-data/code-frt.md) | 2026-05-16 |
| basic-data | `/basic-data/currency` | 基础资料 | 维护币种资料，支撑费用、运价、付款和结算金额。 | [币种资料](./modules/basic-data/currency.md) | 2026-05-16 |
| basic-data | `/basic-data/fee-name` | 基础资料 | 维护费用名称字典，是费用录入和费用代码的基础。 | [费用名称](./modules/basic-data/fee-name.md) | 2026-05-16 |
| basic-data | `/basic-data/fee-code` | 基础资料 | 维护费用代码及费用属性，支撑应收应付费用明细；默认币别大数 ID 字符串透传。 | [费用代码](./modules/basic-data/fee-code.md) | 2026-07-12 |
| settlement-management | `/settlement-management/exchange-rate` | 财务管理 | 维护币种汇率，为跨币种费用、付款和结算提供换算基础；币别大数 ID 字符串透传。 | [汇率资料](./modules/basic-data/exchange-rate.md) | 2026-07-12 |
| basic-data | `/basic-data/lane-code` | 基础资料 | 维护航线代码，支撑运价、港口和委托航线字段。 | [航线代码](./modules/basic-data/lane-code.md) | 2026-05-30 |
| basic-data | `/basic-data/port-code` | 基础资料 | 维护港口资料，支撑起运港、目的港、卸货港等字段；国家/航线大数 ID 字符串透传。 | [港口代码](./modules/basic-data/port-code.md) | 2026-07-12 |
| basic-data | `/basic-data/ctn-code` | 基础资料 | 维护箱型箱量代码，支撑运价和委托箱型信息。 | [箱型代码](./modules/basic-data/ctn-code.md) | 2026-06-20 |
| basic-data | `/basic-data/country-code` | 基础资料 | 维护国家资料，支撑港口、客户地址和业务区域字段。 | [国家代码](./modules/basic-data/country-code.md) | 2026-05-30 |
| basic-data | `/basic-data/generate-num` | 基础资料 | 维护业务编号生成规则，支持组织、用户或全局范围的编号策略。 | [编号规则](./modules/basic-data/generate-num.md) | 2026-07-14 |
| basic-data | `/basic-data/se-service-config` | 基础资料 | 维护海运出口按起运港的服务项模板、顺序、责任角色和字段规则。 | [海运出口港口服务项配置](./modules/basic-data/se-service-config.md) | 2026-07-12 |
| system | `/system/user` | 系统管理 | 维护系统用户、组织、角色、数据权限和登录相关基础信息；列表展示所属组织完整路径。 | [用户管理](./modules/system/user.md) | 2026-07-16 |
| system | `/system/role` | 系统管理 | 维护角色及角色权限，是权限分配的核心入口。 | [角色管理](./modules/system/role.md) | 2026-05-30 |
| system | `/system/permission` | 系统管理 | 维护用户数据权限和权限范围，当前路由暂用用户权限范围字段作为入口权限。 | [权限管理](./modules/system/permission.md) | 2026-07-19 |
| system | `/system/dept` | 系统管理 | 维护组织/部门树，为用户归属、数据权限和业务组织范围提供基础。 | [部门管理](./modules/system/dept.md) | 2026-07-15 |
| system | `/system/workflow` | 系统管理 | 维护审批工作流列表，支撑费用审核与付款申请审核等任务链路。 | [工作流列表](./modules/system/workflow.md) | 2026-05-16 |
| system | `/system/workflow/create` | 系统管理 | 创建审批工作流，配置任务类型（含业务联系单 PreOrder=8）、条件和审批节点。 | [工作流新建](./modules/system/workflow-create.md) | 2026-07-26 |
| system | `/system/workflow/edit/:id` | 系统管理 | 编辑已有审批工作流，维护节点、条件和适用任务类型（含业务联系单）。 | [工作流编辑](./modules/system/workflow-edit-id.md) | 2026-07-26 |
| system | `/system/enumeration` | 系统管理 | 维护系统枚举项，为前端字典、状态展示和业务选项提供数据来源；`ServiceType` 子项可维护业务流程标记 `extra1`。 | [枚举管理](./modules/system/enumeration.md) | 2026-07-12 |
| announcement | `/system/announcement` | 公告管理 | 维护系统公告（富文本与附件），登录后对具备查看权限的用户弹出未读公告；新增与批量删除入口按动作权限显示。独立顶级菜单。 | [公告管理](./modules/system/announcement.md) | 2026-07-14 |
| system | `/system/cache` | 系统管理 | 查看或清理系统缓存，辅助排查字典、权限或配置刷新问题。 | [缓存管理](./modules/system/cache.md) | 2026-05-16 |
| system | `/system/global-font` | 系统管理 | 统一前端页面与组件字体来源；hhyy/jiayue/jht 全部走固定 OSS 直连；本地 TTF 已移除且 SW 已停用。 | [全局字体配置](./modules/system/global-font.md) | 2026-06-03 |
| shared | （全站根布局） | 共享能力 | 津海通品牌桌宠：Three.js 加载 OSS GLB，可拖拽/关闭并按品牌持久化。 | [津海通桌宠](./modules/shared/jht-mascot.md) | 2026-07-26 |
| shared | （顶栏布局） | 共享能力 | 顶栏「进入会议」按品牌带入会议号：津海通 999999，hhyy/佳越 123456。 | [顶栏在线会议](./modules/shared/layout-meeting.md) | 2026-07-12 |
| shared | （全站业务表单） | 共享能力 | 统一客户、港口、船公司、币别等业务选择组件的分页检索、标签回显与禁用只读展示；雪花 ID 禁止 Number 转换；`MyOrgSelect`（本人组织）与 `UserOrgSelect`（指定用户组织）均可录入多组织 `orgId`；禁用无值只读态显示 `-`。 | [业务选择组件](./modules/shared/biz-select.md) | 2026-07-26 |
| shared | （全站全局弹窗） | 共享能力 | 货物轨迹全局单例弹窗：`useTrackingMap().open({ mblNo })` 打开，iframe 内嵌 trackingeyes 地图；工具栏展示白标品牌 Logo；企业编号与地址收敛到 env；支持中英文切换（英文分享链接带 `lang=en`）；运踪信息/运踪详情弹窗已接入「查看轨迹地图」入口。 | [全局货物轨迹弹窗](./modules/shared/tracking-map-modal.md) | 2026-07-16 |
| shared | `/tracking-map/:mblNo?` | 共享能力 | 货物轨迹独立静态页：免登录、URL 传订阅号、iframe 内嵌轨迹地图、页头品牌 logo 随 VITE_APP_BRAND 自动切换；支持 `?lang=en` 英文分享；可分享给外部客户。 | [货物轨迹独立静态页](./modules/shared/tracking-map-page.md) | 2026-07-14 |
| shared | （全站分页 vxe 列表） | 共享能力 | 分页列表列头远程多列排序，统一 `sorting` 参数与 `createPagedListQuery` 接入。 | [vxe 列表排序](./modules/shared/vxe-list-sorting.md) | 2026-06-21 |
| shared | （全站 vxe 列表） | 共享能力 | 列显隐/顺序/固定/列宽按用户与 tableId 持久化，工具栏恢复默认一并重置；columns 引用稳定化避免无关重算重置列。 | [vxe 列配置持久化](./modules/shared/vxe-column-persist.md) | 2026-07-12 |
| shared | （全站页面级表单） | 共享能力 | 未保存内容离开拦截：`useUnsavedGuard({ isDirty })` + 全局 `beforeEach`，切标签/菜单跳转/后退/关闭当前标签时二次确认；首个接入方为海运出口新建与编辑工作台。 | [未保存内容离开拦截](./modules/shared/unsaved-guard.md) | 2026-07-14 |
