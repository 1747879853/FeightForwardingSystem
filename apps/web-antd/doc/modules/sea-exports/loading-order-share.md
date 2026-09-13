---
title: 监装工单客户公开详情
module: 海运出口
author: auto-doc-sync
last_updated: 2026-09-13
---

# 1. 业务背景说明 (Background)

**白话解释：** 客户不需要登录系统，用「主提单号 + 监装工单号」打开一条分享链接，就能看这票货的监装进度、箱号封号和现场照片。链接由操作在海出编辑页「监装」Tab 点「分享」，在预览弹窗里确认中英文后再复制发出。客户页故意不展示内部监装要求与备注。

# 2. 功能与操作说明 (Features & Operations)

- **无首帧诊断：** 30 秒仍无可播放画面时销毁连接，复查业务状态；业务接口仍成功则提示检查摄像头出流与视频转发，不再误报为「视频已中断」。HTTP 200 与 FLV 文件头不代表已经收到视频帧。
- **监装直播：** 页面只展示「查看监装视频」，不自动点播。点击后全屏打开再调 `LoadingOrderVideo/StartPlayAsync`，点播超时 120 秒；mpegts.js 只播返回的 flvUrl，首帧最多等 30 秒。异常先断开再点播一次查业务原因，由用户手动重试；已完成不提供入口。连接数每 10 秒查一次，失败显示未知。云台在全屏画面右下角，按住方向或变倍、松开停止；Esc 或关闭销毁播放器并释放观看位。视频及云台请求免登录，不带 token。

- **分享预览：** 海出编辑工作台「监装」Tab 顶栏「分享」。已保存工单（有 `loadingOrderNum`）才显示。点击后弹出客户页预览，可切换中文 / English；「复制分享链接」按当前语言生成绝对 URL（英文带 `lang=en`）。缺主提单号时 toast 提示先填写。
- **打开公开页：** 访问 `/loading-order-share?mblNum=&loadingOrderNum=`（hash 路由品牌实际为 `/#/loading-order-share?...`）。可选 `lang=en` 展示英文界面，缺省中文；文案跟 URL 语言走，不跟操作系统或后台账号语言。页头品牌 Logo + 标题固定在顶。主体是一张按内容高度收缩的单据，最宽 1680px：主提单号、工单号、有值字段和蓝色「查看监装视频」排在同一条信息带，桌面字段 5 列（主提单号占两格），按钮贴在右侧；空字段不展示。集装箱接在下面，不左右分栏、不拉满视口。箱照按类型横排。底栏「品牌 · 监装信息共享」贴在窗口底部，内容超出时只滚中间。
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
| 2026-09-13 | `Fix` | 页脚「品牌 · 监装信息共享」贴在窗口底部，短工单不再悬在卡片下面。 | 只滚中间内容，白卡片高度仍跟内容走。 |
| 2026-09-13 | `Fix` | 抬头收进信息带：去掉眉题，主提单号/工单/有值字段与视频按钮同一条，不再左右甩空。 | 桌面 5 列字段 + 右侧按钮；卡片高度仍跟内容走。 |
| 2026-09-13 | `Fix` | 分享页改成一张单据：有值字段横铺，空字段隐藏，视频做成蓝色主按钮。 | 卡片高度跟内容走，不再拉满视口或左右分栏撑出大块空白。 |
| 2026-09-13 | `Fix` | 分享页直播改为点「查看监装视频」后全屏播放；云台改成画面上的圆形方向盘。 | 进入页面不再自动点播，避免未观看就占满 3 路连接。 |
| 2026-09-13 | `Fix` | 概览区主提单号做大标题，监装工单号改为标题下的次要说明。 | 工单号不再与主提单号同等字号并排，避免抢视觉。 |
| 2026-09-13 | `Feature` | 公开详情新增 HTTP-FLV 直播、连接数和云台控制，关闭预览释放连接。 | 摄像头与直播按监装视频接口文档对接，所有应用服务方法保留 Async 后缀。 |
