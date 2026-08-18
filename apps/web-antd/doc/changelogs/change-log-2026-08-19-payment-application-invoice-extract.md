# 付费申请发票附件支持 Gemini 识别回填

## 背景意图

付费申请编辑页需要根据已上传的发票附件自动识别发票号与开票日期，减少手工录入。识别结果只作预填，由用户核对后再决定是否保存。

## 核心逻辑变更

- API：`src/api/sea-export/gemini-admin.ts` 新增 `extractInvoice`，调用 `GeminiAdmin/ExtractInvoiceAsync`，以 `multipart/form-data` 传 `attachmentId`（大数 ID 原样 `String` 透传），超时 180 秒。
- 附件：`attachment-groups.vue` 中名称含「发票」或 `invoice` 的分组，每个文件旁增加「识别发票」小按钮；点击后走附件 Id 识别，不上传文件、不落库。
- 回填：`form.vue`（新增/编辑页）与列表「维护发票信息」弹窗监听 `extracted`，把 `invoiceNo` / `invoiceDate` 写入表单字段；字段为 `null` 时不覆盖用户已填值。
- 不自动调用 `EditAsync` / `EditInvoiceAsync`，用户点保存才提交。

## 避坑指南

- 默认 `requestClient` 超时 20 秒，本接口必须单独设 `timeout: 180_000`，否则长识别会被前端掐断。
- `attachmentId` 禁止 `JSON` 请求体；后端绑不到值会报「请上传发票文件或传入附件Id」。
- 识别不到两个字段都为 `null` 且接口仍成功，不要当成失败；前端提示手动填写即可。
- 附件类型名来自基础资料，按钮按分组名称匹配「发票/invoice」，改名后按钮会消失。
