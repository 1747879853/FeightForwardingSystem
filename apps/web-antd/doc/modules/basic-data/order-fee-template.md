---
title: 自动费用模板
module: 基础资料
author: auto-doc-sync
last_updated: 2026-09-05
---

# 1. 业务背景说明 (Background)

**白话解释：** 维护按业务类型、收付、客户等条件匹配的费用明细模板，开票时自动带出费用行。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/basic-data/order-fee-template`、`/create`、`/:id/edit` |
| 路由名称 | `BasicDataOrderFeeTemplate` / `Create` / `Edit` |
| 页面组件 | `src/views/system/basic-data/OrderFeeTemplateAdmin/list.vue`、`edit.vue` |
| 权限口径 | `Admin.OrderFeeTemplate` |
| 关键源码 | `src/router/routes/modules/basic-data.ts`<br/>`src/api/sea-export/order-fee-template-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **列表：** 检索、新建、双击编辑、删除模板。
- **新建 / 编辑：** 表头条件 + Handsontable 费用明细。未保存切走可 KeepAlive，点 X 才销毁。
- **旧地址：** `/basic-data/order-fee-template/edit?mode=&id=` 重定向到新路由。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| 空白新建 | 保存成功 | 编辑页 | `replace` 到 `/:id/edit` 并关闭新建页签，跳转前刷新脏基线。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **name** | 模板名称 | `OrderFeeTemplateAdmin` | 列表检索 | 必填 |
| **orderFeeTemplateItems** | 费用明细 | 同上 | 与表头一起保存 | 表头或明细任一改动即脏 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：新建与编辑必须分 path]** 二者共用组件，但若仍走同一 path + query，全局守卫「同 path 不拦」，模板互切不会弹窗。

> [!IMPORTANT] **[卡点 2：新建保存后必须关闭原 Tab]** `/create` 与 `/:id/edit` 是不同 Tab key；仅 `replace` 仍会留下新建页签。须先缓存 `route.fullPath`，`await replace` 后再 `closeTabByKey`。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-09-05 | `Fix` | 新建模板保存成功后 `replace` 进编辑并关闭新建页签。 | 详见 `changelogs/change-log-2026-09-05-create-tab-replace-close.md`。 |
| 2026-08-23 | `Feature` | 拆成 `/create` 与 `/:id/edit`；对齐未保存提示 + KeepAlive。 | 组件名 `OrderFeeTemplateEditor`。详见 `changelogs/change-log-2026-08-23-detail-keep-alive-unsaved.md`。 |
