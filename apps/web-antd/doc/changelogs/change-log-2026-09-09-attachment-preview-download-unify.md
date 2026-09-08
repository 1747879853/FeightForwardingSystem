# 全站附件统一预览与友好文件名下载

## 背景意图

业务附件此前有多套旁路：`window.open` 新开窗口、页内 `<a download>`、进项发票详情直链。列表展示的是 `friendlyFileName`，旁路下载跨域时会落到存储名/URL 名。要求全站预览走统一查看器，下载一律用友好文件名；打印链路保持独立清洗，不改。

## 核心逻辑变更

1. 抽出 `downloadAttachmentWithFriendlyName`：先同源/后端地址 `fetch` blob，再 `downloadFileFromBlob` 按友好名保存；失败才回退直链并提示。
2. 查看器弹窗下载改为调用该工具；海出/海进/空出/客户附件与账期、开票、付费结算等页内「下载」去掉直链，改走同一工具。
3. 表单 `Upload` 非图片预览、进项发票详情附件，由 `window.open` / `<a target=_blank>` 改为 `openAttachmentViewer`，并传入 `friendlyFileName`。拖拽模式 `FileUploadInput` 文件名可点预览。表单 `Upload` 图片也不再走 Ant Image 灯箱。
4. 付费申请列表「批量下载发票」zip 也走 blob 改名（包名仍用后端 `fileName`）。打印 `use-print-format` 未改。监装箱照仍用照片灯箱（可左右翻图），不是文档预览旁路。

## 避坑指南

- 跨域 `<a download>` 无法强制自定义文件名，必须 blob。
- 打开查看器时请带 `friendlyFileName`，不要只传存储 `fileName`。
- 打印下载继续走 `use-print-format` 的文件名清洗，不要接到本工具。
