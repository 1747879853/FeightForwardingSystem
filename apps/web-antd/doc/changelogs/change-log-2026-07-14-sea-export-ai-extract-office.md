---
title: 海运出口 AI 识别放开 Word/Excel/RTF
module: 海运出口
author: auto-doc-sync
last_updated: 2026-07-14
---

# 背景意图

海运出口新建/编辑页「AI识别」此前前端白名单仅允许 PDF 与图片。业务侧常有 Word/Excel/RTF 托书，需与 PDF/图片一样可选并送入 TextIn 抽取。

# 核心逻辑变更

- `ai-extract-utils.ts`：`AI_EXTRACT_ACCEPT` 增加 `.doc/.docx/.xls/.xlsx/.rtf` 及对应 MIME；新增 `AI_EXTRACT_OFFICE_EXTENSIONS`；`isAiExtractSupportedFile` 一并放行。
- `use-sea-export-ai-recognize.ts`：不支持格式时的提示文案改为包含 Office。
- 识别链路不变：仍调用 `ExtractSeaExportToAddDtoAsync`，由后端 TextIn 处理文件内容。

# 避坑指南

- 前端仅放开选文件校验；若后端/TextIn 对某 Office 格式未接转换或拒收，会走既有「AI识别失败」错误提示，需后端侧确认 Office 能力。
- Office 文件通常无页级 `boundingRegions` 坐标高亮体验（若预览侧启用），与 PDF/图片不同。
