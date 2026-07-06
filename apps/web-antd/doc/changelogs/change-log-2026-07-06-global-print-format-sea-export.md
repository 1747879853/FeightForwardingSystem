# 2026-07-06 全局打印格式封装与海运出口打印对接

## 背景意图

海运出口详情页「打印」按钮此前为 TODO。后端已提供 `PrintFormatAdmin`（模板列表 + `PrintAsync` 生成 PDF），需封装为全局能力供多业务模块复用，并率先在海运出口编辑页落地。

## 核心逻辑变更

1. **全局打印模块**（`src/components/print-format/`）
   - `PrintJsonType` 枚举：海运出口 `0`、海运进口 `4000`、空运出口 `5000`、空运进口 `6000`。
   - `usePrintFormat().openPrint({ printJsonType, json })`：弹出模板单选列表，确认后调用 `PrintAsync`，通过隐藏链接触发 PDF 下载。
   - `PrintFormatModal` 挂载于 `app.vue`，与 `WorkflowTimelineModal` 同模式。

2. **API 层**（`src/api/system/print-format-admin.ts`）
   - `GetPagedListAsync`：按 `PrintJsonType` 筛选模板。
   - `PrintAsync`：传入 `printFormatId` + 业务 JSON 字符串，返回 PDF 文件名。

3. **海运出口对接**（`form.vue`）
   - 新增模式禁止打印，提示先保存。
   - 无未保存修改：重新 `DetailAsync` 后 `JSON.stringify` 作为打印数据。
   - 有未保存修改：二次确认后使用当前表单 `buildDto` 序列化打印。
   - 打印按钮增加 loading 态。

## 避坑指南

- `PrintAsync` 的 `json` 由**业务模块自行组装**；全局封装不负责字段映射。
- PDF 地址使用 `buildAttachmentUrl('/PrintTempFile/{filename}')`，与附件 URL 规则一致。
- 模板列表为空时提示「暂无可用打印模板」并关闭弹窗，勿静默失败。
