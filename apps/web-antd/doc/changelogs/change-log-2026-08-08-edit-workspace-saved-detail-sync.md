---
title: 编辑工作台基础信息保存后联动刷新费用/更改单
module: 海运出口 / 海运进口 / 空运出口
author: auto-doc-sync
last_updated: 2026-08-08
---

# 1. 背景意图 (Background)

编辑工作台使用 `KeepAlive` 缓存费用、更改单等子 Tab。基础信息保存成功后，若用户切回费用/更改单，子页仍可能展示保存前的订单摘要，或（海出费用联动）继续使用模块级永不过期的订单详情缓存。需要在保存成功后把最新详情 DTO 下发给子 Tab，并清掉相关缓存。

# 2. 核心逻辑变更 (Core Logic)

## 2.1 统一链路（海出 / 海进 / 空出）

1. `loadEditData` 成功后返回最新详情 DTO（不再只 `void`）。
2. 提交 hook（`use-*-submit`）在编辑保存成功并 `loadEditData` 后调用可选 `onSaved(detail)`。
3. 基础信息 `form.vue` 通过 `emit('saved', detail)` 上抛。
4. `editor.vue` 用 `shallowRef` 持有 `savedDetail`，经 `:latest-detail` 下发给费用 / 更改单（空出仅费用）。
5. 子 Tab `watch(latestDetail)`：用最新详情整体替换本地订单/费用展示数据。

## 2.2 海运出口额外处理

- `useOrderFeeLinkage` 将订单详情缓存提升到模块级，并导出 `clearOrderDetailCache`。
- 编辑工作台 `onFormSaved` 时按当前委托 ID（字符串/数字键均清）清除缓存，避免结算对象、箱型、数量等联动继续读旧详情。

## 2.3 空运出口额外处理

- 保存成功后用最新详情的 `transportOrder.orderFees` 刷新只读费用列表，并同步更新 Tab「收 - 付」徽标，避免再拉一次详情接口。

# 3. 避坑指南 (Pitfalls)

- `KeepAlive` 下仅依赖 `onMounted` 拉数不够；必须通过 props/`watch` 接收保存后的详情。
- 海出费用联动缓存键可能是路由字符串 id 或费用行上的数字 `transportOrderId`，清理时两种都要删。
- `onSaved` 仅在「编辑保存」路径触发；新建保存走跳转编辑页，不依赖本联动。
- 费用 Tab 徽标（海出仍可能走分页接口计数）与空出「直接用详情 orderFees 计数」口径不同，勿混用。
