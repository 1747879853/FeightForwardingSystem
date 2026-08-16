---
title: 运踪能力品牌分流（现有运踪 / 新服务商运踪）
module: 共享能力 / 运踪
author: auto-doc-sync
last_updated: 2026-08-16
status: 已实现（空运地图地址待服务商确认）
---

# 1. 业务背景说明 (Background)

**白话解释：** 运踪要按打包品牌与业务线分流：世纪通达（`sjtd`）的**海运出口**继续用现有运踪（订阅、查看、分享详情）；其余场景统一走**新服务商运踪**（集装箱综合跟踪 + 航空货运跟踪）。用户界面与对外分享一律白标，不出现服务商名称。空运仅覆盖空出；空进尚未建设。

品牌判断依据：构建环境变量 `VITE_APP_BRAND`（见 `src/utils/brand-assets.ts` 的 `isSjtdBrand` 等），不是运行时公司切换。

> [!IMPORTANT] **本文档中的服务商代号规则：** 用户可见层禁止出现服务商名称（见第 6 节）。接口路径与 DTO 字段名（`FeituoAdmin`、`feituoTracking`、`isFeituoSubscribed` 等）是后端标识符，**保持原样不改**，本文提到它们时仅作为代码标识；描述业务时统一称「新服务商运踪」。

# 2. 能力分流矩阵 (Features & Operations)

| 品牌 | 海运出口 | 海运进口 | 空运出口 | 空运进口 |
| :-- | :-- | :-- | :-- | :-- |
| **sjtd（世纪通达）** | **现有运踪**（订阅 / 查看 / 分享详情） | 新服务商 | 新服务商 | 不做 |
| **其他品牌**（hhyy / jht / jiayue / longshan 等） | 新服务商（含白标分享） | 新服务商 | 新服务商 | 不做 |

## 2.1 「现有运踪」范围（仅 sjtd 海出）

保留当前已上线能力，不替换：

| 能力 | 现状入口（摘要） |
| :-- | :-- |
| 运踪订阅 | 列表/表单「运踪订阅」→ `BatchSubscribeOceanBillAsync` |
| 运踪查看 | 列表 Tag / 编辑页「运踪」Tab → `GetOceanPushInfoAsync` |
| 分享详情 | 独立页 `/tracking-map/:mblNo` + 全局弹窗（`VITE_GLOB_TRACKING_*`） |

## 2.2 判定伪代码

```ts
const useLegacyOceanExportTracking = isSjtdBrand; // 仅 sjtd × 海运出口
const useNewVendorTracking = !useLegacyOceanExportTracking; // 其余业务线/品牌
```

## 2.3 判定伪代码之外的落点

分流必须**同时**覆盖下面每一处，只改一处会出现「列表是新服务商、编辑页又回到旧运踪」的两套并存：

| 落点 | 现状 |
| :-- | :-- |
| 列表工具栏「运踪订阅」按钮 | 已分流 |
| 列表「运踪状态」列与详情弹窗 | 已分流 |
| 编辑页「运踪」Tab | 已分流 |
| 基础信息表单单票订阅按钮 | 已分流 |
| 轨迹地图弹窗与对外分享页 | 新服务商已自带一套（`/cargo-tracking/*`）；`sjtd` 海出继续用 `/tracking-map/:mblNo` |

同一品牌内部会出现两套运踪（sjtd 海出用旧、海进/空出用新），不能按品牌一刀切。

# 3. 接口对接清单 (API)

统一前缀 `/api/services/app/FeituoAdmin/`；订阅权限 `Admin.ExternalApi.Use`，查询权限 `Admin.ExternalApi.Get`。

| 用途 | 方法 | 地址 | 入参要点 |
| :-- | :-- | :-- | :-- |
| 海运集装箱跟踪订阅 | POST | `SubscribeContainerAsync` | `bizType`：`0` 海运出口 / `1` 海运进口；支持批量 |
| 海运跟踪查询（读本地快照） | POST | `GetContainerTrackingAsync` | 列表/详情已带运踪，一般无需单独调 |
| 空运航空货运跟踪订阅 | POST | `SubscribeAirWaybillAsync` | `airExportIds: Guid[]`、`forceResubscribe?: boolean` |
| 空运重新订阅（单条） | POST | `ResubscribeAirWaybillAsync` | `airExportId: Guid`；**会消耗一次订阅配额** |

**轨迹数据不用单独取：** 海出 / 海进 / 空出的**列表与详情**已直接返回运踪字段。

| 字段 | 列表 | 详情 | 说明 |
| :-- | :-- | :-- | :-- |
| `isFeituoSubscribed` / `isFeituoSubscribeSuccess` | ✅ | ✅ | 是否已订阅 / 是否订阅成功 |
| `feituoTracking` | ✅ | ✅ | 运踪摘要（含预警计数与最近一条） |
| `feituoTrackingDetail` | ❌ 恒 null | ✅ | 完整轨迹快照 |
| `feituoTrackingWarnings` | ❌ 恒 null | ✅ | 预警明细数组 |

**摘要 `feituoTracking` 分组（海运）：** 订阅状态、整票数据状态、当前节点、关键时间（起运 ETD/ATD、目的 STA/ETA/ATA）、船期订舱与箱量、甩柜标记、**轨迹页链接**、预警字段。 **摘要 `feituoTracking` 分组（空运）：** 订阅状态、整票状态（`COMPLETE`/`PROCESS`）、航空公司、货物、当前节点（`currentEventClassifier` = `ACT` 实际 / `EST` 预计）、起降与首末航班、`destinationEta`/`destinationAta`、预警字段。

**订阅口径（做提示文案时用，注意别写服务商名）：**

- 海出：整箱用主提单号；拼箱用第一个箱号；船公司须维护 EDI 代码。
- 海进：优先主提单号，无则用第一个箱号。
- 空出：主运单号提取数字后须**恰好 11 位**（连字符/空格会自动剥离）。
- `alreadySubscribed = true` 也算成功（复用已有订阅，不消耗配额）。
- `trackingLoaded = false` **不是失败**，是「订阅成功、数据获取中」。
- 数据由服务商推送后端自动落库，**前端不轮询**。

# 4. 列表预警 (Warnings)

| 项 | 约定 |
| :-- | :-- |
| 位置 | 列表「主提单号」列文字**前方** |
| 样式 | 黄色叹号图标 |
| 交互 | 有预警才显示；鼠标悬停 Tooltip 展示预警原因 |
| 无预警 | 不展示图标，不干扰提单号复制/点击 |
| 适用范围 | 走新服务商的列表（海进全品牌；非 sjtd 海出；空出）；sjtd 海出维持现有运踪，暂不做该叹号 |

**数据来源（列表即可拿到，无需后端改造）：** `feituoTracking` 摘要在**列表**中就带预警字段：

| 字段 | 用途 |
| :-- | :-- |
| `hasWarning` | 是否渲染黄色叹号 |
| `warningCount` | 累计条数，可拼进 Tooltip（如「共 N 条」） |
| `latestWarningDescription` | Tooltip 主文案（预警原因） |
| `latestWarningTime` / `latestWarningCode` / `latestWarningCategory` | Tooltip 补充信息（时间、类型） |

**要点：**

- `feituoTrackingWarnings`（全量明细）**仅详情返回**，列表恒为 `null`；列表悬停只能用摘要里的「最近一条 + 条数」，需要全部明细请进详情/运踪页。
- 预警数据只来自服务商的增量推送，**订阅/查询接口不返回**；未配置推送回调时列表不会有预警，属预期而非缺陷。
- 时间字段是字符串（`yyyy-MM-dd HH:mm:ss`），**直接展示**，不要 `new Date()` 再格式化，避免时区偏移。

# 5. 地图与分享 (Maps & Share)

## 5.1 系统内地图（登录后查看）

| 场景 | iframe URL 来源 | 说明 |
| :-- | :-- | :-- |
| **海运出口 / 进口地图** | 后端返回的**加密轨迹页链接**（`feituoTracking` 摘要内的轨迹页链接字段） | 前端直接作为 iframe `src`，不在前端拼密钥 |
| **空运出口地图** | 前端按 env 拼接 | 空运摘要**不含**轨迹页链接，需前端用 ClientId + 可视化 iframe-key 等拼 URL |

**空运拼接配置（写入 env，禁止硬编码）：** 变量为 `VITE_GLOB_FREIGHTOWER_AIR_TRACKING_URL / _CLIENT_ID / _KEY`，命名对齐船期 AIS 的既有做法（`views/schedule-query/data.ts` 的 `AIS_IFRAME_CONFIG` + `buildAisIframeUrl`）。拼装实现见 `components/tracking/build-air-tracking-map-src.ts`。

**空运地图 iframe 参数（服务商契约）：** 地址形如 `{baseUrl}?key=&clientId=&businessNumber=&showInfo=&lang=`

| 参数 | 必选 | 说明 |
| :-- | :-- | :-- |
| `key` | 是 | 可视化密钥，**不是取 token 的 `secret`**，联系客服获取 |
| `clientId` | 是 | 客户账号，联系客服获取 |
| `businessNumber` | 否 | 航司单号，与订阅参数一致（本系统取运踪摘要的 `businessNumber`） |
| `showInfo` | 是 | 左侧信息菜单：`0` 隐藏 / `1` 展开 / `2` 收起；本系统默认 `2` |
| `lang` | 是 | `zh` / `en`；本系统跟随界面语言 |

取 token 的 `secret` 属服务端凭据，禁止进入前端 env。可视化能力需商务侧开通后才有内容。

## 5.2 对外分享（白标，强制）

新服务商的地图与云当那套能力对齐：**登录后弹窗可切换中英文、可复制免登录分享链接、可新窗口打开**；分享出去的是本系统的独立静态页。

| 场景 | 约定 |
| :-- | :-- |
| **sjtd 海出** | 继续现有 `/tracking-map/:mblNo`，行为不变 |
| **新服务商空运** | 分享页 `/cargo-tracking/air?no=<航司单号>&lang=`；地址由前端按 env 拼装，免登录页**不调任何业务接口** |
| **新服务商海运** | 分享页 `/cargo-tracking/ocean?t=<令牌>&lang=`；令牌是把服务商轨迹链接（优先 `iframeShortUrl` 密文短链）编码后的字符串 |
| **禁止** | 把服务商原始链接直接发给客户；页头/文案/空态出现服务商名称 |
| **内嵌** | 客户地址栏始终是本系统域名与路径，服务商链接只出现在 iframe 内部 |

> [!IMPORTANT] **海运分享令牌只是编码，不是加密。** 因为服务商没有像空运那样给「`key` + `clientId` + 单号」的拼接契约，海运的轨迹链接只能由后端随运踪数据下发，而免登录页调不了需要鉴权的业务接口，所以当前把链接编码后放进分享 URL。这满足「链接与界面白标」，但令牌可被解码、iframe 的请求域名在网络层仍可见。若合规要求更严，需后端提供**匿名接口或同源代理**（按分享 token 返回链接），届时只需把 `encodeVendorMapToken` 换成后端下发的 token。

## 5.3 语言切换

| 场景 | 实现 |
| :-- | :-- |
| 空运 | `lang` 是服务商明确列出的 iframe 参数，切换即生效 |
| 海运 | 服务商未给参数表，前端按同名 `lang` 参数覆盖/追加；**未生效时以服务商默认语言为准，需实测确认** |
| 分享链接 | 跟随弹窗当前语言生成（英文链接带 `?lang=en`），与云当分享一致 |

> [!IMPORTANT] **对外零暴露服务商信息：** 客户拿到的只能是自家域名分享链接 + 品牌 Logo + 中性「货物轨迹」文案。若合规要求连 iframe 网络请求域名都不可见，需另做后端代理；首期至少保证链接与 UI 白标。

# 6. 用户侧去品牌化 (De-branding) — 硬性要求

**禁止在任何用户可见处出现服务商名称**：按钮、Tab、列名、Tag、Tooltip、空态、toast、弹窗标题、分享页文案、导出文件名均不得出现。参照 2026-07-07 / 07-11 对上一家服务商的去品牌化处理。

| 层级 | 是否可出现服务商名 |
| :-- | :-- |
| 用户界面文案 / i18n 文案值 | **禁止** |
| 接口地址、DTO 字段名、i18n key、变量名、文件名 | 允许（后端标识符，保持原样） |
| 源码注释 | 建议写「运踪 / 第三方运踪」 |

**统一话术：** 运踪订阅 / 运踪状态 / 运踪信息 / 货物轨迹 / 异常预警 / 数据获取中。

> [!IMPORTANT] **[最易踩坑]后端返回的文案里带服务商名，直接透传就等于泄露。** 已知至少两处：空运订阅失败原因（如「…要求11位数字，无法订阅」的完整原文）与「暂无该运单的跟踪数据」这类 `trackingMessage`。前端展示 `errorMessage` / `trackingMessage` / `message` 前必须过一层文案清洗（正则替换服务商名为「运踪服务商」，或整句改为自有话术），不要裸展示。同理，运踪摘要里的承运人官网链接等外链也不要在分享页出现。

# 7. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：品牌 × 业务线双维度]** 仅「sjtd + 海运出口」走现有运踪；同一品牌下海进/空出仍走新服务商。禁止整品牌一刀切。

> [!IMPORTANT] **[卡点 2：空进不做]** 本需求空运仅空出；空进模块未建设，不预留入口。

> [!IMPORTANT] **[卡点 3：分享白标]** 其他品牌海出分享禁止直出服务商链接；独立页免登录与 `ignoreAccess` 约定见 [货物轨迹独立静态页](./tracking-map-page.md)。

> [!IMPORTANT] **[卡点 4：用户侧零品牌]** 含后端文案清洗（见第 6 节），联调时逐条核对失败原因与空态提示。

> [!NOTE] **[卡点 5：订阅成功 ≠ 有轨迹]** `trackingLoaded=false`、或摘要非空但当前节点全空，都应提示「数据获取中」，不要报错；空运重新订阅会消耗配额，仅在单号改过或数据异常时使用。

# 8. 前端落地位置 (Implementation)

| 关注点 | 位置 |
| :-- | :-- |
| 接口与类型 | `src/api/tracking/feituo-tracking-admin.ts` |
| 品牌分流开关 | `src/utils/tracking-brand.ts` |
| 服务商文案清洗 | `src/utils/vendor-text.ts` → `sanitizeVendorText` |
| 共享运踪能力 | `src/components/tracking/`（预警叹号、状态文案/颜色、订阅 composable、运踪面板与弹窗、空运地图拼装） |
| 轨迹地图弹窗 | `components/tracking/vendor-tracking-map-modal.vue` + `use-vendor-tracking-map.ts`（全局单例，挂在 `app.vue`） |
| 地图地址与分享令牌 | `components/tracking/vendor-map-src.ts`（`resolveVendorMapSrc` / `withMapLang` / `encodeVendorMapToken`） |
| 免登录分享页 | 路由 `router/routes/external/cargo-tracking.ts` + 页面 `views/tracking-map/vendor-page.vue` |
| 海运进口列表 | `views/sea-import-admin/list.vue` + `data.ts`（新增运踪状态列、mblNum slot） |
| 海运出口列表 | `views/sea-export-admin/list.vue`（两套入口互斥）+ `data.ts` |
| 空运出口 | `views/air-export-admin/list.vue`、`modules/air-tracking-panel.vue`、`basic-info-form/form.vue` |
| 文案 | `locales/langs/{zh-CN,en-US}/tracking.json`（命名空间 `tracking`） |
| 空运地图 env | `.env` 的 `VITE_GLOB_FREIGHTOWER_AIR_TRACKING_*` |

# 9. 待办与遗留

| 项 | 说明 |
| :-- | :-- |
| 空运地图开通状态 | 地址与参数已按服务商契约落地（见 5.1）；可视化能力需商务侧开通，未开通时 iframe 打不开内容 |
| 海运分享的严格白标 | 当前令牌是编码而非加密（见 5.2）；如需连 iframe 域名都不可见，要后端出匿名接口或同源代理 |
| 海运地图语言参数 | `lang` 是前端按同名参数追加的，需实测确认服务商是否吃这个参数 |
| 云当空运前端代码 | `views/air-export-admin/use-yundang-air-*.ts` 与 `modules/yundang-air-*.vue` 已无入口引用，确认稳定后可删除 |

# 10. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-08-16 | `Feature` | 新服务商轨迹地图对齐云当能力：登录后走全局地图弹窗（品牌 Logo + 中英切换 + 新窗口打开 + 复制免登录分享链接），并新增免登录分享页 `/cargo-tracking/air`（按单号拼装）与 `/cargo-tracking/ocean`（按令牌还原链接） | 原来地图是各面板内嵌 iframe，无语言与分享能力；现抽出 `vendor-map-src.ts`（`resolveVendorMapSrc` / `withMapLang` / 令牌编解码）+ 全局单例 `use-vendor-tracking-map.ts` + 弹窗，三处入口（海运面板、空运弹窗、空运 Tab）统一改为 `open()`。空运分享页零接口依赖；海运因缺少客户端拼接契约，改用「编码后的密文短链令牌」放进分享 URL，白标到链接与 UI 层，严格合规仍需后端匿名接口 |
| 2026-08-16 | `Fix` | 补齐海运出口分流覆盖面：编辑页运踪 Tab 与表单单票订阅按钮也按品牌分流，非 sjtd 不再落回旧运踪与旧轨迹地图 | 首版只改列表，造成两套并存。海运运踪内容抽成共用面板 `container-tracking-panel.vue`（列表弹窗 + 编辑页 Tab），Tab 侧用 `load-detail` 取全量预警；另外确认：旧地图那串 `#/containerTracking?companyCode=…&hideSearch=…&token=…` 是服务商 SPA 对我们 `#/Map?companyid=…&referenceno=…` 的内部改写，仓库里并无这些参数名 |
| 2026-08-16 | `Fix` | 空运轨迹地图按服务商正式契约落地：地址改为 `#/air`，参数 `key` / `clientId` / `businessNumber` / `showInfo` / `lang` | 之前按船期 AIS 同构猜的 `billNo` 已更正为 `businessNumber`；新增必填的 `showInfo`（默认 `2` 收起，弹窗高度有限且节点信息本系统已展示）；`lang` 跟随 `preferences.app.locale`。特别注意 `key` 是可视化密钥，与取 token 的 `secret` 不是一个东西，后者不得进前端 env |
| 2026-08-16 | `Feature` | 分流落地：海运进口新增运踪订阅/状态列/预警叹号；海运出口按品牌二选一（sjtd 保持现有运踪）；空运出口订阅、状态列、编辑页运踪 Tab 全量切到新服务商；三个列表主提单号前统一加异常预警黄叹号 | 新增 `api/tracking/feituo-tracking-admin.ts` 与 `components/tracking/` 共享层：海运订阅入参为 `{ bizType, orderIds }`（单条查询才用 `orderId`）；状态列与叹号只读列表已下发的摘要，零额外请求；海运轨迹地图用摘要的 `iframeUrl`、空运用 env 拼装；用户侧文案统一走 `tracking` 命名空间并对后端文案做服务商名清洗。详见 `changelogs/change-log-2026-08-16-tracking-vendor-brand-split.md` |
| 2026-08-16 | `Parsing` | 无（需求确认文档） | 补充后端接口契约后修正两点：① 列表摘要**已含**预警字段（`hasWarning`/`warningCount`/`latestWarning*`），列表叹号+悬停无需后端改造，仅全量明细是详情专有；② 海运轨迹页链接由摘要下发、空运摘要无链接故前端拼 URL。新增用户侧去品牌化硬性要求与后端文案清洗要求。 |
| 2026-08-16 | `Parsing` | 无 | 确认分流矩阵：sjtd 海出保留现有运踪；空运仅空出；其他品牌海出分享须白标。 |
