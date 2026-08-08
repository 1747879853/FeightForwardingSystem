---
title: 空运出口列表
module: 空运出口
author: auto-doc-sync
last_updated: 2026-08-08
---

# 1. 业务背景说明 (Background)

**白话解释：** 空运出口列表是空运委托单的检索入口，也是进入新建与编辑的唯一通道。空运与海运共用业务主表，但航段、货物明细和派生值算法完全不同。支持勾选多票发起运踪订阅，并在「运踪状态」列查看订阅与推送情况。

**路由与源码定位：**

| 项目 | 内容 |
| :-- | :-- |
| 页面路由 | `/air-exports` |
| 路由名称 | `AirExportList` |
| 页面组件 | `src/views/air-export-admin/list.vue` |
| 权限口径 | `Admin.AirExport`；运踪订阅 `Admin.ExternalApi.Use`、查看运踪 `Admin.ExternalApi.Get` |
| 关键源码 | `src/router/routes/modules/operation-management.ts`<br/>`src/views/air-export-admin/list.vue`<br/>`src/views/air-export-admin/data.ts`<br/>`src/views/air-export-admin/use-air-export-copy.ts`<br/>`src/views/air-export-admin/use-yundang-air-subscribe.ts`<br/>`src/views/air-export-admin/use-yundang-air-track.ts`<br/>`src/api/air-export/air-export-admin.ts`<br/>`src/api/yundang/yundang-air-admin.ts` |

# 2. 功能与操作说明 (Features & Operations)

- **委托检索：** 关键字一次模糊匹配航班、外部备注、主提单号、合同号、委托编号 5 个字段；会计期间默认当月。
- **「未填写」开关：** 航班、订舱代理、起运地、中转地、目的地各带一个开关，与选值互斥（选了值禁开关，开了开关禁选值）。
- **货物明细区间筛选：** 件数、重量、长、宽、高、体积、体积重、计费重各一个区间，语义是「该票存在满足条件的行」。
- **分组统计：** 支持 9 个分组维度（委托单位 3、起运地 5、目的地 6、仓库 12、车队 13、订舱代理 15、中转地 16、保险公司 17、报关行 18），分组设置按 `group_config_AirExportList` 持久化。
- **复制 / 删除：** 工具栏复制（可选同时复制费用）、删除（该票有费用时前端先拦一层）。
- **运踪订阅：** 工具栏「运踪订阅」（需 `Admin.ExternalApi.Use`），勾选后调 `BatchSubscribeAirBillAsync`；>30 票提示后端自动分批；结果 Modal 逐条展示成功/失败；规则 Tooltip 说明订阅单号=主运单号、航司系统自动识别。
- **运踪状态列：** 付费状态列后展示四态文案（未订阅/订阅失败/等待数据/节点描述）；有 `Admin.ExternalApi.Get` 时可点击打开运踪详情 Modal。
- **进入编辑 / 新建：** 双击行进 `/air-exports/:id/edit`；新建进 `/air-exports/create`。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| 页面初始 | 用户进入路由 | 页面可用 | 关闭 `autoLoad`，先写入默认会计期间与持久化分组字段再触发首查。 |
| 列表 | 用户点「复制」 | 新票编辑页 | 复制不校验组织归属，新票所属组织沿用源票。 |
| 列表已勾选 | 用户点「运踪订阅」 | 订阅结果 Modal | 汇总 toast + 逐条结果；成功后刷新列表运踪状态列。 |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **委托编号** | 空运委托的业务识别号。 | `transportOrder.commissionNum` | **触发/依赖：** 贯穿列表、编辑与费用。 | 不填由后端按 `AirExport.CommissionNum` 规则生成。 |
| **起运地 / 中转地 / 目的地** | 空运三段航段。 | `pol` / `pot` / `pod` 对象（`App_AirPorts`） | **触发/依赖：** 展示为「三字码/中文名」，不带出国家、城市、时区。 | 都不必填。 |
| **体积重合计 / 计费重合计** | 整票的体积重、计费重。 | 由 `airExportOrderCtns` 各行相加 | **触发/依赖：** 后端不返回票级合计字段，界面自行汇总。 | 无。 |
| **应收状态 / 应付状态** | 组合费用状态。 | `receiveFeeStatus` / `payFeeStatus` | **触发/依赖：** 无该方向费用时为 `null`。 | 只读。 |
| **运踪状态** | 订阅与推送四态展示。 | `isYundangSubscribed` / `isYundangSubscribeSuccess` / `yundangAirShipmentNode` | **触发/依赖：** 有查看权限可点开运踪详情。 | 只读；订阅权限与编辑权限独立。 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：分组枚举与海运不通用]** 空运只接受 3/5/6/12/13/15/16/17/18 九个分组值，传海运的船公司 `4` 会报「不支持的分组字段」。

> [!IMPORTANT] **[卡点 2：明细区间筛选是「存在」语义]** 「计费重 ≥ 1000」筛的是「至少有一行不低于 1000」，不是整票合计，搜索区已加说明文案。

> [!IMPORTANT] **[卡点 3：报关/送仓日期带时分秒]** 这两个日期后端原样保存，筛选止端必须补到当天 23:59:59，否则漏掉当天数据。

> [!IMPORTANT] **[卡点 4：运踪订阅依赖主运单号]** 订阅单号取 `transportOrder.mblNum`，未填主运单号的票后端直接判失败；用户可见文案不出现服务商名称。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-08-08 | `Feature` | 列表工具栏运踪批量订阅 +「运踪状态」列 + 运踪详情 Modal。 | 镜像海运出口：`yundang-air-admin` + `use-yundang-air-subscribe/track`；详见 `changelogs/change-log-2026-08-08-air-export-yundang-subscribe.md`。 |
| 2026-08-05 | `Feature` | 新建空运出口列表：关键字、「未填写」开关、明细区间筛选、9 维分组统计、复制与删除，权限 `Admin.AirExport`。 | 以 `sea-import-admin/list.vue` 为范式；分组字段改用 `AirExportGroupField`，分组结果无 `logo` 字段；报关/送仓日期区间单独按 `endOf('day')` 处理。 |
