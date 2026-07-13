---
title: 货物轨迹独立静态页
module: 共享能力
author: 自动生成
last_updated: 2026-07-13
route: /tracking-map/:mblNo?
---

# 1. 业务背景说明 (Background)

**白话解释：** 把一票货的运输轨迹做成一个可直接分享给外部客户的独立网页：客户点开带订阅号的链接（如 `/tracking-map/MBL123`）即可看到轨迹地图，无需登录、没有系统侧边栏/顶栏。页头展示当前品牌公司 logo（白标），轨迹地图由第三方 trackingeyes 通过 iframe 内嵌，原始地址与企业编号不对外散落。

# 2. 功能与操作说明 (Features & Operations)

- **打开轨迹页：** 访问 `/tracking-map/:mblNo`，页头显示品牌 logo + 「货物轨迹查询」，主体全屏 iframe 渲染轨迹地图。
- **免登录：** 未登录也可直接访问（`meta.ignoreAccess: true`），适合分享给外部客户。
- **空态：** 不带订阅号（`/tracking-map`）时展示「暂无可查询的订阅号，请通过带订阅号的链接访问」。
- **品牌自适应：** 页头 logo 随打包品牌 `VITE_APP_BRAND` 自动切换（hhyy/jht/sjtd/jiayue）。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| 访问带号链接 | `/tracking-map/:mblNo` | 渲染 iframe | src 由 env + 订阅号拼装 |
| 访问无号链接 | `/tracking-map` | 展示空态 | 无 iframe，提示需带订阅号 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **mblNo** | 订阅号（提单号），对应 trackingeyes 的 `referenceno` | 路由 `params.mblNo`（兼容 `query.mblNo`） | 触发 iframe src 拼装 | 为空时展示空态 |
| **品牌 logo** | 页头公司 logo | `brand-assets.ts`（`brandLogoText`→`brandLogo`）+ `VITE_APP_BRAND` | 随打包品牌固定 | 缺省回退方形 logo / 公司名文字 |
| **companyid** | 企业编号，对外不暴露 | `env: VITE_GLOB_TRACKING_COMPANY_ID` | 拼入 iframe src | 缺失则不渲染 iframe |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：免登录靠 ignoreAccess]** external 路由虽在初始 routes 注册，但仍走全局守卫。未登录访问必须靠 `meta.ignoreAccess: true` 放行，漏配会被重定向到登录页。

> [!IMPORTANT] **[卡点 2：external glob 需手动开启]** `router/routes/index.ts` 默认注释了 `./external/**/*.ts` glob，本次已取消注释；后续新增 external 页务必保持开启。

> [!IMPORTANT] **[卡点 3：企业编号/地址收敛 env]** 页面与 `buildTrackingMapSrc` 均不出现 `100514` 与原始域名；不同品牌企业编号不同需在 `.env.<brand>` 覆盖。iframe src 在 DOM 仍可见，属前端固有限制。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-07-13 | `Feature` | 新增可分享的货物轨迹独立静态页（免登录、URL 传订阅号、iframe 内嵌、页头品牌 logo）。 | 启用 external 路由 + `ignoreAccess`；抽 `buildTrackingMapSrc` 供弹窗与静态页复用；logo 用 brand-assets 随品牌切换。已用 chrome-devtools 实测带号渲染与空态。 |
