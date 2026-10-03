# 打印弹窗新增在线预览

## 背景意图

打印模板里可以带对话框页（例如勾选「集装箱 / 货描 / 唛头」后点「确定」再出报表）。原来的打印预览走 `GetPrintAsync` 在服务端直接生成 PDF，服务端不会弹对话框，勾选项只能按模板默认值出，用户没法点。

后端新增在线预览（详见后端《打印模板接口文档》第十节）：先调 `PrintFormatAdmin/CreateOnlinePreviewAsync` 拿一次性票据，再用 iframe 打开后端页面 `/PrintOnline/Preview?ticket=xxx`，由 WebReport 在浏览器里渲染，对话框可以操作。页面跟随后端 Web.Host 发布，不需要单独部署。

## 核心逻辑变更

1. **`api/system/print-format-admin.ts`**
   - 新增 `createOnlinePreviewAsync`：入参与 `getPrintAsync` 相同（`GetPrintDto`，`format` 不起作用），返回票据字符串。

2. **`components/print-format/use-print-format.ts`**
   - 新增状态 `previewMode`（`pdf` / `online`）、`onlineLoading`、`onlinePreviewUrl`。
   - 新增 `loadOnlinePreview`：用 `buildPrintDto` 组装入参调 `createOnlinePreviewAsync`，再用 `buildStaticFileUrl('/PrintOnline/Preview?ticket=...')` 拼后端绝对地址。
   - 新增 `togglePreviewMode`：PDF ↔ 在线预览切换。切到在线预览每次都重新拿票据；切回 PDF 时已有 PDF 预览直接复用，没有才重新生成。
   - `handleTemplateChange`：在线预览模式下切模板只重新生成在线预览，并清掉旧模板的 PDF 预览，切回 PDF 时按新模板重新生成。
   - `openPrint` / `close` 重置为 PDF 预览。

3. **`components/print-format/print-format-modal.vue`**
   - 标题栏模板下拉右侧加按钮，文案随模式在「在线预览」「PDF 预览」之间切换；没选模板时禁用。
   - 预览区按模式显示 PDF iframe 或在线预览 iframe（白底）。
   - 在线预览模式下隐藏底部「打印」分裂按钮，左侧提示「在线预览请用预览区上方的工具栏打印、导出」。

## 避坑指南

- **票据只能用一次**：iframe 打开后票据就作废，刷新 iframe 或复制地址再开都会显示「在线预览已失效」。所以每次切到在线预览、每次切模板都必须重新调 `createOnlinePreviewAsync`，不要缓存 `onlinePreviewUrl`。
- **地址必须拼后端根地址**：`/PrintOnline/Preview` 页面和它后续的 `/_fr/...` 请求都由后端站点提供。开发环境 `/api` 走代理，但这两个路径没走代理，所以用 `buildStaticFileUrl`（开发取 `VITE_GLOB_STATIC_URL`，生产取 `VITE_GLOB_API_URL` 去掉 `/api`），和 PDF 预览同一个根，不新增 env。
- **在线预览模式不要用底部「打印」**：它走 `GetPrintAsync` 生成 PDF，带不上对话框里的勾选，所以在线预览时隐藏。打印、导出用 WebReport 自带的工具栏。
- **预览页 15 分钟无操作会失效**：后端 WebReport 实例放在内存里，长时间不动后翻页、点按钮会失败，重新点「在线预览」即可。

## 验证备注

- 未运行验证，需联调后端：
  - 带对话框的模板切到在线预览，能勾选、点「确定」出报表，工具栏打印、导出正常。
  - 在线预览下切模板、切回 PDF 预览、关闭再打开弹窗，状态都正确。
  - 开发环境 iframe 地址落在后端（`VITE_GLOB_STATIC_URL`）而不是前端端口。
