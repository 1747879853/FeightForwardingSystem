---
title: 船期查询
module: 航线管理
author: auto-doc-sync
last_updated: 2026-09-06
---

# 1. 业务背景说明 (Background)

**白话解释：** 对接飞驼船期实时查询，供业务按港口/船期条件检索航线船期信息。侧边栏位于「航线管理」分组下，子菜单为「船期查询」。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/schedule` |
| 路由名称 | `ScheduleQueryList` |
| 页面组件 | `src/views/schedule-query/list.vue` |
| 权限口径 | `Admin.Schedule` / `Admin.Schedule.Get` |
| 关键源码 | `src/router/routes/modules/freight-rate.ts`<br/>`src/views/schedule-query/list.vue`<br/>`src/views/schedule-query/data.ts`<br/>`src/views/schedule-query/copy-text.ts`<br/>`src/api/schedule/feituo-schedule-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **页面重心：** 查询后首屏就是方案列表。查询条（标题 + 港口对 + 日期 + 查询，查询后含直达/中转胶囊和二次筛选）钉在内容区顶部，滚动方案列表时不跟着走。有结果时「找到 N 个共舱方案，共 M 个班次」与「最近查询」同一行（左统计、右胶囊），Tab 上也带个数。给 UI 的原始说明见 [UI 设计说明](./ui-design-brief.md)。
- **全量船期查询：** 基础条件只保留起运港、目的港、预计离港；查询范围固定 8 周，页面不提供周数选择。点击查询后以 `pageNum=1`、`pageSize=9999`、`weeksOut=8` 调用 `QueryScheduleAsync`，一次取得查询区间内全部班次，不使用服务端表格翻页。后端转第三方时每页上限 1000。
- **方案分组：** 前端按直达/中转 + 共舱 `groupName`（`船公司(航线)` 去重字母序拼接）生成航线方案。计划班期星期只展示（组内众数），不拆组；航程、码头原文、中转港不进分组键。无船名以及 `feeder`/`to be`/`tbn` 班次丢弃，组内按船名+航次去重。完整规则、例子与对照差异见 [方案分组规则](./grouping.md)。
- **前端二次筛选：** 直达/中转、船公司、起运/目的标准码头、船名/航次/航线/中转港关键词和方案排序都作用于已拉取的全量结果，不重复请求实时接口。船公司与码头多选后完整展示已选项，不收成 `+N`。默认按周一至周日排方案，同一天按最近离港。
- **渐进展示：** 首批渲染 80 个方案，可继续按剩余数量追加；折叠方案不挂载班次表。可同时展开多组对照，查询后不自动展开。
- **港口选择：** 起始港/目的港使用系统 `PortSelect`，选中值为 EDI 五字码，回显 `港口英文 (EDI)`；交换港口会带上已选港口对象，避免只换代码丢回显。进页不回填港口。
- **班次比较与完整详情：** 方案卡主标题是共舱名，左侧直达/中转 Tag；下面是星期短写（只写计划班期众数一个）、班次数、码头；右侧航程、最近离港、最早截关（日期与时刻同一行）。展开后用原生表格对照船名、航次、计划离到港、截关、航程；截关时间一行显示；延误写「延误 N 天」。船名旁 i 悬停展示船名/MMSI/IMO/呼号/航次/运营方（班次行已有字段，没有船旗/建造日/箱量）。点击共舱名复制方案名称：先 Clipboard API，失败再 `execCommand`；都失败才提示手动选择。点船名或「详情」打开船期字段弹窗（船舶航线、港口码头、中转路径、时间航程、截点、数据标识）。船舶定位已暂时下线。
- **最近查询：** 成功查询后只把起运港、目的港记在本机 `ffs.schedule-query.recent`，最新在前、最多 6 条。不缓存离港日期；点胶囊沿用查询条当前日期再查。有结果时与方案统计同一行靠右；宽度不够就少显示，不出滚动条。不自动填进查询条。
- **菜单归属：** 与「运价查询」同属侧边栏「航线管理」分组。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作  | 目标状态 | 状态说明                           |
| :------- | :----------- | :------- | :--------------------------------- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **polCode / podCode** | 起始港 / 目的港五字码。 | `PortSelect`（`valueKey=ediCode`） | 提交后带入查询入参。点「最近查询」胶囊才回填。 | 必填（`selectRequired`）。 |
| **mmsi / vessel（AIS 定位）** | 班次上的 MMSI / 船名。船舶定位已暂时下线，字段仍随详情与船名旁悬浮卡展示。 | 查询结果行数据（`QueryScheduleAsync`） | 点船名 / 详情打开字段弹窗；悬停船名旁 i 看标识。 | 选读。 |
| **groupName** | 方案身份：共舱 `船公司(航线)` 去重字母序拼接；无共舱则本班次承运人+航线。 | 前端由 `shareCabins` / `carrierCd`+`routeCode` 生成 | 与直达/中转一起构成分组键；卡片主标题。飞驼方案接口用共舱 `displayName`（标准航线），本地用原始 `routeCode`。 | 有共舱时不用本班次航线代码，避免脏串拆组。 |
| **routeEtd** | 计划离港班期（SUN–SAT）。 | 查询结果行数据 | 卡片只写组内众数一个星期，**不拆组**；「按周班」按该众数排，同日再按最近离港。 | 选读。 |
| **imoNumber / callSign** | IMO 号、呼号。 | 查询结果行数据 | 船名旁悬浮卡与详情弹窗展示。 | 选读。 |
| **shareCabins** | 共舱结果集（scac/carrier/routeCode/displayName）。 | 查询结果行数据 | — | 选读。 |
| **staticEtdWeekOfYear** | 业务周次。 | 查询结果行数据 | — | 选读。 |
| **manifestCutoff / cvCutoff** | 截海外舱单、截放行条时间。 | 查询结果行数据 | — | 选读。 |
| **etd / weeksOut** | 预计离港日期；范围固定 8 周。 | 表单 DatePicker；`weeksOut` 页面常量 `QUERY_WEEKS=8` | 提交时写入查询入参。有 `eta` 时范围(周)不生效（后端语义）。 | `etd` 必填；周数无用户入口。 |
| **pageNum / pageSize** | 实时接口分页参数。 | 页面固定值 `1 / 9999` | 每次基础查询只请求一次；后端转第三方时 `pageSize` 上限 1000。 | 不提供用户修改入口。 |
| **isTransit** | 中转标识（全部/直达/中转）。 | 前端方案筛选 | 只过滤 `allItems`，不再写入接口入参。 | 默认全部。 |
| **carrierCodes / \*Terminals / keyword** | 船公司、两端码头和班次关键词。 | 前端二次筛选 | 支持共舱承运人、船名/航次/航线/中转港模糊匹配。 | 选填。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：实时查询]** 船期数据来自第三方实时接口，不落库；刷新与网络异常需有明确提示。

> [!IMPORTANT] **[卡点 2：方案接口未对接]** 本系统没有港到港方案分组接口，分组由扁平班次在前端重建。青岛→新加坡 8 周对照总数同为 62，直达/中转会差 1：飞驼中转 `CNC` 是 8 条无船名的卡车班次（扁平接口有，本地清洗丢掉）；本地直达多 `WHL(AA1)`（万海 52 天），飞驼方案列表未挂出。对方 `groupName` 用共舱 `displayName`，本地用原始 `routeCode`，会写成 `FEM2`/`FME2` 这种同组不同字。超过 1000 条时还受后端分页上限影响。

> [!IMPORTANT] **[卡点 3：方案名称复制]** `navigator.clipboard.writeText` 在 HTTP、无权限或页面失焦时会抛错。复制必须在 catch 后走 `execCommand`，不能只提示手动选择。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-09-06 | `Fix` | 点击方案名称复制：Clipboard API 失败后回退 `execCommand`，减少「复制失败，请手动选择方案名称」。 | `copy-text.ts` 先 `writeText`，reject 或缺能力再隐藏 textarea 复制。详见 `changelogs/change-log-2026-09-06-schedule-copy-group-name.md`。 |
| 2026-09-02 | `Style` | 班次表船名、航次分列；截关时间和卡片最早截关都改为一行。 | 计划离到港仍拆两行。详见 `changelogs/change-log-2026-09-02-schedule-query-vessel-voyage-cutoff-oneline.md`。 |
| 2026-09-02 | `Feature` | 班次表船名旁悬停可看船名、MMSI、IMO、呼号、航次、运营方。 | 只用 `QueryScheduleAsync` 班次字段；没有船旗/建造日/箱量。详见 `changelogs/change-log-2026-09-02-schedule-query-vessel-hover.md`。 |
| 2026-09-02 | `Fix` | 「按周班」卡片只显示一个星期（计划班期众数）；同一天按最近离港排，不再按共舱名字母序。 | 分组键未改。详见 `changelogs/change-log-2026-09-02-schedule-query-weekday-sort-ops.md`。 |
| 2026-09-02 | `Parsing` | 无 | 飞驼方案卡外层一个星期、一个航程，是方案接口的服务属性（`routeEtd` / `maxDuration`），不是组内班次汇总；展开后班次常改期、航程有区间。详见 [方案分组规则](./grouping.md) 第 7 节。 |
| 2026-09-02 | `Parsing` | 无 | 对照飞驼港到港：分组全在 `/application/schedule/p2p/group` 服务端；键仍是直达/中转 + `groupName`，但航线取共舱 `displayName`。CNTAO→SGSIN 当天扁平 635 条重建 47/15，对方 46/16；差在卡车中转 CNC、列表未挂 WHL(AA1)、以及 FEM2/FME2 拼写。详见 [方案分组规则](./grouping.md)、`parsing-logs/parse-log-2026-09-02-schedule-query-freightower-group.md`。 |
| 2026-09-02 | `Fix` | 点查询或最近航线后不再自动把方案列表滚进视口。 | 去掉 `handleQuery` 里的 `scrollIntoView`。详见 `changelogs/change-log-2026-09-02-schedule-query-no-auto-scroll.md`。 |
| 2026-09-02 | `Style` | 查询条日期、关键词去掉突兀描边和投影，对齐港口框与「按周班」下拉。 | 关键词 class 改挂外层 `.keyword-field`，否则打不到 affix wrapper。详见 `changelogs/change-log-2026-09-02-schedule-query-toolbar-input-style.md`。 |
| 2026-09-02 | `Style` | 「找到 N 个共舱方案」与「最近查询」同一行，左统计右胶囊。 | 从 `scheme-board` 抽出 `.result-toolbar`。详见 `changelogs/change-log-2026-09-02-schedule-query-result-recent-row.md`。 |
| 2026-09-02 | `Fix` | 滚动方案列表时查询条（含二次筛选）保持吸顶。 | 布局 `overflow: hidden` 会让 `sticky` 失效；改为 `Page auto-content-height`，列表在 `.schedule-main` 内滚动。详见 `changelogs/change-log-2026-09-02-schedule-query-toolbar-sticky.md`。 |
| 2026-09-02 | `Fix` | 最近查询不缓存离港日；船公司/码头已选项完整展示，不再 `+2`。 | 去掉 `max-tag-count="responsive"`。详见 `changelogs/change-log-2026-09-02-schedule-query-recent-ports-full-tags.md`。 |
| 2026-09-02 | `Fix` | 最近查询只做胶囊、进页不回填港口；历史最多 6 条且不出现滚动条。 | 去掉 `last-ports`；胶囊超出宽度隐藏。详见 `changelogs/change-log-2026-09-02-schedule-query-recent-chips-only.md`。 |
| 2026-09-02 | `Fix` | 刷新回填缓存港口时不再报 `The value 'BRPHE' is not valid for Id.` | `PortSelect` 在 `valueKey=ediCode` 时不打 `DetailAsync`；缓存 `selectedItems.id` 不再填五字码。详见 `changelogs/change-log-2026-09-02-port-select-edi-not-id.md`。 |
| 2026-09-02 | `Fix` | 查询范围固定 8 周；起运/目的港写入本机缓存，下次进页回填，不自动查询。 | `weeksOut` 常量 `QUERY_WEEKS`；港口键 `ffs.schedule-query.last-ports`，缺则回退最近查询第一条。详见 `changelogs/change-log-2026-09-02-schedule-query-fixed-weeks-cache-ports.md`。 |
| 2026-09-02 | `Fix` | 详情弹窗暂时去掉船舶定位，只保留船期完整字段。 | AIS 拼装函数仍留在 `data.ts`。详见 `changelogs/change-log-2026-09-02-schedule-query-drop-ais.md`。 |
| 2026-09-02 | `Fix` | 方案列表拉满内容区宽度；班次表改原生表格；延误展示「延误 N 天」；详情与船舶定位合并为左右分栏弹窗，AIS 按飞驼文档传入 key/clientId/mmsi。 | 去掉 Vben `setData`。iframe 为 `#/ais/vessel?key=&clientId=&mmsi=`；船名去空格对齐 `WANHAIA19`。详见 `changelogs/change-log-2026-09-02-schedule-query-detail-ais.md`。 |
| 2026-09-02 | `Style` | 船期查询按桌面设计稿还原：吸顶工具栏、方案卡层级、班次表两行日期、最近查询胶囊。 | 分组键未改。卡片星期改为组内全部班期短写；图标用设计稿导出 SVG。详见 `changelogs/change-log-2026-09-02-schedule-query-figma-ui.md`。 |
| 2026-09-01 | `Docs` | 无 | 补充给专业 UI 的设计说明：主角是方案列表、必留字段、现稿问题与交付清单。见 [UI 设计说明](./ui-design-brief.md)。 |
| 2026-09-01 | `Fix` | 去掉查询后的航线摘要大卡和重复的 62/613 指标，首屏直接到方案列表。 | 查询+筛选收成一条吸顶工具栏。详见 `changelogs/change-log-2026-09-01-schedule-query-drop-hero-cards.md`。 |
| 2026-09-01 | `Feature` | 方案卡补航程区间、最近离港和截关；班次表直接看截关；可同时展开多组；延误才标红；二次筛选换条件查询后仍保留。 | 分组键未改。`minDuration`/`nearestCyCutoff` 只用于展示与「航程最短」排序。详见 `changelogs/change-log-2026-09-01-schedule-query-ops-ux.md`。 |
| 2026-09-01 | `Parsing` | 无 | 现行方案分组规则沉淀为独立页：键、`groupName`、清洗去重、卡片展示、与飞驼差 1 组。详见 [方案分组规则](./grouping.md)、`parsing-logs/parse-log-2026-09-01-schedule-query-grouping-rules.md`。 |
| 2026-09-01 | `Parsing` | 无 | 直达 47/中转 15 对飞驼 46/16：缺中转 CNC（8 条 TRUCK 空船名），多直达 WHL(AA1)。详见 `parsing-logs/parse-log-2026-09-01-schedule-query-direct-transit-count.md`。 |
| 2026-09-01 | `Feature` | 方案分组改为共舱 `groupName`，星期只展示不拆组；班次表对齐船名/航次/计划离到港/航程；丢掉 feeder/TBN。 | 无方案分组接口，用 `QueryScheduleAsync` 扁平班次重建；键为 `direct\|transit`+`groupName`。青岛→新加坡 8 周对照 62 组。详见 `changelogs/change-log-2026-09-01-schedule-query-align-freightower-group.md`。 |
| 2026-09-01 | `Feature` | 船期查询改为方案工作台：全量拉取、前端分组、直达/中转与船公司/码头/关键词二次筛选，并提供班次完整详情。 | 接口固定 `pageNum=1,pageSize=9999`；`data.ts` 提供纯函数分组/筛选并有单测；首批只渲染 30 个方案，折叠时不挂载表格。详见 `changelogs/change-log-2026-09-01-schedule-query-scheme-workbench.md`。 |
| 2026-08-09 | `Refactor` | 船期查询接口地址迁移到合并后的飞驼服务，页面功能与字段无变化。 | 后端 6 个飞驼 AppService 合并为 `FeituoAdminAppService`，ABP 按类名生成路由故地址随之变化；`feituo-schedule-admin.ts` 的 `API_PREFIX` 改为 `/services/app/FeituoAdmin`，方法名/入参/出参/权限点 `Admin.Schedule.Get` 均未变。详见 `changelogs/change-log-2026-08-09-feituo-yundang-appservice-merge-endpoints.md`。 |
| 2026-07-16 | `Refactor` | 船期查询从独立「船期管理」顶级菜单并入「航线管理」；URL `/schedule` 不变。 | 删除 `schedule.ts`；子路由挂在 `freight-rate.ts`，父级权限聚合 `SeFreiPrice`+`Schedule`。 |
| 2026-07-16 | `Feature` | 起始/目的港改为 PortSelect（EDI 五字码）；筛选一行 6 列、默认收起，中转标识紧邻范围(周)，labelWidth=92。 | 查询入参字段名仍为 `polCode`/`podCode`，仅组件与布局调整。 |
| 2026-07-16 | `Feature` | 双击船期行弹窗，内嵌飞驼可视化船舶 AIS 定位 Iframe，按船名定位。 | 新增 `modules/vessel-ais-modal.vue` 与 `data.ts` 的 `AIS_IFRAME_CONFIG`/`buildAisIframeUrl`；`list.vue` 绑定 `gridEvents.cellDblclick`，`useVbenModal` 承载 Iframe。密钥 `key` 待读取环境变量。 |
| 2026-07-16 | `Refactor` | 船舶 AIS 定位的 Iframe 地址、客户账号与密钥改为读取 `.env`，避免业务密钥散落在页面源码中。 | `AIS_IFRAME_CONFIG` 改读 `import.meta.env.VITE_GLOB_FREIGHTOWER_AIS_*`；`.env` 增加 hash URL、clientId 与 key 占位，hash URL 必须加双引号避免 dotenv 截断。 |
| 2026-07-16 | `Feature` | 对接飞驼 `QueryScheduleAsync` 新增字段，AIS 定位改为优先真实 MMSI；起运/目的/中转港码头优先展示标准化名称。 | DTO 补全 `mmsi`/`imoNumber`/`callSign`/`shareCabins`/`*TerminalCn`/`*UnCode`/`manifestCutoff`/`cvCutoff` 等及 `FeituoShareCabinDto`；`Result` 增 `status`/`size`；`handleRowDblclick` 取 `row.mmsi \|\| row.vessel`；列表码头显示回退 `*TerminalCn \|\| *Terminal`。 |
| 2026-07-16 | `Feature` | 列表全字段展示：为飞驼返回的所有字段补齐表格列（内部字段默认隐藏，工具栏可开启）。 | `useColumns` 补全全部字段列，新增 `text()` 空值兜底与 `formatShareCabins()` 共舱摘要；`pol`/`pod` 组合插槽列 field 改为 `polName`/`podName` 以避免与原始英文名列 field 冲突。 |
| 2026-07-16 | `Style` | 用户可见提示语去掉供应商名称，避免暴露第三方接口来源。 | AIS 未配置密钥提示改为「船舶定位服务未配置，请联系管理员」；无数据提示不再透传接口 `message`；`.env`/代码注释中立化。 |
