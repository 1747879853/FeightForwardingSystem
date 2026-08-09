---
title: 默认主题圆角调整为 0.5
module: 共享能力 / 全局偏好
author: auto-doc-sync
last_updated: 2026-08-09
---

# 1. 背景意图 (Background)

全站默认圆角偏大，需将主题圆角系数下调，使按钮、卡片等控件视觉更紧凑。

# 2. 核心逻辑变更 (Core Logic)

1. `apps/web-antd/src/preferences.ts` 中 `theme.radius` 由 `'1'` 调整为 `'0.5'`。
2. 该值经 `@vben/preferences` 覆盖全局主题 token，影响全站组件圆角。

# 3. 避坑指南 (Pitfalls)

- 文件头注明：更改配置后请清空本地 preferences 缓存，否则可能仍使用旧圆角。
- 用户若在偏好设置里手动改过圆角，本地缓存可能覆盖本次默认值。
