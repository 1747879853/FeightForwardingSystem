# 2026-08-09 海运出口 AI 识别回填港口备注与港口 Id

## 背景意图

后端 TextIn `ExtractSeaExportToAddDtoAsync` 已在 `seaExport` 中返回六段港口 Id 与对应 `*Remark`，但前端 `buildAiExtractFormPayload` 只映射了部分港口 Id，未把备注（及收货地/中转港 Id）写入 `formValues`，导致识别结果有值却不回填表单。对应 TAPD：[`【海运出口】AI识别`](https://www.tapd.cn/61580498/bugtrace/bugs/view/1161580498001000737) 问题（1）。

## 核心逻辑变更

- 文件：`apps/web-antd/src/views/sea-export-admin/basic-info-form/ai-extract-utils.ts`
- 在 `buildAiExtractFormPayload` 中对 `seaExport` 增补：
  - Id：`receivePortId`、`poT1Id`、`poT2Id`（原已有 `polId`/`podId`/`deliverPortId`）
  - 备注：`receivePortRemark`、`polRemark`、`poT1Remark`、`poT2Remark`、`podRemark`、`deliverPortRemark`
- 仍走既有 `assignScalar`：受 `AI_RECOGNIZE_ALLOWED_FIELDS` 白名单约束，空值/`0`/空 Guid 不回填；备注字段经 `normalizeAiFieldValue` 做半角大写。

## 避坑指南

- 白名单里有字段不等于会回填：必须在 `buildAiExtractFormPayload` 里显式 `assignScalar`，否则接口有值也会被丢掉。
- TAPD 同单问题（2）「匹配 EDI 后下拉五字代码未带出港口」属 Select `selectedItems`/回显链路，与本次备注映射无关，需另修。
