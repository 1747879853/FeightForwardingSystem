---
title: 租户配置
module: 系统管理
author: auto-doc-sync
last_updated: 2026-09-22
---

# 1. 业务背景说明 (Background)

**白话解释：** 给当前租户维护一组自定义键值对（列表默认列、业务开关、提示文案等）。配置名由前端自己起，值是字符串，后端不解释含义。同一租户共用一份，不是个人偏好。

业务口径、表结构、卡点见 [租户配置模块总逻辑文档](../../租户/租户配置模块总逻辑文档.md)；接口字段见 [租户配置模块接口文档](../../租户/租户配置模块接口文档.md)。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/system/tenant-config` |
| 路由名称 | `SystemTenantConfig` |
| 页面组件 | `src/views/system/tenant-config/list.vue` |
| 权限口径 | **暂借**权限配置：`Admin.UserDataPermission` / `Admin.UserPropPermission` / `Admin.UserTablePermission`（含 Get/Add/Edit/Delete）；后端接口本身仍只需登录 |
| 关键源码 | `src/router/routes/modules/system.ts`<br/>`src/views/system/tenant-config/`<br/>`src/api/system/tenant-config.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **列表：** 分页查询自定义配置，关键字同时模糊匹配配置名和配置值；后端固定按配置名升序，系统预定义设置（`App.*` / `Abp.*`）不会出现。
- **新增：** 填写配置名与配置值。重名不会覆盖，后端直接报错。
- **编辑：** 只能改配置值，配置名不可改。值为空时记录仍在，与「没配过」不是同一状态。
- **删除：** 按配置名物理删除，单条与批量都走 `DeleteAsync`；批量全有或全无，前端二次确认。
- **保存：** 列表页已知记录是否存在，新增走 `AddAsync`，编辑走 `EditAsync`。其它业务页若不确定是否已配，应先 `DetailAsync`（`result === null` 才新增）。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| 配置名不存在 | 新增 | 存在 | 写入当前租户、`UserId` 为空 |
| 已存在 | 编辑 | 值被整体替换 | 后提交的覆盖前面的，无版本号 |
| 已存在 | 删除 | 不存在 | 物理删除，不可恢复 |
| 已存在且值为空 | 查详情 | 仍存在 | `result` 非 null，`value` 为 null |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **name** | 配置名，本模块业务主键，创建后不可改。 | 表单自定义 | 编辑/删除/详情都按它定位 | 必填，最长 256，同租户唯一，大小写不敏感；禁止 `App.` / `Abp.` 前缀 |
| **value** | 配置值，后端原样存储。 | 表单字符串 | 编辑整体覆盖，不合并 | 非必填，不限长度 |
| **creatorUserName / lastModifierUserName** | 创建人、最后修改人昵称 | 列表/详情出参 NickName | 从未修改过时后者为空 | 只读 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：不要和租户设置页搞混]** 站点名、密码策略等走 `TenantSettings/GetAllSettings`（无 Async）。本页只管理前端自定义名。

> [!IMPORTANT] **[卡点 2：值为空 ≠ 不存在]** 清空值后记录还在，下次保存必须走编辑，不能再新增。

> [!IMPORTANT] **[卡点 3：租户共用、无权限点]** A 改了 B 立刻看到。不要存密钥；宿主账号不能用。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 | 🤖 代码解析与架构洞察 |
| :-- | :-- | :-- | :-- |
| 2026-09-22 | `Feature` | 系统管理新增租户配置列表页：分页、关键字、新增/编辑弹窗、单条与批量物理删除。菜单与增删改查暂借权限配置权限点。 | 对接 `TenantConfig` 五个接口，定位键是 `name`。路由 `authority` 与按钮暂用 `Admin.UserDataPermission` / `UserPropPermission` / `UserTablePermission`。 |
