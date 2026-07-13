---
title: 客户列表
module: 客户管理
author: auto-doc-sync
last_updated: 2026-07-12
---

# 1. 业务背景说明 (Background)

**白话解释：** 维护客户主数据列表，是客户新建、编辑、删除和业务选择的统一入口。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/clients` |
| 路由名称 | `ClientList` |
| 页面组件 | `src/views/client/list.vue` |
| 权限口径 | 未在路由中声明独立权限 |
| 关键源码 | `src/router/routes/modules/client.ts`<br/>`src/views/client/list.vue`<br/>`src/views/client/base/form.vue`<br/>`src/views/client/editor.vue`<br/>`src/views/client/base/data.ts`<br/>`src/views/client/contact/data.ts`<br/>`src/views/client/payment-terms/data.ts`<br/>`src/views/client/invoice/data.ts`<br/>`src/api/sea-export/client-admin.ts`<br/>`src/api/sea-export/client-contact-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **列表查询：** 通过客户列表页筛选并分页加载客户资料。
- **顶部操作：** 遵循项目规范，基于勾选记录执行新增、修改、删除等动作；**仅点击 checkbox 才选中**（`checkboxConfig.trigger: 'default'`），单击行不切换选中。
- **页面缓存：** 路由 `ClientList` 已开启 `keepAlive`；从新建/编辑页返回时通过 `onActivated` 自动刷新列表，当前页删除成功后立即 `gridApi.query()`。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作  | 目标状态 | 状态说明                           |
| :------- | :----------- | :------- | :--------------------------------- |
| 页面初始 | 用户进入路由 | 页面可用 | 由动态路由与权限守卫完成组件挂载。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **客户名称** | 客户主数据的展示与检索核心字段。 | `src/views/client/base/data.ts` / 客户接口 | **触发/依赖：** 在运单、费用、对账等模块被复用为选择源。 | 新增/编辑时应保持必填与唯一性以后端校验为准。 |
| **客户编码** | 客户识别编码。 | `src/api/sea-export/client-admin.ts` | **触发/依赖：** 列表展示与业务单据引用客户时共同使用。 | 不得与其他客户混淆。 |
| **行业类别** | 客户/供应商业务角色，后端存字母串，列表映射为中文。 | `industryCategories` + `formatIndustryCategories` / `getIndustryCategoryOptions` | **触发/依赖：** 字母码与枚举一一对应（`a` 船公司、`k` 代理等）；映射表缺项会原样显示字母。 | 列表展示用全量选项；表单勾选为客户/供应商子集。 |
| **勾选记录** | 顶部操作的目标集合。 | `list.vue` 表格选择状态 | **触发/依赖：** 查询、刷新、翻页前需要清理选择。 | 删除前必须二次确认。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：客户列表一致性]** 客户删除、批量选择和跨页选择容易造成误操作，列表需保持顶部按钮状态与实际勾选集一致。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-07-12 | `Fix` | 行业类别列补齐 `a`→船公司、`k`→代理 映射，不再露出字母。 | `formatIndustryCategories` 依赖全量 `getIndustryCategoryOptions`；`a` 曾被注释、`k` 整项缺失导致回退显示字母码。 |
| 2026-07-12 | `Fix` | 客户列表仅点击 checkbox 才选中，单击行不再切换勾选；联系人/付款条件子表 radio 同步改为仅点控件选中。 | `checkboxConfig`/`radioConfig` 的 `trigger` 由 `'row'` 改为 `'default'`。 |
| 2026-05-30 | `Feature` | 客户列表路由开启 `keepAlive`；从 `/clients/create` 或编辑页返回时 `onActivated` 自动刷新，删除成功后即时刷新。 | 独立表单页列表需在缓存开启后补 `onActivated`，否则返回列表会展示旧数据；详见 [列表页 keepAlive 与刷新约定](../../guides/list-page-keepalive-refresh.md)。 |
| 2026-05-16 | `Parsing` | 无 | 按 `src/router/routes/modules` 动态路由与页面源码重建文档；页面 `/clients` 对应组件 `src/views/client/list.vue`，权限口径为 未在路由中声明独立权限。 |
