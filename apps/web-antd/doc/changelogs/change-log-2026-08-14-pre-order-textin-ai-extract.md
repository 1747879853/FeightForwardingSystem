---
title: 业务联系单对接 TextIn 智能抽取
module: 业务联系单
author: auto-doc-sync
last_updated: 2026-08-14
---

# 背景意图

后端新增 `TextInAdmin/ExtractPreOrderToAddDtoAsync`，上传提单/订舱单/委托书等单证后返回可直接填入「新建业务联系单」的 `PreOrderExtractAddDto`。需在业务联系单新建/编辑页对接，交互对齐海运出口/进口 AI 识别。

# 核心逻辑变更

- `text-in-admin.ts` 增加 `extractPreOrderToAddDto(file, bizType?)`（超时 120s，`bizType` 放 FormData）与 `PreOrderExtractAddDto` / `PreOrderCtnExtractAddDto` 类型。
- 新增 `pre-order/ai-extract-utils.ts`、`ai-extract-upload-modal.vue`、`use-pre-order-ai-recognize.ts`：上传 → TextIn → 规范化（空值/`0`/空 Guid 不覆盖）→ 回填主表/收发通/港口/货物/箱表。
- `editor.vue` 可保存态顶栏增加「AI识别」；回填后注入 `selectedItems`（保留港口/委托单位 onChange）、同步干系人默认与费用计量；有收发通文本时自动展开折叠区。
- 箱型 `ctnCodeId=0` 清空 id 但保留 `ctnCodeName`，提示用户按识别原文补选；`tradeTermsType=0`（CIF）按有效值回填。

# 避坑指南

- **读 `result.preOrder` / `result.extract`**，不要套用海出的 `seaExport.transportOrder` 结构。
- **`bizType` 只能放 form 字段或 query**，放 JSON body 会绑不到，静默按海运出口 `0`。
- 前端须传当前标题栏业务类型；空运时后端港口走 `AirPort`，下拉也要按 `bizType` 切机场源（本期 UI 仅开放海运出口）。
- 空值不覆盖用户已填内容；`clientId` 空 Guid、`ctnCodeId=0` 不报错，需表单侧提示补录。
- 同文件二次上传可能 `isFromCache=true`；接口耗时 10~60s，勿设短超时。
