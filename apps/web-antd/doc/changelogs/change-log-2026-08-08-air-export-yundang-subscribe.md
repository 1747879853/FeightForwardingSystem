---
title: 空运出口运踪订阅前端对接
module: 空运出口 / 外部Api对接
author: auto-doc-sync
last_updated: 2026-08-08
---

# 1. 背景意图 (Background)

**白话解释：** 对照海运出口，在空运出口对接第三方运踪的空运运单能力。列表勾选多票（或编辑页单票）发起「运踪订阅」，逐条展示成功/失败结果；列表「运踪状态」列与编辑页「运踪信息」Tab 展示订阅状态与推送的运单动态（里程碑/航段/状态轨迹），等待推送时自动轮询。对接的后端接口为 `YundangAirAdmin`（批量订阅/推送信息查询）。

# 2. 核心逻辑变更 (Core Logic)

## 2.1 API

- 新增 `src/api/yundang/yundang-air-admin.ts`：
  - `batchSubscribeAirBill` → `POST services/app/YundangAirAdmin/BatchSubscribeAirBillAsync`（入参 `airExportIds`，单次 ≤30 条，超出后端自动分批）；
  - `getAirPushInfo` → `GET services/app/YundangAirAdmin/GetAirPushInfoAsync`（订阅记录 + 运单动态）。
- DTO 与海运口径差异：订阅结果用 `itemCode/itemCodeDesc/itemMessage`（海运是 `resultType/errorMessage`）；运单动态为 `flights`（航段）/`statuses`（状态轨迹）/`nodes`（空运节点），无集装箱/船舶航段概念。
- `AirExportDto` 新增 `isYundangSubscribed` / `isYundangSubscribeSuccess` / `yundangAirShipmentNode`（最后一个有实际时间的空运节点），列表/详情接口直接返回。

## 2.2 共享流程

- `use-yundang-air-subscribe.ts`：订阅状态推导（未订阅/失败/成功）+ `subscribe` → toast 汇总 → 结果 Modal；行标签取 `commissionNum || mblNum`。
- `use-yundang-air-track.ts`：四态推导（never_subscribed/subscribe_failed/waiting_push/has_shipment）+ 运踪状态列文案/颜色 + 打开运踪 Modal。
- `yundang-air-subscribe-result-modal.vue`：逐条展示委托/单号、订阅单号、航司、状态、结果（`itemCodeDesc`）、失败原因（`itemMessage`）。
- `yundang-air-tracking-modal.vue` / `yundang-air-tracking-panel.vue`：面板四态展示；有动态时顶部 Descriptions（运单号/航司/航班/起降地/ETD/ATD/ETA/ATA/当前状态/跟踪状态）+ Tabs（里程碑/航段/状态轨迹）；`waiting_push` 时 30s 轮询最多 20 次。

## 2.3 列表 (`list.vue` + `data.ts`)

- 工具栏加「运踪订阅」（`Admin.ExternalApi.Use`），带规则说明 Tooltip；勾选 >30 票提示后端自动分批。
- 新增「运踪状态」列（付费状态列后）：有 `Admin.ExternalApi.Get` 权限可点击弹运踪详情，无权限纯文本。

## 2.4 编辑页 (`editor.vue` + `basic-info-form/form.vue`)

- 基础信息工具栏加「运踪订阅/重新订阅」按钮（仅 `isEdit` + `Admin.ExternalApi.Use`），已成功订阅禁用；订阅后重新加载详情刷新状态。
- 编辑工作台新增「运踪信息」Tab，内嵌运踪面板（无状态字段时从推送详情的订阅记录推导四态）。

# 3. 避坑指南 (Blockers)

> [!IMPORTANT]
>
> 1. **用户可见层不出现服务商名称**：页面文案/提示统一「运踪订阅/运踪状态/运踪详情」中性表述（航司识别写作「系统自动识别」）；仅内部对接层（接口路径、DTO 字段、文件名）保留 `Yundang` 契约名。
> 2. **权限独立**：订阅用 `Admin.ExternalApi.Use`、查看运踪用 `Admin.ExternalApi.Get`，与 `Admin.AirExport` 编辑权限无关。
> 3. **重新订阅走批量接口**：与海运前端一致，未单独对接 `ResubscribeAirBillAsync`；后端批量接口按订阅单号判重（已成功 → 返回「已成功订阅」明细，失败/单号变更 → 允许重订）。
> 4. **订阅单号即主运单号**：`referenceNo` 取 `transportOrder.mblNum`，未填主运单号的票后端直接判失败；航司留空由服务商自动识别（`carrierCd` 返回值即识别结果）。
> 5. **编辑页未保存**：订阅读库内数据，与表单当前输入可能不一致。

# 4. 变更日志 (Changelog)

| 日期 | 变更类型 | 业务功能变动 | 代码解析与架构洞察 |
| :-- | :-- | :-- | :-- |
| 2026-08-08 | `Feature` | 空运出口列表批量订阅 + 运踪状态列 + 运踪详情 Modal + 编辑页订阅按钮与运踪信息 Tab | 完全镜像海运出口运踪实现：独立 `api/yundang/yundang-air-admin.ts` + 空运版 composable/弹窗/面板（nodes/flights/statuses 替代 containers/carriages/oceanNodes） |
