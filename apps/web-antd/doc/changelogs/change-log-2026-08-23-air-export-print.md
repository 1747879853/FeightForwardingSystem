---
title: 空运出口对接单据打印
module: 空运出口
author: auto-doc-sync
last_updated: 2026-08-23
---

# 背景意图

后端 `PrintFormatAdmin/GetPrintAsync` 已支持 `printJsonType=5000`（空运出口详情），按 id 调 `AirExportAdmin/DetailAsync` 且强制 `IsPrint=true` 后出 PDF/Excel/Word。前端空运出口基础信息页此前没有打印入口。

# 核心逻辑变更

- 空运出口新建/编辑共用的 `basic-info-form/form.vue` 顶栏在「AI识别」后增加「打印」，交互对齐海运出口。
- 未保存票提示「请先保存后再打印」；有未保存修改时二次确认，打印仍按库内已保存数据取数。
- `openPrint` 传 `PrintJsonType.AirExportDetail`、`detailInput={id}`、当票 `orgId`，以及 `bizType=2`（空运出口，列表按「相等或为空」匹配）。
- 打印模板列表查询补传 `BizType`；空运无签单方式/船公司，不传这两项。

# 避坑指南

- **不要前端拼打印 JSON**，取数走 `GetPrintAsync`，后端会自己带 `companyPrintInfo`。
- 模板必须绑 `PrintJsonType=5000`（空运出口详情）。没有可用模板时弹窗会提示「暂无可用打印模板」。
- 空运进口 `6000` 后端仍未接通，不要复用本入口。
- 费用打印本来就能用（应收 `1000` / 应付 `1500`），本次只补单据打印。
