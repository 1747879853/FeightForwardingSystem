# 通用附件查看器支持 OFD 在线预览

## 背景意图

数电发票法定凭证、AI 识别上传都会落到 `.ofd`。通用查看器原先只把 OFD 当「其它类型」提示下载。补上浏览器内预览，点附件即可看票面，不必先下载。

## 核心逻辑变更

1. **类型分流**把 `.ofd` 从 `other` 提出来，与图片/PDF/Office 并列。
2. 预览仍先 fetch ArrayBuffer（开发走同源/`/Uploads`，生产直连后端），再交给 [vue-liteofd](https://www.npmjs.com/package/vue-liteofd) 的 `LiteOfd.parse` + `render`。
3. 渲染结果按容器宽度缩放（`transform: scale`），避免发票页默认 2100px 把弹窗撑出横向滚动。
4. 解析失败时仍给下载。独立预览页 `/attachment-preview` 走同一套面板。

未采用 `ofd-tools`：该库依赖 `@lapo/asn1js` 的 `require("./int10")`，Vite 预打包会报 `Dynamic require is not supported`。

## 避坑指南

- **不要用 PDF iframe 打开 OFD**：浏览器不能原生预览 OFD。
- **不要把 `ofd-tools` 当 Vite 方案**：asn1js 动态 require 过不了预打包。
- **排版不是 100% 还原**：签章、底纹、复杂矢量可能有差，入账以本地下载的 OFD 为准。
- **vue-liteofd 约 1.3MB**：面板异步加载，不要打进主包。
