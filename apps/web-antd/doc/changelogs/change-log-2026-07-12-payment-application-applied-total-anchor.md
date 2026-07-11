# 付费申请列表申请合计改为锚点代理列

## 背景意图

列表「申请合计」各币别列原先通过列配置面板顶部 Checkbox 总开关控制显隐，与 Vxe 列配置持久化体验不一致。改为锚点代理列后，用户可在列配置面板中像普通列一样拖动、显隐「申请合计」，各币别子列自动跟随。

## 核心逻辑变更

1. 新增 `APPLIED_TOTAL_ANCHOR_FIELD` 锚点列（表格中 0 宽隐藏，面板中可见）。
2. 各币别 `appliedTotal_{currencyId}` 列在面板隐藏，由 `syncAppliedTotalColumns` 同步锚点的显隐与顺序。
3. 翻页重建币别列时通过 `captureAppliedTotalAnchorState` 保留锚点状态。

## 避坑指南

- 币别列不可在面板单独配置，否则会与锚点状态冲突。
- `syncAppliedTotalColumns` 需防重入，避免 `loadColumn` 触发循环。
