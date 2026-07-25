---
title: 业务联系单费用切换结算对象类别联动清空与回填
module: 业务联系单
author: auto-doc-sync
last_updated: 2026-07-25
---

# 背景意图

费用行切换「结算对象类别」时，旧结算对象可能残留，且 `ClientSelect` 的 `industryCategory` 过滤参数未及时切到新字母码；本单已录入的委托单位/发货人/收货人/通知人应直接带出，并用 `selectedItems` 回显名称，避免再打客户详情。

# 核心逻辑变更

1. `handleIndustryCategoryChange`：先清空 `settlementId/settlement`，再刷新往来单位快照，按新字母码 `applySettlementByLetter`，递增 `settlementUiKey` 强制重挂载。
2. `ClientSelect` 的 `:industry-category` 仍由 `industryKeyToLetter(industryCategory)` 驱动，类别变更后过滤参数同步变化。
3. 本单映射：`p`→委托单位、`b`→发货人、`e`→收货人、`h`→通知人；未录入则保持清空。
4. 名称缓存：编辑页 `partyNameCache` + 费用表 `clientNameCache`；带出时优先写 `selectedItems`，缓存未命中才兜底 `getClientDetail`。

# 避坑指南

- 非 `p/b/e/h` 的类别（如船公司 `a`）不会从本单往来单位带出，切换后应保持结算对象为空。
- 无名称时不要把 uuid 写进 `selectedItems` 的 label，否则 Select 会长期显示成 id。
