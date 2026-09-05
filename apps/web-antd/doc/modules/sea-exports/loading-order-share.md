---
title: 监装工单客户公开详情
module: 海运出口
author: auto-doc-sync
last_updated: 2026-09-05
---

# 1. 业务背景说明 (Background)

**白话解释：** 客户不需要登录系统，用「主提单号 + 监装工单号」打开一条分享链接，就能看这票货的监装进度、箱号封号和现场照片。链接由操作在海出编辑页「监装」Tab 点「分享」复制发出。客户页故意不展示内部监装要求与备注。

# 2. 功能与操作说明 (Features & Operations)

- **复制分享链接：** 海出编辑工作台「监装」Tab 顶栏「分享」。已保存工单（有 `loadingOrderNum`）才显示。点击后按当前主提单号 + 工单号用 `router.resolve({ name: 'LoadingOrderSharePage' })` 生成绝对 URL 并复制。缺主提单号时 toast 提示先填写。
- **打开公开页：** 访问 `/loading-order-share?mblNum=&loadingOrderNum=`（hash 路由品牌实际为 `/#/loading-order-share?...`）。页头品牌 Logo + 「监装信息」+ 工单状态。主体为基本信息卡与集装箱卡（含分组照片预览）。
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
| **公开详情** | 与师傅端 `DetailAsync` 同结构 | `LoadingOrder/DetailByMblAndLoadingOrderNumAsync` | `skipAuth` + `skipErrorMessage` | 免登录、不传租户 |
| **客户可见内容** | 基本信息、箱型/箱号/封号、分组照片、状态 | 详情 DTO，照片 URL 经 `buildAttachmentUrl` | 点击缩略图预览 | 不展示要求与备注 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：免登录靠 ignoreAccess + skipAuth]** 路由漏配 `ignoreAccess` 会被守卫打去登录页。请求漏配 `skipAuth` 时，浏览器里过期 token 会触发刷新/登出，客户页不可用。

> [!IMPORTANT] **[卡点 2：分享 URL 必须 router.resolve]** jht 等品牌 `VITE_ROUTER_HISTORY=hash`。手写 pathname 分享出去客户打不开。与货物轨迹分享同一写法：`origin + router.resolve().href`。

> [!IMPORTANT] **[卡点 3：后端仍返回要求与备注]** 公开接口出参与师傅端详情相同。客户页只是不渲染 `loadingRequirements` / `remark`，不要误以为接口已脱敏。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-09-05 | `Feature` | 监装 Tab 可复制免登录分享链接；客户打开后查看监装信息，不展示监装要求与备注 | 路由 `external/loading-order-share.ts`；接口 `skipAuth`；链接用 `router.resolve` 兼容 hash。详见 `changelogs/change-log-2026-09-05-loading-order-share.md` |
