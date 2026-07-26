---
title: 津海通桌宠（JhtMascot）
module: 共享能力
author: AI助手
last_updated: 2026-07-26
---

# 1. 业务背景说明 (Background)

**白话解释：** 津海通（jht）品牌登录后，在应用根布局叠加可拖拽的 3D 桌宠，增强品牌感知；非 jht 品牌不展示。

# 2. 功能与操作说明 (Features & Operations)

- **条件展示：** `app.vue` 通过 `shouldShowJhtMascot` 判断品牌后挂载 `JhtMascot`。
- **模型加载：** Three.js `GLTFLoader` 从固定 OSS 地址加载 `.glb`。
- **交互：** 可拖拽定位、关闭；位置与关闭状态按品牌 storage key 持久化。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作   | 目标状态   | 状态说明                   |
| :------- | :------------ | :--------- | :------------------------- |
| 加载中   | GLTF 请求成功 | 可交互展示 | 渲染场景并启用拖拽         |
| 加载中   | GLTF 请求失败 | 错误提示   | `loadError`，可关闭组件    |
| 展示中   | 用户点关闭    | 已关闭     | 写入持久化，下次默认不展示 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **modelUrl** | 桌宠 GLB 模型地址 | `https://oss.jiayuebetter.com/fantasy_creature_desktop_pet.glb` | **触发/依赖：** 组件挂载时 `GLTFLoader.load` | OSS 需 CORS；路径与对象名一致 |
| **storageKey** | 关闭/位置持久化键 | `buildBrandStorageKey('jht-desktop-mascot:v2')` | **触发/依赖：** 拖拽结束、关闭 | 按品牌隔离 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：OSS CORS]** 浏览器跨域拉取 GLB 被拒 -> 桌宠进入加载失败态。需保证 `oss.jiayuebetter.com` 对前端来源开放 CORS。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-07-26 | `Refactor` | 桌宠 GLB 改为 OSS 直链，删除本地 `public/models/jht` 资源。 | `modelUrl` 不再依赖 `import.meta.env.BASE_URL` 本地路径。 |
