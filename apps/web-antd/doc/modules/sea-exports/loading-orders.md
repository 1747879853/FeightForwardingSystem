---
title: 监装列表
module: 操作管理 / 监装
author: auto-doc-sync
last_updated: 2026-09-14
---

# 1. 业务背景说明 (Background)

**白话解释：** 管理端按工单维度查看全部监装进度，不必先进某一票海运出口。列表用于检索、看状态与派单人，双击进入该票海出编辑页的「监装」Tab 继续处理。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/loading-orders` |
| 路由名称 | `LoadingOrderList` |
| 页面组件 | `src/views/loading-order-admin/list.vue` |
| 权限口径 | `Admin.SeaExport.LoadingOrder` |
| 关键源码 | `src/router/routes/modules/operation-management.ts`<br/>`src/views/loading-order-admin/list.vue`<br/>`src/views/loading-order-admin/data.ts`<br/>`src/api/sea-export/loading-order-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **分页检索：** `createPagedListQuery(getLoadingOrderPagedList, { defaultSort: 'CreationTime DESC', mapParams: normalizeQuery })` 调 `LoadingOrderAdmin/GetPagedListAsync`。搜索不自动查询（`submitOnChange: false`），需点「查询」。
- **无操作列：** 不提供行内编辑/删除；双击行进入 `/sea-exports/:seaExportId/edit?tab=loadingOrder`。海出已被删（`seaExportId` 空或全 0）时 toast「关联的海运出口已删除，无法打开监装页」。
- **派单人：** 列 `field` 为 `submitUserName`，只展示姓名（空为 `-`）。PC 端不提供拨打；小程序列表才可拨打 `submitUserPhone`。
- **返回刷新：** 路由 `keepAlive`；从海出编辑页返回时 `useRefreshListOnFormReturn('LoadingOrderList')` 刷新。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| 页面初始 | 进入 `/loading-orders` | 自动查询列表 | 默认按创建时间倒序。 |
| 列表有数据 | 双击行 | 海出编辑页监装 Tab | `seaExportId` 有效时跳转。 |
| 海出已删 | 双击行 | 停留列表 | toast 拦截，不跳转。 |

工单自身状态（未提交 / 待认领 / 已认领 / 已完成）在海出监装 Tab 流转，本页只展示 Tag。

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **监装工单号** | 工单编号。 | 列/筛 `loadingOrderNum` | 模糊检索。 | 可清空。 |
| **监装状态** | 工单状态 Tag。 | 列/筛 `status`；`LOADING_ORDER_STATUS_TEXT` | 颜色与海出监装 Tab 一致。 | 枚举可清空。 |
| **派单人（submitUserName）** | 提交工单的人。 | 列表 DTO `submitUserName` | **PC 只读姓名**；电话 `submitUserPhone` 接口仍返回，本页不展示、不拨打。 | 空显示 `-`。 |
| **提交/认领/完成/创建时间** | 工单节点时间。 | `submitTime` / `claimTime` / `completeTime` / `creationTime` | 创建时间筛拆成起止日 ISO。 | 空显示 `-`。 |
| **监装师傅** | 已派师傅姓名。 | `loadingOrderUsers` | 拼接 nickName/enName。 | 空显示 `-`。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：PC 不能拨打]** 派单人列不要做成链接或 `tel:` 弹窗。桌面浏览器无法打电话；拨打只留在小程序监装列表。

> [!IMPORTANT] **[卡点 2：海出已删仍可能出现在列表]** 双击前必须判断 `seaExportId` 是否空/全 0，否则会进无效编辑页。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-09-14 | `Fix` | PC 监装列表派单人改为纯文本，去掉拨打弹窗。 | 小程序仍走 `submitUserPhone` + `tel:`；PC 列 field 保持 `submitUserName`。 |
