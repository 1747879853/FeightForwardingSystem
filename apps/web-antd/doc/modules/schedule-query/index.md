---
title: 船期查询
module: 航线管理
author: auto-doc-sync
last_updated: 2026-08-09
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
| 关键源码 | `src/router/routes/modules/freight-rate.ts`<br/>`src/views/schedule-query/list.vue`<br/>`src/api/schedule/feituo-schedule-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **船期查询：** 按条件调用飞驼 `QueryScheduleAsync` 实时查询船期（不落库）；点击查询按钮才请求（`submitOnChange: false`，`autoLoad: false`）。
- **筛选布局：** 一行 6 列，默认收起；`labelWidth: 92`。收起首行：起始港、目的港、预计离港、范围(周)、中转标识、预计到港。
- **港口选择：** 起始港/目的港使用系统 `PortSelect`，选中值为 EDI 五字码。
- **全字段展示：** 列表默认展示飞驼返回的全部字段（船舶 IMO/MMSI/呼号、母船全称、起运/目的港原始名/国家/码头原始与标准/UNCODE/时区、计划班期、实际离到港、共舱、各截止时间等）；`pathCode`/`pathDescription`/`solutionDescription`/`solutionCode` 等内部字段默认隐藏，可在工具栏「列设置」中开启。
- **船舶 AIS 定位：** 双击列表行弹窗，内嵌船舶定位地图；定位入参优先取行内 `mmsi`，缺失时回退船名 `vessel`；地址、客户账号与密钥分别读取 `.env` 的 `VITE_GLOB_FREIGHTOWER_AIS_URL`、`VITE_GLOB_FREIGHTOWER_AIS_CLIENT_ID`、`VITE_GLOB_FREIGHTOWER_AIS_KEY`。未配置密钥时提示「船舶定位服务未配置，请联系管理员」，不对外暴露供应商名称。
- **菜单归属：** 与「运价查询」同属侧边栏「航线管理」分组。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作  | 目标状态 | 状态说明                           |
| :------- | :----------- | :------- | :--------------------------------- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **polCode / podCode** | 起始港 / 目的港五字码。 | `PortSelect`（`valueKey=ediCode`） | 提交后带入查询入参。 | 必填（`selectRequired`）。 |
| **mmsi / vessel（AIS 定位）** | 双击行时作为飞驼 Iframe 定位入参，优先 `mmsi`，缺失回退 `vessel` 船名。 | 查询结果行数据（`QueryScheduleAsync`） | 双击行 → 弹窗内嵌 AIS 定位。 | 两者皆空时提示无法定位。 |
| **imoNumber / callSign** | IMO 号、呼号（随接口返回，暂未在列表列展示）。 | 查询结果行数据 | — | 选读。 |
| **shareCabins** | 共舱结果集（scac/carrier/routeCode/displayName）。 | 查询结果行数据 | — | 选读。 |
| **staticEtdWeekOfYear** | 业务周次。 | 查询结果行数据 | — | 选读。 |
| **manifestCutoff / cvCutoff** | 截海外舱单、截放行条时间。 | 查询结果行数据 | — | 选读。 |
| **etd / weeksOut** | 预计离港日期、范围(周)。 | 表单 DatePicker / Select | 有 `eta` 时范围(周)不生效（后端语义）。 | 必填。 |
| **isTransit** | 中转标识（全部/直达/中转）。 | 表单 Select | 不传则返回全部。 | 选填。 |
| **其余选填** | 船公司、航线代码、中转港、船名等。 | CarrierSelect / Input | 有值才写入查询入参。 | 选填。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：实时查询]** 船期数据来自第三方实时接口，不落库；刷新与网络异常需有明确提示。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-08-09 | `Refactor` | 船期查询接口地址迁移到合并后的飞驼服务，页面功能与字段无变化。 | 后端 6 个飞驼 AppService 合并为 `FeituoAdminAppService`，ABP 按类名生成路由故地址随之变化；`feituo-schedule-admin.ts` 的 `API_PREFIX` 改为 `/services/app/FeituoAdmin`，方法名/入参/出参/权限点 `Admin.Schedule.Get` 均未变。详见 `changelogs/change-log-2026-08-09-feituo-yundang-appservice-merge-endpoints.md`。 |
| 2026-07-16 | `Refactor` | 船期查询从独立「船期管理」顶级菜单并入「航线管理」；URL `/schedule` 不变。 | 删除 `schedule.ts`；子路由挂在 `freight-rate.ts`，父级权限聚合 `SeFreiPrice`+`Schedule`。 |
| 2026-07-16 | `Feature` | 起始/目的港改为 PortSelect（EDI 五字码）；筛选一行 6 列、默认收起，中转标识紧邻范围(周)，labelWidth=92。 | 查询入参字段名仍为 `polCode`/`podCode`，仅组件与布局调整。 |
| 2026-07-16 | `Feature` | 双击船期行弹窗，内嵌飞驼可视化船舶 AIS 定位 Iframe，按船名定位。 | 新增 `modules/vessel-ais-modal.vue` 与 `data.ts` 的 `AIS_IFRAME_CONFIG`/`buildAisIframeUrl`；`list.vue` 绑定 `gridEvents.cellDblclick`，`useVbenModal` 承载 Iframe。密钥 `key` 待读取环境变量。 |
| 2026-07-16 | `Refactor` | 船舶 AIS 定位的 Iframe 地址、客户账号与密钥改为读取 `.env`，避免业务密钥散落在页面源码中。 | `AIS_IFRAME_CONFIG` 改读 `import.meta.env.VITE_GLOB_FREIGHTOWER_AIS_*`；`.env` 增加 hash URL、clientId 与 key 占位，hash URL 必须加双引号避免 dotenv 截断。 |
| 2026-07-16 | `Feature` | 对接飞驼 `QueryScheduleAsync` 新增字段，AIS 定位改为优先真实 MMSI；起运/目的/中转港码头优先展示标准化名称。 | DTO 补全 `mmsi`/`imoNumber`/`callSign`/`shareCabins`/`*TerminalCn`/`*UnCode`/`manifestCutoff`/`cvCutoff` 等及 `FeituoShareCabinDto`；`Result` 增 `status`/`size`；`handleRowDblclick` 取 `row.mmsi \|\| row.vessel`；列表码头显示回退 `*TerminalCn \|\| *Terminal`。 |
| 2026-07-16 | `Feature` | 列表全字段展示：为飞驼返回的所有字段补齐表格列（内部字段默认隐藏，工具栏可开启）。 | `useColumns` 补全全部字段列，新增 `text()` 空值兜底与 `formatShareCabins()` 共舱摘要；`pol`/`pod` 组合插槽列 field 改为 `polName`/`podName` 以避免与原始英文名列 field 冲突。 |
| 2026-07-16 | `Style` | 用户可见提示语去掉供应商名称，避免暴露第三方接口来源。 | AIS 未配置密钥提示改为「船舶定位服务未配置，请联系管理员」；无数据提示不再透传接口 `message`；`.env`/代码注释中立化。 |
