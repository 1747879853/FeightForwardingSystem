# 付费申请付款金额按「付 − 收」汇总

## 背景意图

结算币别卡片的「付款金额」、费用明细「{币别}申请合计」以及列表申请合计，原先对明细 `appliedAmount`（或列表 `payAmount`/`receiveAmount`）做同向累加。明细中同时存在收、付费用时，金额会被错误加总，业务口径应为 **付 − 收**。

## 核心逻辑变更

- `form-data.ts` 新增 `signedAppliedAmount`：`paySide === 0`（收）取负，付取正。
- `summarizeByCurrency` / `summarizeByCurrencyWithConversion` / `calcAppliedAmountByCurrency` / `groupFeesByOrder` 币别汇总统一走净额。
- 列表 `data.ts` 的 `calcRowAppliedTotal` 由 `payAmount + receiveAmount` 改为 `payAmount - receiveAmount`。
- 付费审批详情复用同一套 `form-data` 汇总，口径一并纠正。
- 单条明细仍提交绝对值 `appliedAmount`，符号仅用于前端展示汇总。

## 避坑指南

- 明细行 `paySide` 必须正确回填；缺省按「非收即付」处理（仅 `0` 为负）。
- 提交接口仍传正数 `appliedAmount`，不要把净额符号写回明细 DTO。
- 指定币别模式下「付款金额 / 实付金额」均为净额后再乘汇率。
