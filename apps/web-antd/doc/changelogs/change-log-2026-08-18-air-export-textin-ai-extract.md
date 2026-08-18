---
title: 空运出口 TextIn AI 识别对接
module: 空运出口
author: auto-doc-sync
last_updated: 2026-08-18
---

# 背景意图

后端新增 `TextInAdmin/ExtractAirExportToAddDtoAsync`，上传空运提单/订舱单/托书后返回可直接填入「新建空运出口」的 `AirExportExtractAddDto`。需在空运出口新建/编辑基础信息页对接，交互对齐海运出口 AI 识别。

# 核心逻辑变更

- `text-in-admin.ts` 增加 `extractAirExportToAddDto`（超时 120s）与 `AirExportExtractAddDto` 类型。
- 新增 `ai-extract-utils.ts` / `ai-extract-upload-modal.vue` / `use-air-export-ai-recognize.ts`：上传 → TextIn → 规范化 → 回填多子表单与 `airExport.airExportOrderCtns`。
- `form.vue` 顶栏增加「AI识别」按钮；空港下拉用 `AirPortSelect` 回显 `polId` / `potId` / `podId`；识别后的泡比以后端值为准再写回一次，避免件重尺联动立刻覆盖。
- 航司只出现在 `extract.extractedSchema["航空公司"]`，成功提示里带原文；匹配不到的委托单位/空港/包装/运输条款 toast 提示手动补录，不报错。

# 避坑指南

- **货物明细只读 `airExport.airExportOrderCtns`**，不要写进 `transportOrder.orderCtns`。
- **空港必须走 `AirPort`**，禁止用海运港口 `PortCode` 回显；两张表 id 各自编号。
- 明细行 `pkgs` / `kgs` / `cbm` 是单件口径，主表同名字段是整票申报，互不覆盖。
- 空值、`0`、空 Guid 不回填标量字段；`orgId` 与销售不由识别填写，沿用表单默认。
- 体积重 / 计费重以后端已算值为准，整表赋值时不要再跑前端派生公式。
- 同文件二次上传可能 `isFromCache=true`；接口耗时长，勿设短超时。
