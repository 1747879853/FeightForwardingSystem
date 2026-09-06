---
title: 全局附件查看器
module: 共享能力
author: auto-doc-sync
last_updated: 2026-09-06
callers: 付费申请、付费审批、海出/海进/空出附件 Tab、客户附件、开票、公告、业务联系单、FileUploadInput
---

# 1. 业务背景说明 (Background)

**白话解释：** 业务人员在任意页面点附件，都在同一个弹窗里预览：图片和 PDF 直接看，Word/Excel/PPT 由浏览器内的 vue-office 渲染。相对路径会拼当前品牌后端。开发时 Office/PDF 走 Vite `/Uploads` 代理；生产前后端不同源、没有反代，直接打后端附件地址，不依赖微软在线预览。

# 2. 功能与操作说明 (Features & Operations)

- **打开预览：** 任意页面调用 `openAttachmentViewer(item)` 或传入 URL 字符串；`app.vue` 中的 `AttachmentViewerHost` 弹出查看器。
- **类型分流：** 图片直接展示；PDF 内嵌 iframe（同源地址，隐藏浏览器工具栏）；`.xlsx/.xls/.csv/.docx/.pptx` 用 vue-office 本地渲染（旧版 OLE `.xls` 与 `.csv` 会先经 SheetJS 转成 xlsx）；旧版 `.doc/.ppt` 与其它类型提示下载。
- **工具栏：** 展示上传人、上传时间（有值才显示）；弹窗可全屏、新窗口打开独立预览页、下载原文件。独立页只保留下载。
- **地址补全：** 下载仍拼后端根。`resolveSameOriginMediaUrl` 仅在开发把附件改成 `/Uploads/...` 走 Vite 代理；生产保持后端绝对地址，避免先请求前端站点。

# 3. 状态流转说明 (Status Transitions)

| 当前状态 | 触发人/动作 | 目标状态 | 状态说明 |
| :-- | :-- | :-- | :-- |
| 关闭 | 调用 `openAttachmentViewer` 且有 URL | 打开并按类型渲染 | 无 URL 时 toast「附件链接不存在」，不打开 |
| 打开 | 点「全屏」 | 弹窗铺满视口 | 再点「退出全屏」或关闭弹窗复位 |
| 打开 | 点「新窗口打开」 | 新标签打开 `/attachment-preview` | 用同一套预览，不打开原始文件 URL |
| 打开 | 关闭弹窗 / 取消 | 关闭并清空 | `destroyOnClose`，下次打开重新加载 iframe |

# 4. 核心字段说明 (Field Definitions)

| 字段名 | 📖 字段含义说明 | 🔌 数据来源 (接口/字典) | 🔗 联动规则 (依赖与触发) | 🛡️ 校验限制 (Validation) |
| :-- | :-- | :-- | :-- | :-- |
| **url / fileUrl** | 附件访问地址，相对或绝对均可 | 调用方传入（附件 DTO 或字符串） | 触发弹窗打开；开发时 Office/PDF 预览改写为 `/Uploads` 走代理，生产直连后端 | 空则提示「附件链接不存在」 |
| **fileName / friendlyFileName** | 用于标题与扩展名识别 | 附件 DTO | 无文件名时从 URL 路径取 | 扩展名决定 image/pdf/office/other |
| **uploader / creatorUserName** | 上传人 | 附件 DTO | 有值才显示 | 可选 |
| **uploadTime / creationTime** | 上传时间 | 附件 DTO | 能被 dayjs 解析则格式化为 `YYYY-MM-DD HH:mm:ss` | 可选 |
| **后端根** | 附件下载直连的后端 origin | `VITE_GLOB_STATIC_URL` / `VITE_GLOB_API_URL` 去 `/api` | 预览不走微软 | 开发 `/Uploads` 走 Vite 代理；生产不要把路径拼到前端域名 |

# 5. 核心业务卡点 (Business Blockers)

> [!IMPORTANT] **[卡点 1：Office 不再走微软在线预览]** `http://IP:84` 文件微软拉不到。现用 vue-office 在浏览器内渲染；复杂排版可能有差异，以本地下载为准。

> [!IMPORTANT] **[卡点 2：预览与下载分开]** 弹窗内 PDF 带 `#toolbar=0` 仅用于预览；下载走原文件 URL。「新窗口打开」进入 `/attachment-preview` 预览页，不要 `window.open` 原始 `.xls` 地址（浏览器会当下载）。

> [!IMPORTANT] **[卡点 3：不要页面各自挂 Modal]** 全站只在 `app.vue` 挂一次 `AttachmentViewerHost`。业务页只调 `openAttachmentViewer`。

> [!IMPORTANT] **[卡点 4：旧版 .doc / .ppt 不能预览]** vue-office 只支持 `.docx` / `.pptx`。二进制旧格式请下载。

> [!IMPORTANT] **[卡点 5：旧版 .xls 必须先转 xlsx]** 魔数 `D0 CF 11 E0` 的 Excel 97-2003 文件能下载但不能直接给 exceljs。预览前走 `prepareExcelPreviewBuffer`。

> [!IMPORTANT] **[卡点 6：生产没有 /Uploads 代理]** 津海通 `admin` 与 `api` 分域名，其它品牌是 `:18x` 静态站 + `:8x` API。不要把 `/Uploads` 改写到前端 origin；开发才走 Vite 代理。

# 6. 变更与解析日志 (Changelog & Insights)

| 日期 | 变更类型 | 📝 业务功能变动 (针对工作流A) | 🤖 代码解析与架构洞察 (针对工作流B) |
| :-- | :-- | :-- | :-- |
| 2026-09-06 | `Fix` | 生产预览不再先请求前端 `/Uploads`（无反代会 404），改为直连后端附件地址。 | `resolveSameOriginMediaUrl` 仅 DEV 改写相对路径。详见 [变更日志](../../changelogs/change-log-2026-09-06-attachment-preview-no-prod-proxy.md)。 |
| 2026-09-05 | `Fix` | 弹窗可全屏；「新窗口打开」改为独立预览页，不再把 Office 当下载。 | `/attachment-preview` 核心路由、无 Layout；下载用 `<a download>`。详见 [变更日志](../../changelogs/change-log-2026-09-05-attachment-viewer-fullscreen.md)。 |
| 2026-09-05 | `Fix` | 旧版 `.xls`（OLE）预览前先转成 xlsx，不再误报文件损坏。 | vue-office/exceljs 只吃 zip xlsx；SheetJS 可读该文件（示例 45 行）。详见 [变更日志](../../changelogs/change-log-2026-09-05-excel-xls-ole-preview.md)。 |
| 2026-09-05 | `Fix` | Office 预览改为 vue-office 本地渲染，不再依赖微软公网拉取。 | `.xls/.xlsx/.docx/.pptx` 同源 fetch ArrayBuffer；旧 `.doc/.ppt` 仍下载。详见 [变更日志](../../changelogs/change-log-2026-09-05-office-preview-vue-office.md)。 |
| 2026-09-05 | `Feature` | 新增全站附件查看器：点附件在弹窗预览图片/PDF/Office，不再新开浏览器窗口。 | 仿打印/轨迹弹窗：模块级单例 + `app.vue` 挂 Host。详见 [变更日志](../../changelogs/change-log-2026-09-05-global-attachment-viewer.md)。 |
