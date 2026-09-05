# 旧版 .xls（OLE）预览前先转成 xlsx

## 背景意图

附件能正常下载，扩展名也是 `.xls`，但 vue-office 报「未获取到数据，可能文件格式不正确或文件已损坏」。文件本身没坏：开头魔数是 `D0 CF 11 E0`，即 Excel 97-2003 的 OLE/CFBF 复合文档。`@vue-office/excel` 底层用 exceljs，只认 OOXML（`.xlsx` zip）；不先转换就会把空 workbook 当成损坏。

## 核心逻辑变更

1. 新增 `prepareExcelPreviewBuffer`：ZIP 的 `.xlsx` 原样交给 vue-office；OLE `.xls` 和 `.csv` 用项目已有的 SheetJS（`xlsx`）转成 xlsx ArrayBuffer 再预览。
2. `attachment-viewer-modal` 在 fetch 到 Excel 缓冲后调用该转换；转换失败直接提示下载，不再误当成下一个 URL 可救。

## 避坑指南

- **能下载 ≠ 能被 vue-office 直接读**：旧 `.xls` 不是 zip。看到「未获取到数据」先看文件头是不是 `D0 CF 11 E0`。
- **不要把 `xlsx` 挂到 `#/utils` 桶导出**：否则全站入口都会打进 SheetJS。仅预览弹窗按路径引用 `prepare-excel-preview`。
- **复杂宏 / VBA / 部分样式仍可能丢**：预览以转换为准，最终以本地下载用 Excel 打开为准。
