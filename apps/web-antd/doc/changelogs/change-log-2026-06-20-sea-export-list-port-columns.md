## 背景意图

海运出口列表页港口列与新建/编辑表单不一致：仅展示起运港、目的港、交货地三列，且列名使用 `polName`/`podName`（装货港/卸货港），与表单港口链路（收货地 → 起运港 → 中转港1/2 → 目的港 → 交货地）及字段标签（起运港/目的港）不符。

## 核心技术决策/逻辑变更

1. 列表列配置按 `usePortFormSchema` 货物流转顺序补齐六段港口列：`receivePortName`、`polName`、`poT1Name`、`poT2Name`、`podName`、`deliverPortName`。
2. 列标题统一复用表单同款 i18n key：`receivePortId`、`polId`、`poT1Id`、`poT2Id`、`podId`、`deliverPortId`，避免 `polName`/`podName` 与表单语义漂移。

## 避坑指南（Gotchas & Constraints）

- 港口名称字段均在 `SeaExportDto` 根级，不在 `transportOrder` 嵌套层。
- 中转港列可能为空，属正常业务场景；列配置保留 `showOverflow` 即可。
- 费用侧边栏、更改单等模块若仍用 `polName`/`podName` 作 label key，与列表列标题口径可能不一致，需按需单独对齐。
