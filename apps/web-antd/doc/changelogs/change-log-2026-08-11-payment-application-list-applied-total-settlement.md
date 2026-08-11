# 付款申请列表去掉币别/应付应收，申请合计按原币与固定币别分口径

## 背景意图

列表「币别」「应付总额」「应收总额」与编辑页结算币别卡片的展示口径不一致：卡片按「按票原币 / 固定币别」汇总申请金额，列表却另挂币别与应付/应收列。业务要求列表以「申请合计」动态列承接该汇总，后端已算好金额，前端只做付 − 收。

## 核心逻辑变更

- 列表静态列删除 `currency.code`、`totalPayPrice`、`totalReceivePrice`；筛选「币别」保留。
- 「申请合计」组默认插入位置由「应收总额」后改为「开票日期」后。
- `calcRowAppliedTotal`：
  - **原币**（`currencyId` 空/`0`）：各 `currencyGroup` 用 `payAmount − receiveAmount`。
  - **固定币别**：仅本单 `currencyId` 对应列填 `totalPayPrice − totalReceivePrice`；其它币别列留空；两侧总额都空也留空。
- `isOriginalCurrencyApplication` 将 `currencyId === 0` 也视为原币，与列表筛选/展示约定一致。

## 避坑指南

- 勿在列表前端用明细 `appliedAmount × rate` 重算；列表无明细行，直接用后端字段。
- 固定币别行不要把整单折币净额填进无关原币列。
- 列配置持久化里可能残留已删字段，重建列时以 `buildStaticColumns` 为准即可。
