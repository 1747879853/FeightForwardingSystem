# 业务联系单基础信息字段顺序对齐业务稿

## 背景意图

业务联系单主表原先首行末项是订舱代理、次行从付费方式开始，和业务稿不一致。按稿面把已有字段重排；稿里没有的字段不新增，已有但稿中没有的订舱代理挪到末行。

## 核心逻辑变更

- `form-data.ts` 可见顺序改为：
  1. 委托单位、主提单号、货好时间、开船日期、船公司、付款方式
  2. 起运地、目的地、贸易条款/运输条款（`ServiceTradeTermsInput` 占一列）、备注（占剩余三列）
  3. 订舱代理
- 表单标签：`codeFrtId` 展示为「付款方式」，`polId`/`podId` 展示为「起运地」「目的地」；列表筛选仍用起运港/目的港。
- `tradeTermsType` 改为隐藏载体，与海出一样由合并控件写回。
- 详情 / AI 识别回显 `codeServiceId` 时，必须用 `buildPreOrderServiceTradeTermsProps` 整段替换函数，不能只传 `selectedItems`。

## 避坑指南

- `ServiceTradeTermsInput` 的 `componentProps` 是函数（带 `formContext`、`secondFieldValue`）。`updateSchema` 若改成静态对象，贸易条款下拉会丢、也无法写回 `tradeTermsType`。
- CSS `order` 与 `pre-order-basic-field--N` 必须同步；条款只占一列、备注 `col-span-3` 吃掉次行剩余格，否则订舱代理会挤进次行末格。
