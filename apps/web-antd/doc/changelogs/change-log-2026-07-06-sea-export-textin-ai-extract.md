---
title: 海运出口 TextIn AI 识别对接
module: 海运出口
author: auto-doc-sync
last_updated: 2026-07-06
---

# 背景意图

海运出口新建/编辑页原 AI 识别走测试接口 `RunVisionOcrPdf`，仅支持 PDF，且需前端自行映射字段。现对接后端 TextIn `ExtractSeaExportToAddDtoAsync`，由服务端完成 v3 抽取、名称→id 匹配与 MD5 缓存，前端负责回填表单并提供 citations 定位预览。

# 核心逻辑变更

- 新增 `src/api/common/text-in-admin.ts` 封装 `extractSeaExportToAddDto`，超时 120s。
- `form.vue` AI 识别流程改为：上传图片/PDF → 调用 TextIn → 过滤空值/0/空 Guid → 覆盖回填表单（含箱型箱量、品名）→ 更新 Select `selectedItems` → 打开右侧 Drawer 预览。
- 新增 `modules/ai-extract-preview-drawer.vue`：图片渲染 + citations 坐标高亮；PDF 使用 iframe 预览并提示页码（无需额外依赖）。
- 新增 `modules/ai-extract-utils.ts`：空值过滤、字段↔citation 映射、Dto 转表单 payload。

# 避坑指南

- 空值、`0`、`00000000-0000-0000-0000-000000000000` 不回填，保留表单原值。
- 空数组的 `orderCtns`/`orderCodeGoodss` 不覆盖现有表格/多选。
- 需在本机确保后端 TextIn 鉴权已配置；PDF 预览为 iframe + 页码提示，图片支持坐标高亮。
- 新建页与编辑页共用 `form.vue`，行为一致；海运进口仍保留旧 OCR 测试接口。
