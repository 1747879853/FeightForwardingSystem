---
title: 海运出口运踪「起运预计离开 / 目的预计到达」字段来源
module: 海运出口
author: auto-doc-sync
last_updated: 2026-09-01
---

# 解析目标

编辑页 `/sea-exports/:id/edit` 运踪 Tab 上「起运预计离开」「目的预计到达」两个文案，对照前端展示与 Freight 后端落库/摘要映射，确认取自哪个接口字段。

# 核心逻辑梳理

这两个文案只出现在非 sjtd 品牌的飞驼运踪面板（`container-tracking-panel.vue`，i18n `tracking.detail.polEtd` / `podEta`）。sjtd 走云当面板，对应格子标的是 `ETD` / `ETA`，取 `pushInfo.shipment.etd` / `eta`。

非 sjtd 编辑页 Tab 以 `load-detail` 调 `SeaExportAdmin` 详情，摘要取 `feituoTracking`（`FeituoTrackingSimpleDto`）：

| 界面文案 | 前端取值 | 接口 JSON | 摘要 DTO | 库表列 | 飞驼原始 |
| :-- | :-- | :-- | :-- | :-- | :-- |
| 起运预计离开 | `summary.polEtd` | `feituoTracking.polEtd` | `PolEtd` | `ReceiptEtd` | `result.receipt.etd` |
| 目的预计到达 | `summary.podEta \|\| summary.podSta` | `feituoTracking.podEta`，空则 `podSta` | `PodEta` / `PodSta` | `DeliveryEta` / `DeliverySta` | `result.delivery.eta` / `sta` |

映射在 `FeituoTrackingQueryManager`：`dto.PolEtd = tracking.ReceiptEtd`，`dto.PodEta = tracking.DeliveryEta`。落库在 `FeituoContainerTrackingManager.FillResult`：接货地 `receipt.etd` → `ReceiptEtd`，交货地 `delivery.eta` / `sta` → `DeliveryEta` / `DeliverySta`。

# 文档偏差 / 架构洞察

- 不是业务单 `transportOrder.etd` / `eta`。基础信息船期与运踪摘要是两套时间。
- DTO 字段名叫 pol/pod，实际语义是飞驼的接货地 `receipt` / 交货地 `delivery`，文档写作「起运(接货地)」「目的(交货地)」。
- 「目的预计到达」前端会在 `podEta` 为空时用首次预计 `podSta` 兜底。
- 权威接口文档：`D:\code\Freight\aspnet-core\文档\外部Api对接\飞驼\飞驼对接-集装箱跟踪-前端对接.md` 第 6.2 节。
