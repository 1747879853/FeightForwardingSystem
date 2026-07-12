# 海运出口编辑页：费用 Tab 计数实时刷新、船公司显示中文简称、详情去重请求

- 日期：2026-07-12
- 影响页面：`/sea-exports/:id/edit`（应收应付 Tab、更改单 Tab）
- 涉及文件：
  - `apps/web-antd/src/views/sea-export-admin/editor.vue`
  - `apps/web-antd/src/views/sea-export-admin/orderFee/index.vue`
  - `apps/web-antd/src/views/sea-export-admin/changeOrder/index.vue`
  - `apps/web-antd/src/views/sea-export-admin/orderFee/modules/order-fee-table.vue`

## 背景意图

1. 应收应付费用新增或删除后，编辑页顶部「应收应付 x - y」Tab 上的数字不会刷新，仍是进入页面时的初始值。
2. 订单信息卡片「船公司」字段展示的是 `carrierName`（全称），业务希望展示 `carrierCnShortName`（中文简称），更改单页面同理。
3. 进入「更改单」或「应收应付」Tab 时，`/api/services/app/SeaExportAdmin/DetailAsync` 会被请求 3 次，存在明显冗余。

## 核心逻辑变更

### 1. 费用 Tab 数字实时刷新

- `order-fee-table.vue` 在 `dataSource` 变化时已通过 `sync-fee` 事件上抛 `{ type, orderFees }`。
- `orderFee/index.vue` 新增 `handleFeeSync`，用 `feeCountMap` 记录应收(0)/应付(1)行数，并通过新增的 `fee-count-change` 事件向上抛出 `{ recCount, payCount }`。
- `editor.vue` 监听 `fee-count-change`，调用抽出的 `setFeeNumber(rec, pay)` 更新 `fee` Tab 标签，实现新增/删除费用后数字实时刷新。

### 2. 船公司显示中文简称

- `orderFee/index.vue` 与 `changeOrder/index.vue` 的 `displayList` 中 `carrierName` 分支改为： `carrierCnShortName || carrierName || '--'`（有简称优先展示简称，兜底全称）。

### 3. 消除 DetailAsync 三次请求

- 原因：进入 Tab 时 `orderFee/index.vue`（或 `changeOrder/index.vue`）自身 `loadSeaExportData` 调 1 次；其内部两个 `order-fee-table`（应收/应付）各自 `onMounted -> loadOrderCtnList` 再各调 1 次，合计 3 次。
- 方案：`order-fee-table.vue` 新增 `orderDetail` prop，由父组件把已加载的详情传入；组件内 `watch(props.orderDetail, applyOrderDetail, { immediate: true })` 应用箱型列表与订单基础数据，`onMounted` 不再自行请求详情。
- 父组件 `orderFee/index.vue`、`changeOrder/index.vue` 均通过 `:order-detail="formValues"` 传入。
- 切换单据（`editId` 变化）时，考虑到父级 `KeepAlive` 的 prop 可能仍是旧值，`order-fee-table.vue` 的 `editId` watcher 仍会强制按新 id 拉取一次最新详情。
- `openBatchImportModal` 改为优先复用已加载的 `orderBaseData.value`，避免再次请求。

## 避坑指南

- `order-fee-table.vue` 已移除 `onMounted` 内的详情请求，完全依赖父组件传入的 `orderDetail`。该文件当前仅被海运出口 `orderFee/index.vue` 与 `changeOrder/index.vue` 使用，二者都已传入；若未来有新使用方，务必同样传入 `:order-detail`，否则箱型列表与订单基础数据不会加载。
- 费用 Tab 数字统计的是当前表格 `dataSource` 行数（含未保存的新建空行），因此点击「新建」即会 +1，属预期的即时反馈。
- `sea-import-admin` 及审核相关的 `all-order-fee-table.vue`/`submission-order-fee-table.vue` 是独立文件，本次未改动。
