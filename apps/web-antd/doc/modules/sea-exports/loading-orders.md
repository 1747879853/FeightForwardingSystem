---
title: 监装列表
module: 操作管理 / 监装
author: auto-doc-sync
last_updated: 2026-09-20
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

- **列表派生文本刷新：** 船名航次组合文案、船公司名称回退使用函数插槽直接读取当前行，避免绑定字段不变时复用旧格式化文本；列键、排序、显隐、宽度和字段权限沿用原配置，导出取值同步。

- **分页检索：** `createPagedListQuery(getLoadingOrderPagedList, { defaultSort: 'EstimatedArrivalTime DESC', fieldMap: LOADING_ORDER_SORT_FIELD_MAP, mapParams: normalizeQuery })` 调 `LoadingOrderAdmin/GetPagedListAsync`。搜索不自动查询（`submitOnChange: false`），需点「查询」。默认按预计到货时间倒序，与小程序列表一致。监装状态筛走多选 `statuses`（`repeat` 序列化），不再传单选 `status`。
- **列头排序：** 只开后端 `ApplySorting` 认的路径。工单号/`Status`/预计到货/备注/提交认领完成创建时间走工单表字段；主提单号 `SeaExport.TransportOrder.MblNum`；船名 `SeaExport.Vessel`；船公司 `SeaExport.Carrier.CnShortName`；件数 `SeaExport.TransportOrder.Pkgs`；堆场 `CarrierYard.Name`；师傅 `LoadingOrderUsers.UserId`。品名集合、派单人昵称不可排。
- **无操作列：** 不提供行内编辑/删除；双击行进入 `/sea-exports/:seaExportId/edit?tab=loadingOrder`。海出已被删（`seaExportId` 空或全 0）时 toast「关联的海运出口已删除，无法打开监装页」。
- **派单人：** 列 `field` 为 `submitUserName`，只展示姓名（空为 `-`）。PC 端不提供拨打；小程序列表才可拨打 `submitUserPhone`。
- **返回刷新：** 路由 `keepAlive`；从海出编辑页返回时 `useRefreshListOnFormReturn('LoadingOrderList')` 刷新。

- **状态配色：** 未提交灰色、待认领橙色、已认领蓝色、已完成深绿色；标签采用浅底深字、无描边。未知状态使用灰色。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| 页面初始 | 进入 `/loading-orders` | 自动查询列表 | 默认按预计到货时间倒序。 |
| 列表有数据 | 双击行 | 海出编辑页监装 Tab | `seaExportId` 有效时跳转。 |
| 海出已删 | 双击行 | 停留列表 | toast 拦截，不跳转。 |

工单自身状态（未提交 / 待认领 / 已认领 / 已完成）在海出监装 Tab 流转，本页只展示 Tag。

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **监装工单号** | 工单编号。 | 列/筛 `loadingOrderNum` | 模糊检索。 | 可清空。 |
| **监装状态** | 工单状态 Tag。 | 列 `status`；筛 `statuses`；`LOADING_ORDER_STATUS_TEXT` | 检索多选，Query `statuses=1&statuses=2`。颜色与海出监装 Tab 一致。 | 枚举可清空；空不下发。 |
| **派单人（submitUserName）** | 提交工单的人。 | 列表 DTO `submitUserName` | **PC 只读姓名**；电话 `submitUserPhone` 接口仍返回，本页不展示、不拨打。实体没有昵称导航，**列头不可排序**。 | 空显示 `-`。 |
| **提交/认领/完成/创建时间** | 工单节点时间。 | `submitTime` / `claimTime` / `completeTime` / `creationTime` | 创建时间筛拆成起止日 ISO。 | 空显示 `-`。 |
| **监装师傅** | 已派师傅姓名。 | `loadingOrderUsers` | 拼接 nickName/enName。列头排序走 `LoadingOrderUsers.UserId`（先输入的师傅）。 | 空显示 `-`。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：PC 不能拨打]** 派单人列不要做成链接或 `tel:` 弹窗。桌面浏览器无法打电话；拨打只留在小程序监装列表。

> [!IMPORTANT] **[卡点 2：海出已删仍可能出现在列表]** 双击前必须判断 `seaExportId` 是否空/全 0，否则会进无效编辑页。

> [!IMPORTANT] **[卡点 3：师傅列按用户 id 排，不是按姓名]** 列头排序传 `LoadingOrderUsers.UserId`，取先输入师傅的 id。列表显示姓名，所以顺序不一定按拼音/字母。没有师傅的行视为空。最多两个师傅时不按第二个人排。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-09-20 | `Feature` | 监装状态检索改为多选，请求字段从 `status` 换成 `statuses`。 | 对接后端 `cbcd036d`；`paramsSerializer: 'repeat'`。详见[变更记录](../../changelogs/change-log-2026-09-20-监装列表状态多选.md)。 |
| 2026-09-20 | `Fix` | 监装列表默认改为预计到货时间倒序，与小程序同一口径。 | `defaultSort` / `GetMyPagedListAsync` 显式传 `EstimatedArrivalTime DESC`；不传时后端基类仍是 `CreationTime DESC`。详见[变更记录](../../changelogs/change-log-2026-09-20-监装列表默认预计到货倒序.md)。 |
| 2026-09-20 | `Fix` | 监装列表列头排序按后端 `ApplySorting` 收口：能 JOIN/customPaths 的列可排，品名与派单人关掉。 | `LOADING_ORDER_SORT_FIELD_MAP` 与列 `sortField` 对齐实体导航；详见[变更记录](../../changelogs/change-log-2026-09-20-监装列表排序对齐后端.md)。 |
| 2026-09-20 | `Fix` | 监装列表点「监装师傅」列头按先输入师傅的用户 id 排序。 | 列 field 保持集合路径；`sortField`/`fieldMap` 对齐后端 `LoadingOrderUsers.UserId`。详见[变更记录](../../changelogs/change-log-2026-09-20-监装列表师傅排序.md)。 |
| 2026-09-20 | `Fix` | 修复船名航次组合文案、船公司名称回退刷新后可能显示旧值。 | 使用共享 `rowTextColumn` 函数插槽及导出取值，保留列配置；详见[变更记录](../../changelogs/change-log-2026-09-20-列表派生文本刷新.md)。 |
| 2026-09-15 | `Fix` | 主提单号列改绑 `seaExport.transportOrder.mblNum`；堆场列删多余 formatter。 | 详见 [变更日志](../../changelogs/change-log-2026-09-15-list-column-object-path.md)。 |
| 2026-09-14 | `Fix` | PC 监装列表派单人改为纯文本，去掉拨打弹窗。 | 小程序仍走 `submitUserPhone` + `tel:`；PC 列 field 保持 `submitUserName`。 |
| 2026-09-14 | `Fix` | 状态列采用灰、橙、蓝、绿区分状态，去除描边并加深文字。 | 仅调整展示，状态枚举与筛选不变。 |
