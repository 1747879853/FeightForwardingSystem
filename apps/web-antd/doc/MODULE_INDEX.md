| 模块名称 | 页面/路由 | 业务域/分类 | 一句话描述 | 文档链接 | 最近更新时间 |
| --- | --- | --- | --- | --- | --- |
| \_core | `/profile` | 账户与认证 | 当前用户维护个人资料、修改密码与头像；对接 `UserAdmin/GetMyAsync` 等接口，登录后合并信息至右上角展示。 | [个人中心](./modules/_core/profile.md) | 2026-06-03 |
| \_core | `/auth/login` | 账户与认证 | 登录入口：账号密码 + 滑动验证（DEV 可跳过）；品牌背景/Logo；站点 favicon 与默认 `/logo.png` 取自 `public/`。 | [登录页](./modules/_core/login.md) | 2026-08-14 |
| dashboard | `/analytics` | 驾驶舱 | 用于展示系统分析类指标与运营概览，是登录后的高层数据观察入口之一。 | [分析看板](./modules/dashboard/analytics.md) | 2026-05-16 |
| dashboard | `/workspace` | 驾驶舱 | 工作台：海运出口服务 + 应收应付/付费申请/业务联系单审核；审核筛选对齐费用审核页，支持费用详情深链与单据深链；业务联系单审核深链进详情。 | [工作台](./modules/dashboard/workspace.md) | 2026-08-10 |
| dashboard | `/dashboard/sea-freight-globe` | 驾驶舱 | 海运 3D 地球看板；**仅 hhyy 打包可见**，其他品牌不注册路由、默认首页为 `/analytics`。 | [海运 3D 地球看板](./modules/dashboard/sea-freight-globe.md) | 2026-08-14 |
| clients | `/clients` | 客户管理 | 维护客户主数据列表，是客户新建、编辑、删除和业务选择的统一入口。 | [客户列表](./modules/clients/index.md) | 2026-07-12 |
| clients | `/clients/create` | 客户管理 | 创建客户基础资料，为后续联系人、账期、发票、附件等客户子资料提供主记录。 | [客户新建](./modules/clients/create.md) | 2026-05-16 |
| clients | `/clients/:id/edit` | 客户管理 | 维护单个客户的完整资料，聚合基础信息、联系人、付款条件、发票与附件等子页面；账期删除大数 ID 原样透传。 | [客户编辑](./modules/clients/id-edit.md) | 2026-07-12 |
| sea-exports | `/sea-exports` | 操作管理 / 海运出口 | 海运出口列表是委托单检索、进入新建和编辑的业务入口；支持多选后运踪批量订阅（按打包品牌分流：sjtd 用现有运踪、其他品牌用新服务商），主提单号前带异常预警叹号，并可按权限删除单条勾选委托。侧边栏收纳于「操作管理」分组。 | [海运出口列表](./modules/sea-exports/index.md) | 2026-08-16 |
| sea-exports | `/sea-exports/create` | 操作管理 / 海运出口 | 创建新的海运出口委托单；收发通可折叠且默认展开；货物区右侧为内外部备注 Tab；基础信息 6 列顺序对齐业务稿；保存成功后 replace 进入编辑工作台并关闭原新建页标签；未保存时切标签/跳转弹二次确认；箱型箱量支持批量新增；必填失败 toast 点名缺项。 | [海运出口新建](./modules/sea-exports/create.md) | 2026-08-17 |
| sea-exports | `/sea-exports/:id/edit` | 操作管理 / 海运出口 | 编辑页聚合基础信息、费用、更改单、附件及相关执行子模块；收发通可折叠且默认展开；货物区右侧为内外部备注 Tab；基础信息 6 列顺序对齐业务稿；场站联系人在标签旁展示，保存时透传防空覆盖；干系人可用角色由枚举 `SeaExportUserAttribute` 配置（销售/操作固定）；页头委托编号支持一键重新生成；港口详情已对象化，回显整对象注入 selectedItems；基础信息保存成功后下发最新详情并清理费用联动缓存；集装箱合计含体积；船名/航次右侧可查询码头船舶，确定引入后回填实际开船/航次/截港等并保存。 | [海运出口编辑工作台](./modules/sea-exports/id-edit.md) | 2026-08-17 |
| sea-exports | （运踪订阅字段） | 操作管理 / 海运出口 | 运踪订阅链路字段清单：请求仅 `seaExportIds`；后端按装运方式组装船公司+主提单/首箱；状态两字段与结果明细对照。 | [运踪订阅字段清单](./modules/sea-exports/yundang-subscribe-fields.md) | 2026-07-25 |
| sea-exports | `/sea-exports/:id/edit` Tab「更改单」 | 操作管理 / 海运出口 | 更改单选择器+历史抽屉；订单信息顶部通铺；费用表内切换应收应付并整体保存；可接收编辑页保存后的最新详情联动刷新。 | [更改单](./modules/sea-exports/change-order.md) | 2026-08-08 |
| pre-order | `/pre-order` | 业务联系单 | 业务联系单列表：侧边栏一级菜单；检索入口，支持分组统计（委托单位/船公司/港口/业务类型）、销售/操作/备注列与筛选、新建、复制、按状态限制删除；双击进编辑页；委托单位筛选 `industryCategory=p`。 | [业务联系单列表](./modules/pre-order/index.md) | 2026-08-14 |
| pre-order | `/pre-order/add`、`/pre-order/:id/edit` | 业务联系单 | 业务联系单工作台：主表 6 列顺序对齐业务稿（付款方式在首行末项，贸易条款/运输条款合并，订舱代理在末行），收发通内嵌折叠；录入/驳回可保存提交并支持 TextIn AI 识别预填；待审核/通过仅审核；通过后内嵌海出；各下拉用详情外键对象回显。 | [业务联系单编辑](./modules/pre-order/id-edit.md) | 2026-08-17 |
| pre-order | `/pre-order/:id/detail` | 业务联系单 | 历史详情路由，重定向到 `/pre-order/:id/edit`。 | [业务联系单编辑](./modules/pre-order/id-edit.md) | 2026-08-02 |
| sea-imports | `/sea-imports` | 操作管理 / 海运进口 | 海运进口列表是委托单检索、进入新建和编辑的业务入口；码头为往来单位筛选，含联运单号/分单号/贸易方式；支持多选运踪批量订阅、「运踪状态」列与主提单号前异常预警叹号。侧边栏收纳于「操作管理」分组。 | [海运进口列表](./modules/sea-imports/index.md) | 2026-08-16 |
| sea-imports | `/sea-imports/create` | 操作管理 / 海运进口 | 创建新的海运进口委托单；码头走往来单位下拉；集装箱规格/型号按品名 id 选择；收发通可折叠且默认展开；货物区件数包装同行，右侧为内外部备注 Tab（多行 textarea）；提交成功后进入编辑工作台。 | [海运进口新建](./modules/sea-imports/create.md) | 2026-08-16 |
| sea-imports | `/sea-imports/:id/edit` | 操作管理 / 海运进口 | 编辑页是海运进口的核心业务容器；基础信息对齐最新接口（码头对象、规格型号 id、联运/分单/贸易方式）；收发通可折叠且默认展开；货物区件数包装同行，右侧为内外部备注 Tab（多行 textarea）；保存后下发最新详情联动费用/更改单；船名/航次右侧可查询码头船舶，确定引入后回填航次并保存；基础信息工具栏支持单票运踪订阅；「运踪信息」Tab 展示当前节点、集装箱清单、全量异常预警、轨迹地图与刷新运踪。 | [海运进口编辑工作台](./modules/sea-imports/id-edit.md) | 2026-08-17 |
| air-exports | `/air-exports` | 操作管理 / 空运出口 | 空运出口列表：关键字搜 5 字段、9 维分组统计、复制与删除；运踪已切新服务商，支持多选批量订阅、「运踪状态」列与主运单号前异常预警叹号。 | [空运出口列表](./modules/air-exports/index.md) | 2026-08-17 |
| air-exports | `/air-exports/create` | 操作管理 / 空运出口 | 空运出口新建：三段航段（起运地/中转地/目的地），航班与订舱代理在航段标题右侧；收发通可折叠且默认展开；货物区件数包装同行、右侧为内外部备注 Tab（多行 textarea）；货物明细可编辑表格、体积/体积重/计费重/泡比四个前端派生值。 | [空运出口新建](./modules/air-exports/create.md) | 2026-08-17 |
| air-exports | `/air-exports/:id/edit` | 操作管理 / 空运出口 | 空运出口编辑：基础信息、只读应收应付、附件、运踪信息四个标签；收发通可折叠且默认展开；货物区件数包装同行、右侧为内外部备注 Tab（多行 textarea）；航班与订舱代理在航段标题右侧；支持重新生成委托编号、复制与运踪订阅；运踪 Tab 已切新服务商（摘要、全量异常预警、轨迹地图、重新订阅）；基础信息保存后联动刷新只读费用与收付徽标。 | [空运出口编辑](./modules/air-exports/id-edit.md) | 2026-08-17 |
| freight-rate | `/freight-rate` | 航线管理 / 运价查询 | 维护海运运价信息，为委托费用测算和报价提供基础数据入口；侧边栏位于「航线管理」分组下。 | [运价查询](./modules/freight-rate/index.md) | 2026-07-26 |
| schedule-query | `/schedule` | 航线管理 / 船期查询 | 船期实时查询；起始/目的港用 PortSelect（EDI）；筛选一行 6 列默认收起；双击行内嵌船舶 AIS 定位。 | [船期查询](./modules/schedule-query/index.md) | 2026-08-09 |
| port-congestion | `/port-congestion` | 航线管理 / 港口拥堵分析 | 港口拥堵实时查询；标题栏选港口（EDI 五字码）即查最近 15 天在港/靠泊/离港船数与平均候泊/作业/在港时长，含拥堵与天气两套等级、双轴趋势图、每日明细展开行（含船舶 MMSI）；权限走第三方接口查看。 | [港口拥堵分析](./modules/port-congestion/index.md) | 2026-08-16 |
| fee-management | `/fee-management/payment-application` | 费用管理 | 付款申请列表用于查询、创建和进入付款申请单编辑；申请合计按原币/固定币别分口径展示。 | [付款申请列表](./modules/fee-management/payment-application.md) | 2026-08-11 |
| fee-management | `/fee-management/payment-application/add` | 费用管理 | 创建付款申请；添加费用抽屉可筛业务类型，按业务简要读港口备注，按币别展示已选合计并保留跨页勾选。 | [付款申请新增](./modules/fee-management/payment-application-add.md) | 2026-08-14 |
| fee-management | `/fee-management/payment-application/:id/edit` | 费用管理 | 编辑付款申请；添加费用抽屉可筛业务类型并按业务简要读港口备注；驳回后可再次提交。 | [付款申请编辑](./modules/fee-management/payment-application-id-edit.md) | 2026-08-14 |
| fee-management | `/fee-management/statement` | 费用管理 | 对账单列表用于管理客户或供应商对账单，是结算确认的入口。 | [对账单列表](./modules/fee-management/statement.md) | 2026-08-09 |
| fee-management | `/fee-management/statement/add` | 费用管理 | 创建对账单，选择费用并形成可结算的对账记录。 | [对账单新增](./modules/fee-management/statement-add.md) | 2026-08-09 |
| fee-management | `/fee-management/statement/:id/edit` | 费用管理 | 编辑已有对账单，在状态允许时调整主信息和费用明细。 | [对账单编辑](./modules/fee-management/statement-id-edit.md) | 2026-08-09 |
| fee-management | `/settlement-management/receive-settlement` | 费用管理 / 收费核销 | 收费核销列表与编辑入口，支持「按费用（type=0）」与「按开票申请（发票结算 type=1）」两种结算、新建必选归属组织、明细表只读展示同一流水下他人核销明细、按类型双击进入对应表单、锁定只读与银行流水页联动；菜单在「费用管理」下，URL 不变。 | [收费核销](./modules/settlement-management/receive-settlement.md) | 2026-08-10 |
| settlement-management | `/settlement-management/payment-settlement/edit/:id` | 财务管理 | 付费结算编辑：把已审核的付费申请按结算币别折算合并为付款单，维护汇率快照与三层结算明细；结算对象与币别随第一张申请锁定。 | [付费结算编辑](./modules/settlement-management/payment-settlement-id-edit.md) | 2026-08-10 |
| settlement-management | `/bank-statement` | 财务管理 | 银行流水列表，检索流水并进入新建/编辑；操作人列展示姓名。侧边栏位于「财务管理」分组。 | [银行流水列表](./modules/settlement-management/bank-statement-list.md) | 2026-08-10 |
| settlement-management | `/bank-statement/edit/:id` | 财务管理 | 财务核销工作台：顶部左流水基础信息、右核销进度；锁定后基础信息纯文本只读；收费核销在抽屉完成。 | [银行流水编辑](./modules/settlement-management/bank-statement-edit.md) | 2026-08-11 |
| settlement-management | `/settlement-management/fee-lock` | 财务管理 | 按运输单维度执行费用锁定或解锁，控制订单费用是否可继续变更。 | [费用锁定](./modules/settlement-management/fee-lock.md) | 2026-07-12 |
| audit-approval | `/audit-approval/expense-review` | 审核审批 | 集中处理订单费用新增、修改、删除等提交任务的审核；嵌套详情不用全局路由 id 兜底。 | [费用审核](./modules/audit-approval/expense-review.md) | 2026-08-09 |
| audit-approval | `/audit-approval/payment-review` | 审核审批 | 付费申请审批；列表申请合计按原币/固定币别分口径；通过/驳回走 AuditAsync、审核后驳回走 RejectAsync。 | [付费申请审批](./modules/audit-approval/payment-review.md) | 2026-08-11 |
| audit-approval | `/audit-approval/pre-order-review` | 审核审批 | 业务联系单审核任务列表；行上并列任务信息与单据信息，双击进 `/pre-order/:id/edit` 执行审核，可查看审批时间轴。 | [业务联系单审核](./modules/audit-approval/pre-order-review.md) | 2026-07-26 |
| audit-approval | `/audit-approval/expense-review/:id/expense-detail/:entityId` | 审核审批 | 费用审核详情：支持列表内嵌与独立路由深链（路由 props 映射 transportOrderId/entityId）。 | [费用审核详情](./modules/audit-approval/expense-review-id-expense-detail-entityId.md) | 2026-07-12 |
| basic-data | `/basic-data/carrier` | 基础资料 | 船公司/承运人基础资料，为委托和运价提供承运主体。 | [船公司资料](./modules/basic-data/carrier.md) | 2026-05-30 |
| basic-data | `/basic-data/code-invoice` | 基础资料 | 维护发票相关代码，支撑客户发票资料和结算开票口径。 | [发票代码](./modules/basic-data/code-invoice.md) | 2026-05-16 |
| basic-data | `/basic-data/code-service` | 基础资料 | 维护服务项目代码，支撑委托服务项与费用识别。 | [服务代码](./modules/basic-data/code-service.md) | 2026-05-16 |
| basic-data | `/basic-data/code-goods` | 基础资料 | 维护商品品名及规格/型号子表，支撑委托与海运进口箱表规格型号下拉。 | [货物代码](./modules/basic-data/code-goods.md) | 2026-08-16 |
| basic-data | `/basic-data/code-package` | 基础资料 | 维护包装类型代码，支撑件数、包装等货物字段。 | [包装代码](./modules/basic-data/code-package.md) | 2026-05-16 |
| basic-data | `/basic-data/code-issue-type` | 基础资料 | 维护问题或异常类型，支撑业务问题记录分类。 | [问题类型代码](./modules/basic-data/code-issue-type.md) | 2026-05-16 |
| basic-data | `/basic-data/attachment-dtl-type` | 基础资料 | 维护附件详细类型及默认展示模块，支撑业务附件分类与客户可见性配置。 | [附件类型](./modules/basic-data/attachment-dtl-type.md) | 2026-08-04 |
| basic-data | `/basic-data/code-source` | 基础资料 | 维护业务来源代码，支撑客户或委托来源识别。 | [来源代码](./modules/basic-data/code-source.md) | 2026-05-16 |
| basic-data | `/basic-data/code-frt` | 基础资料 | 维护运费相关代码，支撑费用录入和运价映射。 | [运费代码](./modules/basic-data/code-frt.md) | 2026-05-16 |
| basic-data | `/basic-data/currency` | 基础资料 | 维护币种资料，支撑费用、运价、付款和结算金额。 | [币种资料](./modules/basic-data/currency.md) | 2026-05-16 |
| basic-data | `/basic-data/fee-name` | 基础资料 | 维护费用名称字典，是费用录入和费用代码的基础。 | [费用名称](./modules/basic-data/fee-name.md) | 2026-05-16 |
| basic-data | `/basic-data/fee-code` | 基础资料 | 维护费用代码及费用属性，支撑应收应付费用明细；默认币别大数 ID 字符串透传。 | [费用代码](./modules/basic-data/fee-code.md) | 2026-07-12 |
| settlement-management | `/settlement-management/exchange-rate` | 财务管理 | 维护币种汇率，为跨币种费用、付款和结算提供换算基础；币别大数 ID 字符串透传。 | [汇率资料](./modules/basic-data/exchange-rate.md) | 2026-07-12 |
| basic-data | `/basic-data/lane-code` | 基础资料 | 维护航线代码，支撑运价、港口和委托航线字段。 | [航线代码](./modules/basic-data/lane-code.md) | 2026-05-30 |
| basic-data | `/basic-data/port-code` | 基础资料 | 维护港口资料，支撑起运港、目的港、卸货港等字段；国家/航线大数 ID 字符串透传；`PortSelect` 精简回显可拉详情补全；列表默认按国家中文名排序并对齐后端可排字段。 | [港口代码](./modules/basic-data/port-code.md) | 2026-08-12 |
| basic-data | `/basic-data/air-port` | 基础资料 | 维护空运机场资料（IATA 三字码、ICAO 码、城市、时区），支撑空运起运/目的机场字段；提供 `AirPortSelect` 业务下拉，国家大数 ID 字符串透传。 | [空运港口](./modules/basic-data/air-port.md) | 2026-08-05 |
| basic-data | `/basic-data/ctn-code` | 基础资料 | 维护箱型箱量代码及普柜/特种柜分类，支撑运价和委托箱型信息。 | [箱型代码](./modules/basic-data/ctn-code.md) | 2026-08-14 |
| basic-data | `/basic-data/country-code` | 基础资料 | 维护国家资料，支撑港口、客户地址和业务区域字段。 | [国家代码](./modules/basic-data/country-code.md) | 2026-05-30 |
| basic-data | `/basic-data/generate-num` | 基础资料 | 维护业务编号生成规则，支持组织、用户或全局范围的编号策略；含海出/海进/空出委托编号及业务日期(ETD)年月规则。 | [编号规则](./modules/basic-data/generate-num.md) | 2026-08-04 |
| basic-data | `/basic-data/se-service-config` | 基础资料 | 维护海运出口按起运港的服务项模板、顺序、责任角色和字段规则。 | [海运出口港口服务项配置](./modules/basic-data/se-service-config.md) | 2026-08-11 |
| system | `/system/user` | 系统管理 | 维护系统用户、组织、角色、数据权限和登录相关基础信息；列表展示所属组织完整路径；可查看用户最终生效权限。 | [用户管理](./modules/system/user.md) | 2026-07-29 |
| system | `/system/role` | 系统管理 | 维护角色及角色权限，是权限分配的核心入口。 | [角色管理](./modules/system/role.md) | 2026-05-30 |
| system | `/system/permission` | 系统管理 | 维护用户数据权限和权限范围，当前路由暂用用户权限范围字段作为入口权限。 | [权限管理](./modules/system/permission.md) | 2026-07-29 |
| system | `/system/dept` | 系统管理 | 维护组织/部门树，为用户归属、数据权限和业务组织范围提供基础；公司级可上传 Logo（打印等）。 | [部门管理](./modules/system/dept.md) | 2026-08-09 |
| system | `/system/workflow` | 系统管理 | 维护审批工作流列表，支撑费用审核与付款申请审核等任务链路。 | [工作流列表](./modules/system/workflow.md) | 2026-05-16 |
| system | `/system/workflow/create` | 系统管理 | 创建审批工作流，配置任务类型（含业务联系单 PreOrder=8）、条件和审批节点；分支条件分「且组 / 或组」，可只配或条件。 | [工作流新建](./modules/system/workflow-create.md) | 2026-08-11 |
| system | `/system/workflow/edit/:id` | 系统管理 | 编辑已有审批工作流，维护节点、条件和适用任务类型（含业务联系单）；分支条件分「且组 / 或组」，可只配或条件。 | [工作流编辑](./modules/system/workflow-edit-id.md) | 2026-08-11 |
| system | `/system/enumeration` | 系统管理 | 维护系统枚举项，为前端字典、状态展示和业务选项提供数据来源；支持 JSON 导入/导出跨公司迁移；子项 `extra1` 按枚举名渲染勾选框（`ServiceType` = 是否业务流程，`SeaExportUserAttribute` = 干系人角色是否默认展示，后者的枚举值还改为用户属性下拉勾选；`SeaImportUserAttribute` 暂未启用）。 | [枚举管理](./modules/system/enumeration.md) | 2026-08-01 |
| announcement | `/system/announcement` | 公告管理 | 维护系统公告（富文本与附件），登录后对具备查看权限的用户弹出未读公告；新增与批量删除入口按动作权限显示。独立顶级菜单。 | [公告管理](./modules/system/announcement.md) | 2026-07-14 |
| system | `/system/cache` | 系统管理 | 查看或清理系统缓存，辅助排查字典、权限或配置刷新问题。 | [缓存管理](./modules/system/cache.md) | 2026-05-16 |
| system | `/system/global-font` | 系统管理 | 统一前端页面与组件字体来源；hhyy/jiayue/jht 全部走固定 OSS 直连；本地 TTF 已移除且 SW 已停用。 | [全局字体配置](./modules/system/global-font.md) | 2026-06-03 |
| shared | （全局偏好） | 共享能力 | 项目级 `preferences.ts` 覆盖：布局/主题/侧边栏/页签/Logo；默认主题圆角 `0.5`。 | [全局偏好覆盖](./modules/shared/preferences.md) | 2026-08-11 |
| shared | （检查更新） | 共享能力 | 定时拉取 `version.json` 比对构建指纹；避免 IIS 压缩导致首页 etag 误报新版本。 | [检查更新](./modules/shared/check-updates.md) | 2026-08-13 |
| shared | （全站根布局） | 共享能力 | 津海通品牌桌宠：Three.js 加载 OSS GLB，可拖拽/关闭并按品牌持久化。 | [津海通桌宠](./modules/shared/jht-mascot.md) | 2026-07-26 |
| shared | （顶栏布局） | 共享能力 | 顶栏「进入会议」按品牌带入会议号：津海通 999999，hhyy/佳越 123456。 | [顶栏在线会议](./modules/shared/layout-meeting.md) | 2026-07-12 |
| shared | （全站业务表单） | 共享能力 | 统一客户、港口、船公司、币别等业务选择组件的分页检索、标签回显与禁用只读展示；雪花 ID 禁止 Number 转换；`MyOrgSelect`（本人组织）与 `UserOrgSelect`（指定用户组织）均可录入多组织 `orgId`；禁用无值只读态显示 `-`；分页下拉搜索不固定注入精简已选项且关键词默认防抖。 | [业务选择组件](./modules/shared/biz-select.md) | 2026-08-05 |
| shared | （全站全局弹窗） | 共享能力 | 货物轨迹全局单例弹窗：`useTrackingMap().open({ mblNo })` 打开，iframe 内嵌 trackingeyes 地图；工具栏展示白标品牌 Logo；企业编号与地址收敛到 env；支持中英文切换（英文分享链接带 `lang=en`）；运踪信息/运踪详情弹窗已接入「查看轨迹地图」入口。 | [全局货物轨迹弹窗](./modules/shared/tracking-map-modal.md) | 2026-07-16 |
| shared | `/tracking-map/:mblNo?` | 共享能力 | 货物轨迹独立静态页：免登录、URL 传订阅号、iframe 内嵌轨迹地图、页头品牌 logo 随 VITE_APP_BRAND 自动切换；支持 `?lang=en` 英文分享；可分享给外部客户。 | [货物轨迹独立静态页](./modules/shared/tracking-map-page.md) | 2026-07-14 |
| shared | `/cargo-tracking/air`、`/cargo-tracking/ocean` | 共享能力 / 运踪 | 新服务商货物轨迹独立静态页：免登录、可分享给外部客户；空运按航司单号前端拼装地址，海运按编码令牌还原轨迹链接；页头品牌 logo 随 VITE_APP_BRAND 切换，支持 `?lang=en`。 | [运踪能力品牌分流](./modules/shared/feituo-tracking-brand-split.md) | 2026-08-16 |
| shared | （运踪品牌分流） | 共享能力 / 运踪 | 按品牌×业务线分流：sjtd 海出保留现有运踪，其余海进/空出/非 sjtd 海出走新服务商；含接口清单、列表预警字段、白标分享、地图 URL 来源与用户侧去品牌化要求。 | [运踪能力品牌分流](./modules/shared/feituo-tracking-brand-split.md) | 2026-08-16 |
| shared | （全站分页 vxe 列表） | 共享能力 | 分页列表列头远程多列排序，统一 `sorting` 参数与 `createPagedListQuery` 接入。 | [vxe 列表排序](./modules/shared/vxe-list-sorting.md) | 2026-06-21 |
| shared | （全站 vxe 列表） | 共享能力 | 列显隐/顺序/固定/列宽按用户与 tableId 持久化，工具栏恢复默认一并重置；columns 引用稳定化避免无关重算重置列；列键与下标解耦，认不出的列回退默认可见并自愈脏配置。 | [vxe 列配置持久化](./modules/shared/vxe-column-persist.md) | 2026-08-02 |
| shared | （全站页面级表单） | 共享能力 | 未保存内容离开拦截：`useUnsavedGuard({ isDirty })` + 全局 `beforeEach`，切标签/菜单跳转/后退/关闭当前标签时二次确认；首个接入方为海运出口新建与编辑工作台。 | [未保存内容离开拦截](./modules/shared/unsaved-guard.md) | 2026-07-14 |
