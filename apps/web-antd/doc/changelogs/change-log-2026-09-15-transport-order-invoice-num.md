---
title: 报关发票号抽到业务主表
date: 2026-09-15
module: sea-exports
---

# 背景意图

TAPD [#1000975](https://www.tapd.cn/61580498/bugtrace/bugs/view/1161580498001000975)：海运出口、空运要加「报关发票号」（合同号后、格式同合同号）。海运进口原先已有「发票号」，是同一项（报关用的商业发票号，不是税务开票号），后端已迁到业务主表 `transportOrder.invoiceNum`。

# 核心逻辑变更

1. **统一路径：** 读写一律 `transportOrder.invoiceNum`，最长 64，可空，一票一号，复制清空。
2. **海运进口搬家：** 提交/回显不再走票根；列表列 `field` 改为 `transportOrder.invoiceNum`；独立筛选仍是顶层 `InvoiceNum`。
3. **海运出口 / 空运出口补齐：** 表单排在合同号后；列表列、`InvoiceNum` 筛选、关键字占位同步；海出默认列与合同号一样隐藏。
4. **文案：** 三个模块中文统一「报关发票号」，英文 `Customs Invoice No.`。

# 避坑指南

- 字段 key 仍是 `invoiceNum`，不要按界面文案去后端找「报关发票号」。
- 列设置以当前 `useColumns` 为全集：改 `field` 后旧 key 进页即当脏数据清掉，新列按代码默认显隐，不用手动关旧列。
- 这不是诺诺/进项发票号；空运进口当前无业务模块，本轮未做。
