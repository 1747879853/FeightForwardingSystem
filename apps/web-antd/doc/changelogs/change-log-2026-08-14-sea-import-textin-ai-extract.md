---
title: 海运进口 TextIn AI 识别对接
module: 海运进口
author: auto-doc-sync
last_updated: 2026-08-14
---

# 背景意图

后端新增 `TextInAdmin/ExtractSeaImportToAddDtoAsync`，上传提单/到货通知等单证后返回可直接填入「新建海运进口」的 `SeaImportExtractAddDto`。需在海运进口新建/编辑基础信息页对接，交互对齐海运出口 AI 识别。

# 核心逻辑变更

- `text-in-admin.ts` 增加 `extractSeaImportToAddDto`（超时 120s）与 `SeaImportExtractAddDto` 类型。
- 新增 `ai-extract-utils.ts` / `ai-extract-upload-modal.vue` / `use-sea-import-ai-recognize.ts`：上传 → TextIn → 规范化 → 回填多子表单与 `seaImport.orderCtns`。
- `form.vue` 顶栏增加「AI识别」按钮；识别成功后按到港日期重算转站/箱使。
- 箱型 `ctnCodeId=0` 清空 id 但保留 `ctnCodeName`，表格 Select 用识别原文作 placeholder 提示补选；净重缺失时按毛重−皮重补算。

# 避坑指南

- **箱子只读 `seaImport.orderCtns`**，不要读 `transportOrder.orderCtns`。
- **到港日期**落在 `transportOrder.etd`（界面文案是到港，不是出口的开船日期）。
- 空值、`0`、空 Guid 不回填标量字段；未匹配箱型行仍保留，需用户补选。
- 同文件二次上传可能 `isFromCache=true`；接口耗时长，勿设短超时。
- 兼容 JSON 键 `pOLId`/`pKGS`/`eTD` 与常见 `polId`/`pkgs`/`etd`。
