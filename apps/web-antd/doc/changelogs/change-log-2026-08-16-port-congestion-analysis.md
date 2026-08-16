---
title: 新增港口拥堵分析独立查询页
module: 航线管理
author: auto-doc-sync
last_updated: 2026-08-16
---

# 1. 背景意图 (Background)

业务在订舱和船期风险评估时需要判断港口是否拥堵、是否受天气影响。后端已提供实时港口拥堵接口（不落库、无需订阅），前端需要一个与「船期查询」同规格的独立自助查询菜单，用第三方接口权限控制菜单显隐，并且页面上不得出现供应商名称。

# 2. 核心逻辑变更 (Core Logic)

1. 新增 API `src/api/port-congestion/feituo-port-congestion-admin.ts`，对接 `POST /services/app/FeituoAdmin/QueryPortCongestionAsync`，入参 `portCode` / `includeMmsi`，出参含港口经纬度与最近 15 天 `rows`。
2. 新增页面 `src/views/port-congestion/list.vue` + `data.ts`：整页一个 Card，标题栏右侧港口下拉（选港即查，固定 `includeMmsi: true`），正文为概览、近 15 天双轴趋势图、每日明细表（展开行含天气详情、英文分析、MMSI 分组）。
3. 路由挂到 `freight-rate.ts` 的「航线管理」分组下，`path: '/port-congestion'`，`authority: abpPageAuthority('Admin.ExternalApi')`；父级 authority 追加 `Admin.ExternalApi`，否则只有该权限的用户看不到分组。
4. 拥堵状态与天气影响拆成 `PORT_STATUS_META` / `PORT_WEATHER_META` 两套常量，天气类型另有 `WEATHER_TYPE_MAP`。

# 3. 避坑指南 (Pitfalls)

- **拥堵和天气都是 A/B/C/D 但语义不同**，正常/轻微拥堵 vs 正常/轻微影响，图例文案不能共用一套常量。
- **本页固定 `includeMmsi: true`**：展开行要展示 MMSI，表单不再提供开关；大港响应体可能较大，加载态需覆盖完整请求。
- **时长单位是小时不是天**：`avgAtd` 常见几十上百，展示时同时给出天数换算，否则业务会按天误读。
- **无数据是空数组不是 null**，直接判 `rows.length === 0`，且这是正常情况，不能按异常处理。
- **数值字段可空**：`ataVesselCount`、`avgAtd` 等某天没统计到会是 `null`，图表 series 保留 `null` 并设 `connectNulls: false` 让其跳过空点，不要用 `?? 0` 补零，会把「没数据」画成「零艘船」。
- **天气里的数字都是字符串**（`visibility`、`temperature`、`humidity`…），参与展示/计算前要转数字；`humidity` 上游按 `0~1` 小数返回，展示要乘 100。
- **趋势图容器用 `v-show` 不能用 `v-if`**：`useEcharts` 内部缓存 chart 实例且只在实例为空时 `init`，`v-if` 复挂载后实例仍指向已销毁的 DOM；同时 `renderEcharts` 在容器不可见时会 30ms 轮询重试，所以只在有数据时调用。
- **接口业务错误是 HTTP 500 + `success=false`**，请求层已统一弹窗，页面 `catch` 后只清空上一次结果并切到失败空态，不要再拼接错误来源。
- **页面不得出现供应商名称**（与船期查询同口径），空态、toast、错误提示一律中立表述。
