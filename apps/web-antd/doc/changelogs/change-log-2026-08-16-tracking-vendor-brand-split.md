---
title: 运踪按品牌分流接入新服务商（海进 / 非 sjtd 海出 / 空出）+ 列表预警叹号
module: 共享能力 / 运踪、海运进口、海运出口、空运出口
author: 系统
last_updated: 2026-08-16
---

# 1. 背景意图 (Background)

运踪能力按「打包品牌 × 业务线」分流：世纪通达（`sjtd`）的**海运出口**继续用已上线的运踪，其余场景（全品牌海运进口、全品牌空运出口、非 `sjtd` 品牌海运出口）统一切到新服务商的「集装箱综合跟踪 / 航空货运跟踪」。同时按产品要求在列表主提单号前加异常预警叹号，并明确**用户可见处禁止出现服务商名称**。

需求与分流矩阵见 [运踪能力品牌分流](../modules/shared/feituo-tracking-brand-split.md)；后端契约取自 `aspnet-core/文档/外部Api对接/飞驼/飞驼对接-集装箱跟踪-前端对接.md` 与 `飞驼对接-航空货运跟踪-前端对接.md`。

# 2. 核心逻辑变更 (Changes)

## 2.1 新增接口层

`src/api/tracking/feituo-tracking-admin.ts`，前缀 `/services/app/FeituoAdmin`：

| 函数 | 地址 | 入参要点 |
| :-- | :-- | :-- |
| `subscribeContainerTracking` | `SubscribeContainerAsync` | `{ bizType, orderIds: string[] }`，`bizType` 0=海出 1=海进 |
| `getContainerTracking` | `GetContainerTrackingAsync` | `{ bizType, orderId }`，读本地快照 |
| `subscribeAirWaybillTracking` | `SubscribeAirWaybillAsync` | `{ airExportIds, forceResubscribe? }` |
| `resubscribeAirWaybillTracking` | `ResubscribeAirWaybillAsync` | `{ airExportId }`，消耗一次配额 |

同文件内补齐类型：海运摘要 `ContainerTrackingSummaryDto`（当前节点、关键时间、订舱箱量、甩柜、预警、`iframeUrl`）、海运预警明细、跟踪数据 `ContainerDataDto`（含 `containers[].status[]`）、空运摘要 `AirTrackingSummaryDto` 与空运预警明细。

## 2.2 三个模块 DTO 强类型化

- `SeaImportDto` 的 `feituoTracking` / `feituoTrackingDetail` / `feituoTrackingWarnings` 由 `Record<string, unknown>` 占位换成上述强类型；
- `SeaExportDto`、`AirExportDto` 新增同名四组字段（此前只有云当字段）。

## 2.3 新增共享能力 `src/components/tracking/`

| 文件 | 职责 |
| :-- | :-- |
| `container-tracking.ts` / `air-tracking.ts` | 运踪四态推导、状态列文案与颜色、预警叹号属性、弹窗 payload 构造 |
| `tracking-warning-icon.vue` | 主提单号前黄色叹号 + Tooltip（无预警不渲染） |
| `use-container-tracking-subscribe.ts` / `use-air-tracking-subscribe.ts` | 批量订阅、结果归一化、Toast 与结果弹窗 |
| `tracking-subscribe-result-modal.vue` | 海运/空运共用的订阅结果表格 |
| `container-tracking-panel.vue` | 海运运踪面板（摘要 + 预警 + 箱清单 + 轨迹地图入口 + 刷新运踪），列表弹窗与编辑页 Tab 共用 |
| `vendor-map-src.ts` | 地图地址解析（空运前端拼 / 海运用下发链接）、`lang` 覆盖、分享令牌编解码 |
| `use-vendor-tracking-map.ts` + `vendor-tracking-map-modal.vue` | 全局轨迹地图弹窗（品牌 Logo + 中英切换 + 新窗口打开 + 复制免登录分享链接），挂在 `app.vue` |
| `container-tracking-modal.vue` / `air-tracking-modal.vue` | 运踪详情弹窗（弹窗只做壳，海运内容复用上面的面板） |
| `use-tracking-detail.ts` | 两个详情弹窗的打开入口 |
| `build-air-tracking-map-src.ts` | 空运轨迹地图 URL 拼装（读 env） |

另新增 `src/utils/tracking-brand.ts`（`isLegacyOceanExportTracking` / `isVendorOceanExportTracking`）与 `src/utils/vendor-text.ts`（`sanitizeVendorText` 文案清洗）。

## 2.4 页面接入

| 模块 | 变更 |
| :-- | :-- |
| 海运进口列表 | 新增「运踪订阅」按钮（`Admin.ExternalApi.Use`）、「运踪状态」列（点击开运踪详情，`Admin.ExternalApi.Get`）、主提单号前预警叹号 |
| 海运出口列表 | 按品牌二选一：`sjtd` 保持原云当订阅/状态列/详情；其他品牌走新服务商，主提单号加预警叹号；列字段名 `yundangTrackStatus` 未改，避免用户列配置失效 |
| 海运进口编辑页 | 新增「运踪信息」Tab（第 5 个标签），内容为 `ContainerTrackingPanel`（`bizType=1`、`load-detail`），Tab 记忆白名单同步加入 `tracking` |
| 海运出口编辑页 | 「运踪」Tab 按同一开关分流：`sjtd` 仍是原面板，其他品牌换成 `ContainerTrackingPanel`（`load-detail` 模式，带全量预警明细与「刷新运踪」） |
| 海运出口基础信息表单 | 单票订阅按钮按品牌二选一，非 `sjtd` 走新服务商并读 `isFeituoSubscribed` 判断置灰 |
| 空运出口列表 | 订阅与状态列整体切到新服务商，主运单号加预警叹号 |
| 空运出口编辑页 | 「运踪」Tab 换成新面板 `modules/air-tracking-panel.vue`（摘要 + 全量预警明细 + 轨迹地图 + 重新订阅） |
| 空运出口基础信息表单 | 单票订阅按钮切到新服务商，订阅状态改读 `isFeituoSubscribed` / `isFeituoSubscribeSuccess` |

## 2.5 轨迹地图与免登录分享

地图不再内嵌在各面板里，统一走全局弹窗，能力对齐云当那套：品牌 Logo、中英切换、新窗口打开、复制免登录分享链接。

| 场景 | 分享链接 | 说明 |
| :-- | :-- | :-- |
| 空运 | `/cargo-tracking/air?no=<航司单号>&lang=` | 地址由前端按 env 拼装，免登录页**零接口依赖** |
| 海运 | `/cargo-tracking/ocean?t=<令牌>&lang=` | 令牌 = 服务商轨迹链接（优先 `iframeShortUrl` 密文短链）编码后的字符串 |

新增免登录路由 `router/routes/external/cargo-tracking.ts`（`ignoreAccess: true`）与页面 `views/tracking-map/vendor-page.vue`；页头只出现本系统品牌与「货物轨迹查询 / Cargo Tracking」中性标题。

## 2.6 文案与环境变量

- 新增 i18n 命名空间 `tracking`（zh-CN / en-US），统一「运踪订阅 / 运踪状态 / 运踪详情 / 异常预警」等中性话术；
- `.env` 新增 `VITE_GLOB_FREIGHTOWER_AIR_TRACKING_URL` / `_CLIENT_ID` / `_KEY`，命名对齐既有 AIS 配置。

# 3. 避坑指南 (Blockers & Notes)

> [!IMPORTANT] **1. 用户可见处禁止出现服务商名称。** 后端 `errorMessage` / `message` / `trackingMessage` 原文会带服务商名（如单号位数校验、「暂无跟踪数据」），**展示前必须过 `sanitizeVendorText`**。本次订阅结果、运踪弹窗、空运面板均已接入，新增展示点不要漏。

> [!IMPORTANT] **2. 列表预警只有「条数 + 最近一条」。** `hasWarning` / `warningCount` / `latestWarning*` 在列表摘要里就有，够叹号与悬停；`feituoTrackingWarnings`（全量明细）仅详情返回，列表恒 `null`，不要为悬停逐行打详情接口。

> [!IMPORTANT] **3. 空运轨迹地图的 `key` 不是取 token 的 `secret`。** 正式契约为 `#/air?key=&clientId=&businessNumber=&showInfo=&lang=`：`key`（可视化密钥）与 `clientId` 联系客服获取，`businessNumber` 与订阅参数一致，`showInfo` 取 `0` 隐藏 / `1` 展开 / `2` 收起，`lang` 取 `zh` / `en`。本系统默认 `showInfo=2`（弹窗高度有限，节点信息本系统已自行展示），`lang` 跟随界面语言。取 token 的 `secret` 属服务端凭据，**不要放进前端 env**；三项 env 缺任一项时「查看轨迹地图」入口自动隐藏，不会出现空白 iframe。

> [!IMPORTANT] **4. 改了 `.env` 必须重启 dev server**，否则新的空运地图变量读不到（Vite 只在启动时注入）。

> [!NOTE] **5. 订阅成功 ≠ 有轨迹。** 海运 `statusCode=20001` 或 `data` 为空、空运 `trackingLoaded=false`，都提示「订阅成功，数据获取中」，不能当失败报错；空运 `alreadySubscribed=true` 也算成功（复用旧订阅、不消耗配额）。

> [!NOTE] **6. 时间字段是服务商原样字符串**（如 `2025/09/01 00:00:00`、`yyyy-MM-dd HH:mm:ss`），直接展示，不要 `new Date()` 再格式化，否则时区偏移显示错时间。

> [!IMPORTANT] **7. 分流必须覆盖「列表 + 编辑页 Tab + 表单订阅按钮」三处。** 首版只改了列表，导致非 `sjtd` 品牌从列表看到的是新服务商、一进编辑页运踪 Tab 又回到旧运踪（还会打开旧服务商的轨迹地图），两套并存。现已按同一开关补齐三处；后续新增运踪入口时照此检查。

> [!IMPORTANT] **8. 海运分享令牌是编码不是加密。** 服务商没给海运「`key` + `clientId` + 单号」的客户端拼接契约，轨迹链接只能由后端随运踪数据下发，而免登录页调不了鉴权接口，所以把链接（优先密文短链 `iframeShortUrl`）编码后放进分享 URL。客户看到的链接与界面都是我方品牌，但令牌可解码、iframe 请求域名在网络层可见。若合规要求更严，需后端出**匿名接口或同源代理**，届时只替换 `encodeVendorMapToken` 一处。

> [!NOTE] **9. 海运地图的 `lang` 是前端追加的。** 服务商未给海运 iframe 参数表，切换语言时按同名参数覆盖；若实测不生效，页面语言以服务商默认为准（空运的 `lang` 是官方参数，必定生效）。

> [!NOTE] **10. 旧运踪地图链接会被服务商改写。** 我们只拼 `#/Map?companyid=…&referenceno=…&lang=zh`，对方 SPA 会内部改写成 `#/containerTracking?companyCode=…&referenceNo=…` 并补上 `hideSearch` / `token` / `hideIcon` / `color` 等默认参数。看到这类地址不必去代码里找，仓库中并没有这些参数名。

> [!NOTE] **11. 云当空运前端代码已成孤儿。** `views/air-export-admin/use-yundang-air-*.ts` 与 `modules/yundang-air-*.vue` 不再被任何入口引用（按约定保留代码、只摘入口），确认稳定后可单独提交删除。

# 4. 影响面自检

- 触及文件 `vue-tsc` 零错误（仓库存量报错与本次无关）；
- `sjtd` 品牌海运出口回归点：订阅按钮、运踪状态列、运踪详情弹窗、`/tracking-map` 分享均走原路径未改；
- 海运出口/进口列表新增列与新 slot，用户已保存的列配置会自愈（认不出的列回退默认可见）。
