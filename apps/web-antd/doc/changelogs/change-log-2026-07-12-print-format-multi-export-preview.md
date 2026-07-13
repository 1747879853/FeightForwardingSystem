# 2026-07-12 打印弹窗改为 PDF 预览 + 多格式导出

## 背景意图

后端 `PrintAsync` 接口新增 `format` 入参（`PrintExportFormat`：0 PDF / 1 Excel / 2 Word，缺省 PDF），返回文件名 `{Ticks}.{扩展名}`，静态路径 `/PrintTempFile/{文件名}`。前端全局打印弹窗需从「选模板即下载 PDF」升级为：**选模板 → 先拉 PDF 并 iframe 预览 → 下拉选择导出格式**；PDF 直接下载，Excel/Word 在新窗口打开下载。

## 核心逻辑变更

1. **`components/print-format/types.ts`**
   - 新增枚举 `PrintExportFormat { Pdf=0, Excel=1, Word=2 }`，与后端对齐（值从 0 开始，勿沿用旧 CheckBill 的 1/2/3）。

2. **`api/system/print-format-admin.ts`**
   - `GetPrintFileDto` 新增可选字段 `format?: PrintExportFormat`；不传即 PDF，行为与改造前一致。

3. **`components/print-format/use-print-format.ts`**（交互核心）
   - `openPrint` → `loadTemplates`：拉到模板后默认选中第一个并自动 `loadPreview`。
   - `loadPreview`：以 `format=Pdf` 调 `printFormatAsync`，返回文件名经 `buildAttachmentUrl('/PrintTempFile/{name}')` 生成 `previewUrl` 供 iframe。
   - `handleTemplateChange`：切换模板重新拉 PDF 预览。
   - `handleExport`：PDF → 复用 `previewUrl` 走 `downloadFileByUrl`（无预览兜底重拉）；Excel/Word → 按目标 `format` 重新生成并 `window.open(url, '_blank', 'noopener')` 新窗口下载。
   - 暴露 `previewLoading`/`exporting`/`exportFormat`/`previewUrl` 等状态。

4. **`components/print-format/print-format-modal.vue`**
   - 布局改为左右：左侧模板 `RadioGroup` 列表（可滚动），右侧 PDF `iframe` 预览（600px 高、`Spin` 覆盖）。
   - 底部 footer：左「导出格式」`Select`（PDF/Excel/Word）+ 右「关闭 / 导出」；弹窗宽 960，标题「打印预览」。

## 避坑指南

- **枚举从 0 开始**：前端传 `format: 0/1/2`。
- **返回值是文件名不是 URL**：需拼 `/PrintTempFile/{文件名}`（封装在 `resolvePrintFileUrl`，兼容后端直接返回以 `/` 开头的路径）。
- **PDF 复用预览文件**：导出 PDF 不重复请求；Excel/Word 才重新调接口。
- **新窗口下载**：Excel/Word 用 `window.open(_blank, noopener)`；浏览器无法预览的类型自动触发下载。
- **调用方无需改动**：`usePrintFormat().openPrint({ printJsonType, json })` 签名不变，`basic-info-form/form.vue`（详情打印）与 `orderFee/modules/order-fee-table.vue`（费用打印）均只解构 `openPrint`，透明升级。
- Excel/Word 实际排版取决于 FastReport 模板布局，复杂报表建议在对应格式下预览确认。

## 验证备注

- 代码通过 vite HMR 编译与 lint；本地端到端预览验证时后端 `118.190.1.4:82` 间歇性 `ECONNREFUSED/ETIMEDOUT`，待后端稳定后补测「选模板→iframe 出 PDF→切 Excel/Word 新窗口下载」。
