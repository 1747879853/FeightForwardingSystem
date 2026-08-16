---
title: 运踪信息新增轨迹节点时间轴（海运整票合并 / 空运五类事件合并）
module: 共享能力 / 运踪、海运进口、海运出口、空运出口
author: 系统
last_updated: 2026-08-16
---

# 1. 背景意图 (Background)

新服务商运踪此前只展示「摘要 + 箱清单 + 预警」，没有像现有运踪那样的轨迹时间轴，用户看不到这票一路经过了哪些节点。节点数据其实接口早已下发，只是前端没渲染：

- **海运**：运踪快照 `data.result.containers[].status[]` 就是箱物流节点，之前只取了每个箱的「当前状态」渲染成表格一行，节点数组被丢掉；
- **空运**：摘要只有一个「当前节点」，完整事件在详情的 `feituoTrackingDetail` 里，前端把它当 `Record<string, unknown>` 未使用。

本次补齐时间轴，视觉与现有运踪的横向时间轴保持一致。

# 2. 核心逻辑变更 (Changes)

## 2.1 新增共享时间轴

| 文件 | 职责 |
| :-- | :-- |
| `components/tracking/timeline-nodes.ts` | 归一化节点类型 `TrackingTimelineNode` + 两个构建函数 |
| `components/tracking/tracking-timeline.vue` | 横向时间轴展示组件（圆点 + 节点卡片，超出横向滚动） |

节点状态三态：实际节点 `completed`（绿色对勾）、预计节点 `estimated`（橙色时钟）、时间最新的实际节点 `current`（蓝色高亮），与摘要「当前节点」口径一致。

## 2.2 海运：整票合并一条时间轴

`buildContainerTimelineNodes(result)` 把各箱的 `status[]` 合并：

- **去重键**：`eventCode + eventTime + eventPlace + 描述`。同一节点（如「船舶离港」）会在每个箱上各出现一次，不去重会重复 N 遍；
- **排序**：事件时间字符串归一化（`/` 换 `-`）后按字符串升序，无时间的节点排末尾；
- 节点副信息展示发生地（回退码头名）与船名/航次。

## 2.3 空运：五类事件合并一条时间轴

`buildAirTimelineNodes(detail)` 合并 `shipmentEvents`（单证）、`transportEvents`（运输）、`equipmentEvents`（货物动态）以及 `shipmentTransports[].loadTransportCall.events` / `dischargeTransportCall.events`（装/卸货地）五处，去重键为 `eventTime + description + 航班号`，`eventClassifier=EST` 判定为预计节点。

同时把 `AirExportDto.feituoTrackingDetail` 从 `Record<string, unknown>` 换成新增的强类型 `FeituoTrackingAdminApi.AirDataDto`（事件、运输路径、地点、货物、航司）。

## 2.4 三处入口接入

| 入口 | 数据来源 |
| :-- | :-- |
| 海运运踪面板（海出/海进列表弹窗 + 编辑页运踪 Tab） | 面板已请求的运踪快照，无新增请求 |
| 空运出口编辑页运踪 Tab | 详情接口已下发的 `feituoTrackingDetail`，无新增请求 |
| 空运出口列表运踪弹窗 | **新增**一次业务单详情请求（列表不下发轨迹），失败只是没有时间轴，不影响摘要 |

# 3. 避坑指南 (Pitfalls)

> [!IMPORTANT] **1. 时间一律按字符串排序，不要 `new Date()`。** 服务商返回定长字符串（海运 `2025/09/01 00:00:00`、空运 `2025-09-01 00:00:00`），统一分隔符后字符串排序等价于时间排序；解析成 Date 反而会因个别脏数据把节点排错，还会引入时区偏移。展示同样直接用原样字符串。

> [!IMPORTANT] **2. 海运节点必须按整票去重。** 节点挂在每个箱下面，多箱票不去重会看到同一节点重复出现。当前按「代码+时间+地点+描述」去重，若后续要做按箱排查单箱异常，应另开按箱分组视图，不要改这里的合并口径。

> [!NOTE] **3. 海运节点会比现有运踪稀疏。** 目前只订阅船公司数据，港区与海关节点服务商单独计费、默认不返回，因此不会有进场、放行这类细节点。业务若觉得节点少，属于订阅范围问题而非前端漏渲染。

> [!NOTE] **4. 空运列表弹窗的时间轴多一次详情请求。** 列表返回的 `feituoTrackingDetail` 恒为 null，只能进详情取。这次请求失败被静默吞掉（仅无时间轴），避免因为轨迹取不到就把整个弹窗报错。

> [!NOTE] **5. 「当前」节点是前端按时间推的。** 取时间最新的实际节点；一条实际节点都没有时（全是预计）不会出现蓝色当前点，符合「已订阅但还没实际动态」的语义。

# 4. 影响面自检

- 触及文件 `vue-tsc` 无新增报错（仓库存量报错与本次无关）；
- `sjtd` 品牌海运出口仍走现有运踪，未受影响；
- 空运列表弹窗新增详情请求，仅在「已订阅」时触发。
