---
title: 全局货物轨迹弹窗
module: 共享能力
author: 自动生成
last_updated: 2026-07-14
callers: 海运出口编辑页运踪 Tab、海运出口运踪详情弹窗（均经 YundangTrackingPanel）
---

# 1. 业务背景说明 (Background)

**白话解释：** 业务人员在任意页面拿到一票货的“订阅号（提单号 mblNo）”后，希望一键弹窗查看这票货当前的运输轨迹地图。地图由第三方服务（trackingeyes）提供，通过网页地址携带“企业编号 + 订阅号”渲染。为了不在各页面/代码里散落原始地址和企业编号，做成一个全站共享的单例弹窗：调用方只传订阅号即可。

# 2. 功能与操作说明 (Features & Operations)

- **打开轨迹弹窗：** 任意页面调用 `useTrackingMap().open({ mblNo })`，弹窗内以 iframe 渲染轨迹地图（宽度 `90vw`、最大 `1400px`，高度 `80vh`）。
- **关闭：** 点击弹窗右上角关闭或遮罩取消，状态自动清空（`destroyOnClose`）。
- **中英文切换：** 工具栏 `Segmented` 可在「中文 / English」间切换，iframe 地图与分享链接同步；英文即向内嵌地址追加 `lang=en`。每次打开弹窗默认中文。
- **复制/新窗口分享：** 分享链接指向独立静态页，随当前语言生成；英文时链接带 `?lang=en`，方便分享给看英文的客户。
- **空订阅号兜底：** 未传或订阅号为空时，弹窗展示“暂无可查询的订阅号”。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| 关闭 | 调用 `open({ mblNo })` | 打开并渲染 iframe | referenceNo=mblNo，src 由 env + 订阅号运行时拼装 |
| 打开 | 用户点击关闭/取消 | 关闭并清空 | referenceNo 置空，iframe 销毁 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **mblNo** | 订阅号（提单号），对应 trackingeyes 的 `referenceno` | 调用方传入（如订单 `mblNum`） | 触发 iframe src 重新拼装 | 为空时展示 Empty 兜底 |
| **companyid** | 企业编号，对外不暴露 | `env: VITE_GLOB_TRACKING_COMPANY_ID` | 与 mblNo 一起拼入 src | 缺失则不渲染 iframe |
| **地图地址** | trackingeyes 内嵌基础地址（含 `#/Map` hash） | `env: VITE_GLOB_TRACKING_MAP_URL` | 用 URLSearchParams 拼 query | 缺失则不渲染 iframe |
| **lang** | 内嵌地图语言（`zh`/`en`），`en` 追加 `lang=en` | 弹窗 `Segmented` 选择（默认 `zh`） | 同步 iframe src 与分享链接 | 仅 `en` 生效，其余按中文处理 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：敏感配置收敛]** 组件内不硬编码企业编号（100514）与地图域名，统一读 `import.meta.env.VITE_GLOB_TRACKING_*`。新增品牌若地址不同，在对应 `.env.<brand>` 覆盖。

> [!IMPORTANT] **[卡点 2：VITE_ 前缀的暴露边界]** `VITE_` 变量会内联进客户端产物，浏览器仍可在 DevTools/iframe src 看到实际地址与企业编号，这是纯前端固有限制。本方案目标是“代码/页面层面不直接暴露、集中可维护”，非网络层隐藏。

> [!IMPORTANT] **[卡点 3：dotenv 行内注释]** `.env` 中 `VITE_GLOB_TRACKING_MAP_URL` 含 `#/Map` 锚点，**必须用双引号包裹**，否则 dotenv 会把 `#` 之后当注释丢弃，地图路由丢失。

> [!IMPORTANT] **[卡点 4：hash 地址拼参]** base url 含 `#/Map`，须用 `URLSearchParams` 只处理 `?` 后查询段，避免直接字符串拼接破坏 hash 路由。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-07-13 | `Feature` | 新增全站单例货物轨迹弹窗：`useTrackingMap().open({ mblNo })` 打开，iframe 内嵌 trackingeyes 地图；企业编号与地址写入 env 不对外硬编码。 | 仿 `workflow-timeline` 全局弹窗模式（模块级单例 ref + app.vue 注册单实例）；`components/tracking-map/` 三件套（use/modal/index），src 运行时用 URLSearchParams 兼容 hash 地址。 |
| 2026-07-13 | `Feature` | 在运踪信息（编辑页运踪 Tab）与运踪详情弹窗新增「查看轨迹地图」入口，点击复用本全局弹窗。 | 入口加在共享 `YundangTrackingPanel` 头部；订阅号优先取 `subscription.referenceNo`，回退 `shipment.blNo/referenceNo/bkgNo`，无号时按钮置灰。 |
| 2026-07-13 | `Fix` | 修复 `.env` 中地图 URL 的 `#/Map` 被 dotenv 截断；弹窗尺寸调整为 90vw（最大 1400px）× 80vh。 | dotenv 行内 `#` 为注释符，URL 须加引号；修改 env 后需重启 Vite dev server。 |
| 2026-07-14 | `Feature` | 弹窗工具栏新增中文/English 切换，iframe 与分享链接同步语言；英文分享链接带 `lang=en`，便于分享给看英文的客户。 | `buildTrackingMapSrc(referenceNo, lang)` 追加 `lang` 参数（`en` 才拼 `lang=en`）；`shareUrl` 按 `lang` 注入 `query.lang`；打开弹窗重置为中文。 |
