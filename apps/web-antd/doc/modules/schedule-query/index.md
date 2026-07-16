---
title: 船期查询
module: 航线管理
author: auto-doc-sync
last_updated: 2026-07-16
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
- **菜单归属：** 与「运价查询」同属侧边栏「航线管理」分组。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作  | 目标状态 | 状态说明                           |
| :------- | :----------- | :------- | :--------------------------------- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **polCode / podCode** | 起始港 / 目的港五字码。 | `PortSelect`（`valueKey=ediCode`） | 提交后带入查询入参。 | 必填（`selectRequired`）。 |
| **etd / weeksOut** | 预计离港日期、范围(周)。 | 表单 DatePicker / Select | 有 `eta` 时范围(周)不生效（后端语义）。 | 必填。 |
| **isTransit** | 中转标识（全部/直达/中转）。 | 表单 Select | 不传则返回全部。 | 选填。 |
| **其余选填** | 船公司、航线代码、中转港、船名等。 | CarrierSelect / Input | 有值才写入查询入参。 | 选填。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：实时查询]** 船期数据来自第三方实时接口，不落库；刷新与网络异常需有明确提示。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-07-16 | `Refactor` | 船期查询从独立「船期管理」顶级菜单并入「航线管理」；URL `/schedule` 不变。 | 删除 `schedule.ts`；子路由挂在 `freight-rate.ts`，父级权限聚合 `SeFreiPrice`+`Schedule`。 |
| 2026-07-16 | `Feature` | 起始/目的港改为 PortSelect（EDI 五字码）；筛选一行 6 列、默认收起，中转标识紧邻范围(周)，labelWidth=92。 | 查询入参字段名仍为 `polCode`/`podCode`，仅组件与布局调整。 |
