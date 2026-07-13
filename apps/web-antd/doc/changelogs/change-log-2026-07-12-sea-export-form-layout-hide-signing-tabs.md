---
title: 海运出口表单布局优化：船名航次比例、条款合并、签单字段与预留 Tab 隐藏
date: 2026-07-12
type: Feature
module: 海运出口
route: /sea-exports/create、/sea-exports/:id/edit
author: auto-doc-sync
---

# 背景意图

基础信息区字段偏挤：船名需要更宽、运输条款与贸易条款宜合并展示；签单地点/签单日期业务侧暂不使用，需从编辑页与费用/更改单左侧信息面板隐藏；工作台顶部「服务详情 / 单证信息 / 问题记录 / 修改历史」尚无独立内容，暂时隐藏减少干扰。

# 核心逻辑变更

涉及文件：

- `adapter/component/vessel-voyage-input.vue`：新增 `mainRatio` / `secondRatio`（默认 1:1）；海出船名/船次传 `3:2`
- `adapter/component/service-trade-terms-input.vue`（新）：合并运输条款 `codeServiceId` + 贸易条款 `tradeTermsType`，内部 1:1
- `adapter/component/index.ts`：注册 `ServiceTradeTermsInput`
- `views/sea-export-admin/data.ts`：`codeServiceId` 改用合并组件；`tradeTermsType` / `signingPortId` / `signingTime` 设 `hidden`
- `views/sea-export-admin/basic-info-form/form.vue`：合并字段列表与编辑回显补丁改为函数式 `componentProps`（避免覆盖贸易条款写回）
- `views/sea-export-admin/orderFee/index.vue`、`changeOrder/index.vue`：左侧信息面板移除 `signingTime`
- `views/sea-export-admin/editor.vue`：注释隐藏四个预留 Tab

行为要点：

1. 船名/船次视觉比例 3:2；字段仍为 `vessel` + `innerVoyno`
2. 运输条款/贸易条款视觉合并为一个表单项；提交仍带两个独立字段
3. 签单地点/日期表单隐藏但仍在模型中，保存不受影响
4. 隐藏的四个 Tab 仅为顶部导航；基础信息页内船期/港口区块仍保留可编辑

# 避坑指南

- `codeServiceId` 的 `updateSchema` 必须保留函数式 `componentProps`（与 `FrtPrepareInput`/`VesselVoyageInput` 同理），否则贸易条款回显与写回会丢
- `VesselVoyageInput` 默认比例仍为 1:1，勿全局写死 3:2，以免影响海运进口等复用方
- 恢复预留 Tab 时取消 `editor.vue` 注释即可；「服务详情/单证信息」仍是滚动定位到基础信息内区块，并非独立页面
