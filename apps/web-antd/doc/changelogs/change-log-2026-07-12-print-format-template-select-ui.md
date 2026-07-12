# 2026-07-12 打印弹窗模板下拉与预览体验优化

## 背景意图

原打印弹窗左侧为模板单选列表、进入后默认选中第一个并自动拉 PDF。需求调整为：模板改用下拉且与标题同一行、默认不选模板（选后才渲染 PDF）、窗口更大；并修复本地开发时 PDF 静态地址拼到 `localhost` 导致加载失败。

## 核心逻辑变更

1. **模板选择改下拉并入标题行**（`print-format-modal.vue`）
   - 移除左侧 `RadioGroup` 模板列表与两栏布局，PDF 预览区占满弹窗。
   - `Modal` 使用 `#title` 插槽：标题「打印预览」+ 模板 `Select`（`templateOptions` 由 `templates` 映射，`@change` 调 `handleTemplateChange`）。

2. **默认不选模板**（`use-print-format.ts`）
   - `loadTemplates` 拉到模板后不再自动选中第一个、不再自动 `loadPreview`；`selectedTemplateId` 保持 `undefined`，预览区展示「请选择模板生成预览」。
   - 用户在下拉中选择后才触发 `loadPreview` 渲染 PDF。

3. **窗口加大**
   - `Modal` 宽度 `960 → 1200`；预览区高度 `600px → 76vh`；`.ant-modal` `top: 24px` 避免高弹窗溢出。

4. **本地开发 PDF 地址不用 localhost**（`utils/attachment-url.ts` + `.env.development`）
   - 新增 `getStaticFileOrigin()` / `buildStaticFileUrl()`：生产用 `VITE_GLOB_API_URL` 去 `/api`，开发用新增的 `VITE_GLOB_STATIC_URL`（指向真实后端 `http://118.190.1.4:82`）。
   - `resolvePrintFileUrl` 改用 `buildStaticFileUrl`，开发环境直连后端静态目录，规避 `/PrintTempFile` 未配代理、落到 localhost 无法加载的问题。

5. **预览 loading 垂直居中修复**（`print-format-modal.vue`）
   - 原用 `<Spin>` 包裹内容，选中模板后 `previewLoading=true` 且 iframe/Empty 均被 `v-if` 隐藏，Spin 内容区塌陷导致转圈跑到顶部。
   - 改为与 `attachment-viewer-modal` 一致的绝对定位覆盖：`Spin` / iframe / Empty 三选一渲染，`.print-preview-loading` 用 `position:absolute + translate(-50%,-50%)` 居中。

## 附件 PDF 一致性

附件预览弹窗（`attachment-viewer-modal.vue`）的 PDF 分支与打印共用 `buildPdfEmbedUrl`（`#toolbar=0&navpanes=0`），同样隐藏顶部工具栏与左侧缩略图/分页，无需额外改动。

## 避坑指南

- `VITE_GLOB_STATIC_URL` 仅开发环境生效；未配置时回退 `buildAttachmentUrl`（可能仍落 localhost）。切换后端环境（如 jht）需在对应 `.env` 补该变量。
- 直连后端静态资源属跨域读取，`<iframe>`/`<img>` 展示不受 CORS 限制；如未来改用 fetch 读取需另配 CORS。
- 默认不选模板后，「导出」按钮 `:disabled="!selectedTemplateId || loading"` 依赖选择态，勿误删。
