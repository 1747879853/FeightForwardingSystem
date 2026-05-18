---
title: 枚举管理
module: 系统管理
author: auto-doc-sync
last_updated: 2026-05-18
---

# 1. 业务背景说明 (Background)

**白话解释：** 维护系统枚举项，为前端字典、状态展示和业务选项提供数据来源。在后台配好枚举后，各业务页面通过统一工具函数按「枚举名称」读取选项，无需在各页面硬编码字典。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/system/enumeration` |
| 路由名称 | `SystemEnumeration` |
| 页面组件 | `src/views/system/enumeration/list.vue` |
| 权限口径 | Admin / Admin.Get |
| 关键源码 | `src/router/routes/modules/system.ts`<br/>`src/views/system/enumeration/list.vue`<br/>`src/api/system/enum-admin.ts`<br/>`src/utils/init-enum.ts` |

**业务页面接入指南（推荐阅读）：** [枚举在业务页面中的使用指南](../../guides/enumeration-usage-in-pages.md)

# 2. 功能与操作说明 (Features & Operations)

- **列表/页面访问：** 通过 `/system/enumeration` 进入「枚举管理」页面。
- **新建/编辑枚举：** 维护枚举名称（英文唯一）、描述及子表枚举值（`value`、`displayName`、`enable` 等）。
- **业务页面消费：** 使用 `getEnumItems('枚举名称')` 获取选项；详见 [使用指南](../../guides/enumeration-usage-in-pages.md)。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |
| 枚举已配置 | 业务页调用 `getEnumItems` | 选项可用 | 优先读 localStorage 缓存，未命中则请求 `GetItemsByNameAsync`。 |
| 后台变更枚举 | 清缓存并刷新 | 选项更新 | 调用 `clearEnumCache()` + `initEnumCache(true)` 或刷新页面。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **枚举名称 name** | 全局唯一英文 key，代码中 `getEnumItems(name)` 的参数。 | 枚举管理表单 / `EnumerationListDto.name` | **触发/依赖：** 业务页按此名称拉取子项。 | 唯一校验，大小写敏感。 |
| **枚举值 value** | 存库与接口提交用的数字。 | 枚举子表 `EnumerationItemDto.value` | **触发/依赖：** 表单绑定 value，展示用 displayName。 | 数值类型。 |
| **展示文本 displayName** | 下拉、表格展示文案。 | 枚举子表 | **触发/依赖：** 映射为 Select 的 `label`。 | 展示层可选填，建议必填。 |
| **是否启用 enable** | 该项是否作为有效选项。 | 枚举子表 | **触发/依赖：** 前端可过滤未启用项。 | 布尔。 |
| **权限码** | 控制枚举管理页可见与访问。 | `src/router/routes/modules/system.ts` | **触发/依赖：** 经 `abpPageAuthority` 参与动态路由过滤。 | 用户须具备 Admin 相关权限。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：枚举名称不一致]** 后台配置的 `name` 与代码中 `getEnumItems('...')` 不一致（含大小写）时，接口返回空数组，下拉无选项。应从枚举管理页复制名称。

> [!IMPORTANT] **[卡点 2：缓存未刷新]** 后台修改枚举后，前端可能仍显示 localStorage 旧数据。需 `clearEnumCache()` 后 `initEnumCache(true)` 或强制刷新页面。

> [!IMPORTANT] **[卡点 3：枚举管理一致性]** 系统管理页面影响权限、组织、审批和缓存等底层能力，变更前需确认业务模块依赖。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-05-16 | `Parsing` | 无 | 按路由与页面源码重建文档；权限口径 Admin / Admin.Get。 |
| 2026-05-18 | `Parsing` | 无 | 补充「业务页面如何使用枚举」：新增 [enumeration-usage-in-pages.md](../../guides/enumeration-usage-in-pages.md)；梳理 `getEnumItems` / `initEnumCache` / `GetItemsByNameAsync` 链路及海出运价、订单费用等参考实现。 |
