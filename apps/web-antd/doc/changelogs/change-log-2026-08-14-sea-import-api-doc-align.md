---
title: 海运进口前端对齐最新接口文档
module: 海运进口
author: auto-doc-sync
last_updated: 2026-08-14
---

# 1. 背景意图 (Background)

海运进口接口文档相对前端已发生多处破坏性变更（码头对象化、规格/型号改 id、新增联运单号/分单号/贸易方式）。前端仍按旧协议读写，保存会丢字段或被后端拦下。

# 2. 核心逻辑变更 (Core Logic)

1. `SeaImportAdmin` DTO：码头改为 `terminalId` + `terminal` 对象；集装箱规格/型号改为 `codeGoodsSpecId` / `codeGoodsModelId` 及对应对象；补 `throughBillNum` / `hblNum` / `tradeMode`、联系人、飞驼运踪占位字段；列表筛选改为 `TerminalId` / `TerminalIdEmpty`。
2. 品名详情类型补 `codeGoodsSpecs` / `codeGoodsModels`（按 `sortId` 升序），集装箱表切品名后清空规格/型号再拉候选项。
3. 编辑提交：人员带行 `id`；商品多选复用详情行 `id`，避免子表全量删建。
4. 列表/表单：码头走往来单位下拉（行业类别 `c`）；补联运单号、分单号、贸易方式；业务来源/运输条款/包装列平铺名与对象名双读。
5. 飞驼集装箱跟踪仅补 DTO 占位，页面暂不展示（仓库内尚无第 6 节字段明细文档）。

# 3. 避坑指南 (Pitfalls)

- 不要再提交字符串 `terminal`、`model`、`specification`，后端会忽略或报规格校验错。
- 切换箱内品名必须清空该行 `codeGoodsSpecId` / `codeGoodsModelId`。
- 贸易方式枚举由前端维护，后端不校验数字取值。
- 委托单位联系人暂无独立控件，编辑时从详情原样回传，避免被清空。
