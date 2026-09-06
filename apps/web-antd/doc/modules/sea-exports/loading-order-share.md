---
title: 监装工单客户公开详情
module: 海运出口
author: auto-doc-sync
last_updated: 2026-09-06
---

# 1. 业务背景说明 (Background)

**白话解释：** 客户不需要登录系统，用「主提单号 + 监装工单号」打开一条分享链接，就能看这票货的监装进度、箱号封号和现场照片。链接由操作在海出编辑页「监装」Tab 点「分享」，在预览弹窗里确认中英文后再复制发出。客户页故意不展示内部监装要求与备注。

# 2. 功能与操作说明 (Features & Operations)

- **分享预览：** 海出编辑工作台「监装」Tab 顶栏「分享」。已保存工单（有 `loadingOrderNum`）才显示。点击后弹出客户页预览，可切换中文 / English；「复制分享链接」按当前语言生成绝对 URL（英文带 `lang=en`）。缺主提单号时 toast 提示先填写。
- **打开公开页：** 访问 `/loading-order-share?mblNum=&loadingOrderNum=`（hash 路由品牌实际为 `/#/loading-order-share?...`）。可选 `lang=en` 展示英文界面，缺省中文；文案跟 URL 语言走，不跟操作系统或后台账号语言。页头品牌 Logo + 标题滚动吸顶。概览区展示主提单号、工单号与工单状态。主体为基本信息卡与集装箱卡（箱照按类型横排，每类型一张；历史多图仍并排展示）。
- **免登录拉详情：** 调用 `GET /api/services/app/LoadingOrder/DetailByMblAndLoadingOrderNumAsync`，`skipAuth` 不带 token。query 缺任一号码时不请求，展示「请通过分享给您的链接访问」。
- **对客户隐藏：** 即使接口返回了 `loadingRequirements`、`remark`、`rejectReason`，页面也不渲染。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| 管理端已有工单 | 操作点「分享」 | 剪贴板有公开链接 | 不校验工单状态 |
| 客户打开完整链接 | 调公开详情 | 只读展示 | 两个号码精确匹配同一张工单 |
| 号码缺失 | 打开无 query 的路径 | 空态 | 不打接口 |
| 号码对不上 | 接口报错 | 空态展示后端文案 | 统一「主提单号或监装工单号错误」，不区分哪一个错 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **mblNum** | 主提单号，口令之一 | 路由 query；对应业务委托单 `MblNum` | 与工单号一起请求公开详情 | **必填**，精确匹配 |
| **loadingOrderNum** | 监装工单号，口令之二 | 路由 query；工单 `LoadingOrderNum` | 与主提单号一起请求 | **必填**，精确匹配 |
| **lang** | 客户页语言 | 路由 query，仅认 `en` | 缺省或其它值当中文 | 可选 |
| **公开详情** | 与师傅端 `DetailAsync` 同结构 | `LoadingOrder/DetailByMblAndLoadingOrderNumAsync` | `skipAuth` + `skipErrorMessage` | 免登录、不传租户 |
| **客户可见内容** | 基本信息、箱型/箱号/封号、按类型横排的照片、状态 | 详情 DTO，照片 URL 经 `buildAttachmentUrl` | 点击缩略图预览 | 不展示要求与备注；空类型不占格；每类型通常一张 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：免登录靠 ignoreAccess + skipAuth]** 路由漏配 `ignoreAccess` 会被守卫打去登录页。请求漏配 `skipAuth` 时，浏览器里过期 token 会触发刷新/登出，客户页不可用。

> [!IMPORTANT] **[卡点 2：分享 URL 必须 router.resolve]** jht 等品牌 `VITE_ROUTER_HISTORY=hash`。手写 pathname 分享出去客户打不开。与货物轨迹分享同一写法：`origin + router.resolve().href`。

> [!IMPORTANT] **[卡点 3：后端仍返回要求与备注]** 公开接口出参与师傅端详情相同。客户页只是不渲染 `loadingRequirements` / `remark`，不要误以为接口已脱敏。

> [!IMPORTANT] **[卡点 4：客户页语言跟 URL，不跟账号]** 公开页免登录，不能用后台 `$t`。界面文案在 `share-text.ts` 按 `?lang=en` 切换。品名/堆场/附件类型名仍是接口原值；后端报错也可能仍是中文。

> [!IMPORTANT] **[卡点 5：箱照按类型横排】** 客户页类型网格与采集槽一致；没传的类型不占格。同一类型历史多图仍并排，点图预览该箱全部照片。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-09-06 | `Fix` | 箱照改为按类型横排网格，与 PC/小程序采集槽一致；固定 104px 方格，不随页面拉宽。 | 空类型不占格；历史同一类型多图仍并排。详见 `changelogs/change-log-2026-09-06-loading-photo-one-per-type.md` |
| 2026-09-06 | `Feature` | 分享先弹出客户页预览，可切换中英文再复制对应链接 | 预览嵌入公开页组件；英文链接带 `lang=en`。详见 `changelogs/change-log-2026-09-06-loading-share-preview-lang.md` |
| 2026-09-06 | `Fix` | 顶栏 Logo 行滚动吸顶 | 页面自己 `overflow: auto`，避免全局 `html/body/#app` 满高导致 sticky 粘错容器。详见 `changelogs/change-log-2026-09-06-loading-share-header-sticky.md` |
| 2026-09-06 | `Fix` | 顶栏去掉「客户共享 · 只读查看」，只保留品牌 Logo 与「监装信息」 | 详见 `changelogs/change-log-2026-09-06-loading-share-header-note.md` |
| 2026-09-05 | `Feature` | 监装 Tab 可复制免登录分享链接；客户打开后查看监装信息，不展示监装要求与备注 | 路由 `external/loading-order-share.ts`；接口 `skipAuth`；链接用 `router.resolve` 兼容 hash。详见 `changelogs/change-log-2026-09-05-loading-order-share.md` |
