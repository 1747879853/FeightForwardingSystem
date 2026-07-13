---
title: 云当运踪推送信息全字段对接（类型补全 + 面板展示航段/AIS/免箱期/件数重量/甩柜）
date: 2026-07-13
type: Feature
scope: apps/web-antd
module: 海运出口 / 运踪
---

# 背景意图

后端 `GetOceanPushInfoAsync`（`YundangOceanPushInfoDto`）返回的运单动态实际包含大量云当上游字段，而前端 `yundang-admin.ts` 的 DTO 与运踪面板此前只对接了其中一个子集（单证/船东/港口/ETD·ETA/里程碑/箱轨迹）。本次按《云当 GetOceanPushInfoAsync 前端对接》权威文档 §5–10，把类型补全到后端契约全集，并在运踪面板补充展示更有业务价值的字段。

# 核心逻辑变更

1. **类型补全（`api/yundang/yundang-admin.ts`）**，与后端契约一一对齐：
   - `YundangShipmentInfoDto`：新增 `batchId`、`referenceCtnrNo`、`deliveryNo`、`orderNo`、`oldVesselName/oldVoyage`（换船）、装货地 `plrCd/plr`、交货地 `pldCd/pld`、`cyOpenTime/cyCutOffTime`、`dschTime`、`firstEta`、`etaPld/ataPld`、AIS `aisAtd/aisAta/aisEta`、`endTrackTime/firstUpdateTime`、状态类 `endStatus/errorStatus/errorMessage/errorDes/dataStatus/status`、`customer`、`deliveryAddress`、`estDelTime/actDelTime`、`custReqDate`、`pickupReference`、`railCode`、`terminalPld/terminalDtp`、`remark`、`customerUploadedData`。
   - `YundangShipmentContainerInfoDto`：新增 `pkgs`、`gwgt`、`vgm`、`isRolled`（甩柜/异常），以及 `charges`（新类型 `YundangShipmentContainerChargeInfoDto`：`chargeType/lfd/freeDayDesc` 免箱期）。
   - `YundangShipmentContainerStatusInfoDto`：新增 `sourceCd`（数据来源）、`dataState`。
   - `YundangShipmentCarriageInfoDto`：新增 `yundangCarriageId`、港口中英文名 `polNameEn/polNameCn/podNameEn/podNameCn`、`type`（大船/驳船/陆运）、AIS `aisAtd/aisAta/aisEta`。
   - `YundangShipmentOceanNodeInfoDto`：新增 `placeCd`、`vesselName/voy`、`count/total`（进度）、`aisEstimateTime/aisActualityTime`、`number`（排序序号）。

2. **面板展示增强（`views/sea-export-admin/modules/yundang-tracking-panel.vue`）**：
   - 运单概要按需补充：AIS 预计到港、首次预计到港、交货地及其 ETA/ATA、备注（有值才渲染，避免空行）。
   - **新增「航段」Tab**（此前 i18n 已备但面板未渲染）：按 `sno` 升序，表格展示 序号/类型/航线(中文名优先)/船名航次/ETD·ATD·ETA·ATA（ETA/ATA 无值回退 AIS 时间）。
   - **集装箱**：新增件数/毛重/VGM（有值才显示）；甩柜/异常以彩色 Tag 前置提示；新增「费用/免箱期」小表（费用类型 / 最后免费日 LFD / 免费天数）。
   - 箱轨迹按 `eventTime` 升序渲染时间线（后端此子表未排序）。
   - **后续精简**：不展示里程碑「进度 count/total」与箱轨迹「来源」（船东/码头/云当），降低时间轴信息密度。

3. **国际化（`locales/langs/{zh-CN,en-US}/seaExport.json`）**：`seaExport.yundang.tracking` 下补齐 `aisEta/firstEta/etaPld/ataPld/deliveryPlace/remark`、`node.progress/ais`、`carriage.type/etd/atd/eta/ata/vessel/typeMainVessel/typeBarge/typeTruck`、`container.pkgs/gwgt/vgm/rolled/abnormal/chargeTitle/chargeType/lfd/freeDayDesc/source/sourceCarrier/sourceTerminal/sourceYundang`。

# 避坑指南

- 前端展示以**后端返回为准**：新增类型字段全部可空，模板一律用 `v-if` 判空，未返回时不渲染，勿假设一定有值。
- 云当时间多为**原始字符串**、格式不统一，直接展示或按需 `formatMaybeDateTime` 容错，不要假定 ISO。
- 子表 `containers/carriages/oceanNodes` 默认 `[]`，勿当 `null` 处理；`oceanNodes` 后端已按 `number` 升序，`statuses` 未排序需前端按 `eventTime` 处理。
- 上游原始结构里箱费用数组叫 `chargeDatas`，但**后端 DTO 字段名为 `charges`**（`YundangShipmentContainerChargeInfoDto`），以后端为准。
- Vue 模板表达式禁止 TS 非空断言 `!`，`resolveRolledTag` 返回带 `show` 标志的对象而非 `null`，规避 `vue/no-parsing-error`。
