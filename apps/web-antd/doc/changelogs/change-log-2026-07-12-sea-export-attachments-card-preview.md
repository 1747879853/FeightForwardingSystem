---
title: 海运出口附件 Tab 卡片化布局与全局预览弹窗
module: 海运出口
author: auto-doc-sync
last_updated: 2026-07-12
---

# 海运出口附件 Tab 卡片化布局与全局预览弹窗

## 背景意图

海运出口编辑页附件 Tab 初版采用「每类型一张 Card + 内嵌 Table」展示，操作路径长、无法在线预览文件，且 webp 等图片格式被前端白名单拦截。业务希望：按附件类型以卡片网格排列（大屏一行 3 个）、点击文件即可弹窗预览，并统一支持 PDF / Office / 图片在线查看；同时默认对客户不可见，并将「客户可见」勾选与标题行合并。

## 核心逻辑变更

### 1. 全局附件查看弹窗 `attachment-viewer-modal.vue`

新建可复用组件 `src/adapter/component/file-preview/attachment-viewer-modal.vue`：

| 文件类型 | 预览方式 |
| :-- | :-- |
| PDF | 内嵌 `<iframe>` 直接加载附件 URL |
| Word / Excel / PPT / CSV | `<iframe>` 嵌入 `https://view.officeapps.live.com/op/embed.aspx?src={encodeURIComponent(公网URL)}` |
| 图片（含 webp/svg/tiff 等） | `<Image>` 直接展示 |
| 其他（zip/rar 等） | 提示不支持在线预览，提供下载 |

弹窗内容区固定高度 `70vh`；顶部工具栏提供「新窗口打开」「下载」。

### 2. 附件 Tab UI 重构 `attachments/index.vue`

- **布局**：由纵向堆叠 Table 改为响应式网格 `grid-cols-1 sm:grid-cols-2 xl:grid-cols-3`，每附件类型一张 Card。
- **卡片头部**：左侧类型名 + 文件数；右侧（可编辑时）「客户可见」Checkbox 与「上传」按钮同一行。
- **文件列表**：卡片内以列表项展示；图片显示缩略图，其它类型显示带色图标；点击整行或预览按钮打开全局弹窗。
- **添加其他类型**：由顶部独立按钮改为网格末尾虚线「+ 添加其他类型」卡片，与其它 Card 同列排列。
- **客户可见默认值**：`getClientVisible` 默认由 `true` 改为 `false`，新上传附件默认对客户不可见。

### 3. 上传类型扩展

`ALLOWED_TYPES` 新增：`.webp .svg .tif .tiff .ppt .pptx .csv`，修复 webp 无法上传问题。

### 4. 国际化

- `component.json` 新增 `filePreview.*`（标题、新窗口打开、下载、不支持提示）。
- `seaExport.json` 附件区新增 `preview`、`fileCount`，更新 `uploadTip` 含 PPT。

## 避坑指南

1. **Office 在线预览依赖公网地址**：`view.officeapps.live.com` 无法访问 localhost 或内网附件 URL，本地开发环境 Office 类文件预览会失败；PDF/图片不受影响。生产环境需确保 `buildAttachmentUrl` 拼出的地址外网可达。
2. **`clientVisible` 仅上传时写入**：后端无单独 Edit 接口修改可见性，勾选状态仅影响**下一次上传**的 `clientVisible` 字段；已上传附件的可见性不会被 Checkbox retroactive 修改。
3. **全局弹窗可复用**：其它模块（如客户附件列表）可引入 `AttachmentViewerModal`，传入 `file-url` + `file-name` 即可。
