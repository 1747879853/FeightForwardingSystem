# 打印导出改为静默下载并修正文件名清洗-2026-07-24

## 背景意图

- 打印弹窗导出 PDF/Excel/Word 时，原先用 `window.open` 打开静态地址，友好文件名含 `-` 时会被错误截断导致 404；且 PDF 弹新窗口体验不佳。
- 改为：用原始文件名（含时间戳）静默拉取 blob，再按「仅去掉末尾纯数字时间戳」清洗后触发浏览器下载。

## 核心逻辑变更

- `cleanReturnedFilename`：改为只截断「最后一个 `-` 后为纯数字」的尾段，避免误伤如 `订舱委托书-101-6392....pdf`。
- 新增 `resolveRawPrintFileUrl` / `downloadPrintFile`：优先用原始文件名拉文件，失败再兜底清洗后地址。
- 预览：iframe 使用原始文件名地址；缓存 `previewOriginalFilename`，PDF 导出复用、避免重复请求。
- `handleExport`：PDF/Excel/Word 统一走静默下载，不再 `window.open`。

## 避坑指南

- 服务器真实文件名含时间戳，清洗后的友好名仅用于 save-as，不能用来拼静态地址（除非后端同时存了清洗名）。
- 旧逻辑「文件名第一个 `-` 就截断」已废弃，勿再按该规则文档化。
