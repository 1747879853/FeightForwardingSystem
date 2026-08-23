---
title: 客户新建
module: 客户管理
author: auto-doc-sync
last_updated: 2026-08-23
---

# 1. 业务背景说明 (Background)

**白话解释：** 创建客户基础资料，为后续联系人、账期、发票、附件等客户子资料提供主记录。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/clients/create` |
| 路由名称 | `ClientCreate` |
| 页面组件 | `src/views/client/base/form.vue` |
| 权限口径 | 未在路由中声明独立权限 |
| 关键源码 | `src/router/routes/modules/client.ts`<br/>`src/views/client/list.vue`<br/>`src/views/client/base/form.vue`<br/>`src/views/client/editor.vue`<br/>`src/views/client/base/data.ts`<br/>`src/views/client/contact/data.ts`<br/>`src/views/client/payment-terms/data.ts`<br/>`src/views/client/invoice/data.ts`<br/>`src/api/sea-export/client-admin.ts`<br/>`src/api/sea-export/client-contact-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **基础资料录入：** 填写客户基础字段并提交创建接口。未保存切走可 KeepAlive，点 X 才丢。
- **创建后流转：** 页面级表单创建成功后应进入客户编辑上下文，而不是简单返回列表。保存前先刷新脏基线，避免误拦跳转。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作  | 目标状态 | 状态说明                           |
| :------- | :----------- | :------- | :--------------------------------- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **客户基础字段** | 客户名称、编码、类型、地址等主数据。 | `src/views/client/base/data.ts` | **触发/依赖：** 创建成功后成为联系人、账期、发票等子模块的父级。 | 必填、格式和唯一性以后端接口为准。 |
| **页面根节点** | 表单页面必须保持单元素根。 | `src/views/client/base/form.vue` | **触发/依赖：** 受 `RouterView` 外层 `Transition` 影响。 | 禁止退化为多根 Fragment。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：客户新建一致性]** 客户新建页曾因多根节点影响路由切换，后续新增弹窗或辅助节点时必须放入同一主容器。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-08-23 | `Feature` | 新建页 KeepAlive 与未保存提示。 | `keepAliveName: ClientAdminForm`。详见 `changelogs/change-log-2026-08-23-detail-keep-alive-unsaved.md`。 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/clients/create` 对应组件 `src/views/client/base/form.vue`，权限口径为 未在路由中声明独立权限。 |
