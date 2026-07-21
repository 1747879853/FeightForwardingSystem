---
title: 更改单业务逻辑解析
date: 2026-07-21
type: parsing
---

# 解析目标

梳理海运出口/进口编辑工作台「更改单」Tab 的端到端业务逻辑：实体边界、CRUD、费用归属、锁费、打印，以及与主单费用的差异。

# 核心逻辑梳理 / 发现的文档偏差

1. **定位：** 更改单挂在 `transportOrderId` 下，是主单费用锁定后的变更容器；自身也可独立费用锁定。
2. **保存路径：** 更改单模式下费用表隐藏「保存」，必须经 `ChangeOrderAdmin/EditAsync` 整包提交 `orderFees`。
3. **取数：** 列表 `GetPagedListAsync` 无费用；选中后 `DetailAsync` 带费用，再按 `paySide` 拆表。
4. **锁费：** 财务锁费页树形展示主单+更改单；更改单锁费不受 `isUnfinished` 限制。
5. **文档偏差 / 前端缺口：**
   - `changeOrder/table.vue` 拉列表未传 `TransportOrderId`（API 已支持），存在跨票风险。
   - 收付互生依赖 `parentChangeOrderId`，更改单页未传入。
   - 批量引入 UI 暂不支持目标更改单（后端已支持）。
6. **打印：** 2026-07-20 起更改单支持打印，走 `isChangeOrderPrint` + `detailInput`。

# 架构洞察

- 海出/海进更改单页面结构同构，共用同一套 `ChangeOrderAdmin` 契约。
- 费用交互大量复用 `order-fee-table`，用 `mode='changeOrder'` 做行为分叉，是典型的「同一组件双域」模式，改主单行为时需同步回归更改单。
- 活文档落点：`modules/sea-exports/change-order.md`（更改单专题）；工作台总览仍在 `id-edit.md`。
