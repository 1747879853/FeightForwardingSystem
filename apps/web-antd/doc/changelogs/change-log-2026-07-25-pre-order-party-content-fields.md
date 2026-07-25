# 业务联系单收发通补齐 id + Content 内容维护

## 背景意图

业务联系单收发通接口与海运出口同构：每组往来单位为 `id + Content`，详情再回填 `SimpleDto`。此前 `/pre-order/add` 与编辑页只暴露了 `shipperId` / `consigneeId` / `notifierId` 三个下拉，未提供内容文本维护，也无法正确回显往来单位名称。

## 核心逻辑变更

1. **`usePreOrderPartySchema`**：按海运出口 `party-flow` 补齐三组字段
   - 发货人：`shipperId`（行业类别 `b`）+ `shipperContent`（`EnglishUpperTextarea`，最长 1024）
   - 收货人：`consigneeId`（`e`）+ `consigneeContent`
   - 通知人：`notifierId`（`h`）+ `notifierContent`
   - 备注仍在收发通区，占满第 3 行
2. **布局**：`PartyForm` 由 `grid-cols-3` 改为 `grid-cols-6`，复用海出 `party-flow-pos--*` / `party-flow-content-pos--*` 定位
3. **详情回填**：`fillFromDetail` 写入三组 Content；并通过 `toSelectedItems` + `updateSchema` 注入 `shipper` / `consignee` / `notifier` 名称（`ClientSelect` 无 Detail 接口，编辑回显依赖 `selectedItems`）
4. **提交**：`buildSubmitPayload` 已 `...partyValues` / `...basicValues` 展开，Content 与备注随保存/脏检查自然纳入，无需单独映射
5. **备注位置**：`remark` 从收发通区挪到基础信息「船公司」后（与货好时间、船公司同一行，`col-span-4`）

## 避坑指南

- `ClientSelect` 通用接口无按 id 拉详情能力，编辑态若不传 `selectedItems`，只会显示裸 id。
- Content 使用 `EnglishUpperTextarea`，输入会自动转半角大写；与海出行为一致，勿改回普通 `Textarea` 除非产品明确要求。
- `updateSchema` 只覆盖 `selectedItems` 时依赖表单对 `componentProps` 的合并；勿把 `industryCategory` 冲掉。
- 基础信息为 `grid-cols-6`：货好(1)+船公司(1)+备注(4)=6；改 `remark` 跨列时勿破坏同行合计。
