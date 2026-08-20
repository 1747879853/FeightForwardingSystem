---
title: 运踪分享页页头补展示单号
module: 共享能力 / 运踪
author: 系统
last_updated: 2026-08-20
---

# 1. 背景意图 (Background)

复制运踪「分享链接」发给客户后，免登录页页头只有品牌 Logo 和「货物轨迹查询」，看不到单号。登录后的地图弹窗已经展示单号，两边不一致。对应 TAPD #0845。

覆盖两条分享路径：

- 新服务商：`/cargo-tracking/air?no=`、`/cargo-tracking/ocean?t=`
- 现有运踪（sjtd 海出）：`/tracking-map/:mblNo`（如 `/tracking-map/YMMU6822286`）

# 2. 核心逻辑变更 (Changes)

- 新服务商分享页 `views/tracking-map/vendor-page.vue` 从 query `no` 读取单号，页头在 Logo 后展示「单号：xxx」（英文 `Reference no`）。
- 海运分享链接在已有令牌 `t` 之外，若弹窗已有展示用单号，一并带上 `no=`；旧链接没有 `no` 时页头不展示单号，不破坏已发出去的链接。
- 现有运踪分享页 `views/tracking-map/page.vue` 从路径参数 `mblNo`（兼容 query）展示同一套「单号：xxx」。
- 单号只做展示，不调业务接口，白标与免登录约定不变。

# 3. 避坑指南 (Pitfalls)

> [!IMPORTANT] **1. 分享页文案不要走全局 i18n。** 客户打开的是免登录静态页，系统语言可能与链接 `?lang=` 不一致。单号标签跟标题一样写在页面本地 `pageText`，跟随 URL 语言。

> [!NOTE] **2. 空运 `no` 是 11 位纯数字航司单号，不要在页头再格式化成带连字符。** 与订阅参数、地图 iframe 的 `businessNumber`、弹窗展示保持同一串。

> [!NOTE] **3. `/tracking-map/:mblNo` 的单号已经在路径里，不要再改分享 URL。** 只补页头展示即可；海运新服务商那条才需要额外拼 `no=`，因为令牌解不出可读单号。
