---
title: 港口拥堵分析
module: 航线管理
author: auto-doc-sync
last_updated: 2026-08-16
---

# 1. 业务背景说明 (Background)

**白话解释：** 业务在安排订舱、评估船期风险时，需要知道目的港/起运港最近是不是在堵、堵到什么程度、是不是天气原因。本页面提供独立的港口拥堵自助查询入口：选一个港口即可看到该港最近 15 天的在港/靠泊/离港船舶数、平均候泊/作业/在港时长、拥堵等级与天气影响。

数据来自第三方实时接口，**后端不落库、无需预先订阅**，传港口五字码直接查即可。侧边栏位于「航线管理」分组下，与「船期查询」并列。

> [!WARNING] 页面上**不得出现第三方供应商名称**（同船期查询口径）。提示语、空态文案、错误提示一律使用中立表述。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/port-congestion` |
| 路由名称 | `PortCongestionAnalysis` |
| 页面组件 | `src/views/port-congestion/list.vue` |
| 权限口径 | `Admin.ExternalApi` / `Admin.ExternalApi.Get`（第三方接口 > 查看） |
| 后端接口 | `POST /services/app/FeituoAdmin/QueryPortCongestionAsync` |
| 关键源码 | `src/router/routes/modules/freight-rate.ts`<br/>`src/views/port-congestion/list.vue`<br/>`src/views/port-congestion/data.ts`<br/>`src/api/port-congestion/feituo-port-congestion-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **查询条件：** 整页一个 Card。标题「港口拥堵分析」，标题栏右侧放港口下拉（`PortSelect`，取 EDI 五字码）；选港即查，清空回空态。查询时固定传 `includeMmsi: true`。
- **港口概览：** 展示港口代码、经纬度，以及**最新一天**的在港/靠泊/离港总船数、平均候泊/作业/在港时长、拥堵状态标签、天气影响标签与天气类型，底部整段展示当日拥堵原因分析（中文）。
- **近 15 天趋势图：** ECharts 双轴组合图。左轴柱状为三类船舶数（艘），右轴折线为三类平均时长（小时）。缺采集的天以 `null` 传入，`connectNulls: false`，图表自动跳过空点。
- **每日明细表：** 每天一行，按日期倒序（最新在前）。展开行显示天气详情（天气类型、观测时间、气温、能见度、湿度、气压、降水、风向风速风力、天气现象原因）、拥堵原因分析英文原文，以及在港/在泊/离港 MMSI 列表（分组、带条数、超高滚动）。
- **清空港口：** 标题栏下拉允许清空；清空后正文回到「请选择港口」空态。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| 页面初始 | 用户进入路由 | 空态「请选择港口」 | 标题栏可选手港口，正文为空态。 |
| 空态 | 标题栏选港口且有数据 | 结果态 | 同一 Card 内渲染概览、趋势图、每日明细。 |
| 空态/结果态 | 查询返回 `rows` 为空数组 | 空态「该港口最近 15 天暂无拥堵数据」 | 同时 toast 提示，不视为异常。 |
| 空态/结果态 | 接口报错（HTTP 500 + `success=false`） | 空态「查询失败，请稍后重试」 | 清空上一次结果，错误原文由请求层统一弹窗。 |
| 结果态 | 清空港口下拉 | 空态 | 结果一并清空。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **portCode** | 港口五字码，如 `CNNGB`、`USLAX`。 | Card 标题栏 `PortSelect`（`valueKey=ediCode`、`labelKey=ediPortCountry`） | 选中即查询；前端再 `trim().toUpperCase()`，后端也会 Trim 并转大写。 | **必填**，未选不发请求。 |
| **includeMmsi** | 是否返回船舶 MMSI 明细。 | 前端固定传 `true`，页面无开关 | 展开行展示「船舶明细（MMSI）」区块。 | 本页固定开启。 |
| **rows[].key** | 汇总日期 `yyyy-MM-dd`，作为表格 rowKey 与图表 X 轴。 | 查询结果 | 图表升序、表格倒序。 | — |
| **ataVesselCount / atbVesselCount / atdVesselCount** | 在港 / 靠泊 / 离港总船数。 | 查询结果 | 图表左轴柱状。 | 可空，空显示 `-`。 |
| **avgAtbA / avgAtbD / avgAtd** | 平均候泊 / 作业 / 在港时长，**单位小时**。 | 查询结果 | 图表右轴折线；`avgAtd` 额外换算天数展示。 | 可空，空显示 `-`。 |
| **portStatus** | 拥堵状态 `A` 正常 / `B` 轻微拥堵 / `C` 中度拥堵 / `D` 严重拥堵。 | 查询结果 | 映射 `PORT_STATUS_META` 渲染 Tag 颜色文案。 | 未知值回落「未知」。 |
| **portWeather** | 天气影响 `A` 正常 / `B` 轻微影响 / `C` 中度影响 / `D` 严重影响。 | 查询结果 | 映射 `PORT_WEATHER_META`，**与拥堵状态是两套文案**。 | 未知值回落「未知」。 |
| **portWeatherDetails.weatherType** | 天气类型枚举（`SUNNY_DAY`/`OVERCAST`/`HAZE`/`RAINY`/`SNOWY` 等）。 | 查询结果 | `WEATHER_TYPE_MAP` 转中文。 | 未映射时原样展示。 |
| **portWeatherDetails.humidity** | 相对湿度，上游按 `0~1` 小数返回。 | 查询结果 | `formatHumidity` 转百分比展示。 | 字符串，需转数字。 |
| **ataVessels / atbVessels / atdVessels** | 在港 / 在泊 / 离港船舶 MMSI 数组。 | 查询结果（本页固定 `includeMmsi=true`） | 空数组的分组不渲染。 | 可能为空数组。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：拥堵与天气是两套独立等级]** `portStatus` 与 `portWeather` 都是 A/B/C/D，但一个表示拥堵程度、一个表示天气影响程度。两者**必须使用各自的图例文案**，不可共用常量。

> [!IMPORTANT] **[卡点 2：本页固定拉取船舶明细]** 本页展开行需要 MMSI，查询时固定传 `includeMmsi: true`，不提供用户开关。注意大港响应体可能较大，加载态要覆盖完整请求周期。

> [!IMPORTANT] **[卡点 3：时长单位是小时]** `avgAtd` 常见值几十到上百（93.71 小时约 3.9 天）。概览与明细表在小时之外附带天数换算，避免业务误读为「天」。

> [!IMPORTANT] **[卡点 4：不得暴露供应商]** 页面所有可见文案（空态、toast、错误提示）不能出现第三方供应商名称；后端返回的原始错误由请求层统一弹窗，页面不再二次拼接来源信息。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-08-16 | `Style` | 去掉独立查询 Card，港口下拉放到详情 Card 标题栏，选港即查。 | 去掉 `useVbenForm`；概览/趋势/明细同卡，中间用 Divider。 |
| 2026-08-16 | `Fix` | 去掉「船舶明细」开关，查询固定 `includeMmsi: true`，展开行始终可看 MMSI。 | `data.ts` 表单只保留港口；`list.vue` 请求体写死 `includeMmsi: true`。 |
| 2026-08-16 | `Feature` | 新增「港口拥堵分析」独立菜单，选港口即可查最近 15 天拥堵概览、趋势图与每日明细，展开行含船舶 MMSI 明细。 | 新建 `api/port-congestion/feituo-port-congestion-admin.ts` 对接 `FeituoAdmin/QueryPortCongestionAsync`；页面用标题栏 `PortSelect` + `EchartsUI` + antd `Table` 展开行，未走 `useVbenVxeGrid`（结果为固定 15 行本地数据且需要展开明细）；趋势图容器用 `v-show` 而非 `v-if`，避免 `useEcharts` 内部实例与被销毁 DOM 失配；路由挂在 `freight-rate.ts` 子级，父级 `authority` 追加 `Admin.ExternalApi`。 |
