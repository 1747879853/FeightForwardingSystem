## 背景意图

海运出口编辑工作台「应收应付」及「更改单」顶部订单信息摘要中，六段港口字段此前展示 `*Name`（港口名称），与表单录入口径（港口备注 `*Remark`）不一致，业务侧需要在费用场景看到与提单/表单一致的港口备注文本。

## 核心技术决策/逻辑变更

1. `orderFee/index.vue` 与 `changeOrder/index.vue` 的 `displayList` 取值由 `receivePortName` 等改为对应 `receivePortRemark`、`polRemark`、`poT1Remark`、`poT2Remark`、`podRemark`、`deliverPortRemark`。
2. 显示字段配置的 `key` 仍保留 `*Name` 后缀，与 localStorage `order_fee_display_config` 兼容，仅变更展示数据源。

## 避坑指南（Gotchas & Constraints）

- 备注为空时展示 `--`，不回退到 `*Name`；与表单「备注优先」口径一致。
- 费用页与更改单共用 `order_fee_display_config`，两处同步修改。
- 列表页 `data.ts` 列仍使用 `*Name`，本次不改列表列展示。
