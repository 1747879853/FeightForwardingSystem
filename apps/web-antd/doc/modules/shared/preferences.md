---
title: 全局偏好覆盖
module: 共享能力
author: auto-doc-sync
last_updated: 2026-08-11
---

# 1. 业务背景说明 (Background)

**白话解释：**  
`preferences.ts` 是前端启动时对 Vben 默认偏好的项目级覆盖，控制布局、主题、侧边栏、页签、Logo 等全局表现，不绑定具体业务路由。

# 2. 功能与操作说明 (Features & Operations)

- **主题圆角：** `theme.radius` 控制全站组件圆角强度；当前默认 `0.5`（相对原先 `1` 更紧凑）。
- **配置生效：** 修改本文件后，除 Logo 外多数项仍可能被本地 preferences 缓存覆盖；`logo.source` 等构建期字段启动时已强制用 overrides，换品牌包/更新 `logo.png` 后无需再为 Logo 清缓存。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明                 |
| :------- | :---------- | :------- | :----------------------- |
| 无       | —           | —        | 全局配置，无业务状态流转 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **theme.radius** | 主题圆角系数 | **前端偏好**<br/>`preferences.ts` | **触发：** 影响全站 Ant/Vben 组件圆角 | 字符串数值，如 `'0.5'`、`'1'` |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：本地缓存覆盖默认值]** 用户本地已缓存 preferences 时 -> 仅改源码默认值可能不生效，需清缓存或重置偏好。`logo.source` 已在 `initPreferences` 强制跟 overrides，避免 hash 路径跨包 404。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-08-11 | `Fix` | 修复换品牌包后侧栏 Logo 请求旧 hash（如 `/png/logo-GZsaIQKl.png`）404。 | `brandLogo` 改为 public `/logo.png`；`initPreferences` 强制 overrides。详见 [变更日志](../../changelogs/change-log-2026-08-11-brand-logo-prefer-overrides.md)。 |
| 2026-08-11 | `Chore` | 更新龙山品牌资源 `assets/img/longshan/logo.png` | — |
| 2026-08-11 | `Style` | 折叠侧边栏且显示标题时 Logo 由 `mx-auto` 改为 `mr-auto`，靠左对齐并保留 `px-3` | 类名来自 `layouts` 的 `logoClass`，经 `$attrs.class` 落到 `VbenLogo` 的 `<a>` |
| 2026-08-09 | `Style` | 默认 `theme.radius` 由 `1` 调整为 `0.5` | — |
