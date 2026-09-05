# 2026-09-05 小程序监装拍照后缩略图空白

## 背景意图

微信小程序监装处理里，手机拍照后格子经常是空白的，关掉面板再开（或保存后重进详情）才看得到图。相册相对好一些，但同一套赋值。

## 核心逻辑变更

- 上传返回的 `fileUrl` 多为相对路径。详情回填走 `buildAttachmentUrl`，拍照后原先直接 `result.fileUrl || path` 塞给 `<image>`，微信画不出来。
- 相机临时文件在 `uploadFile` 后常被回收；现在拍照先 `getImageInfo` + `saveFile`，立刻用本地路径占格，再上传。
- 上传成功后把展示地址拼成带 `VITE_API_ORIGIN` 的完整 URL；远程图 `@error` 时回退本地路径。
- `hideLoading` 后 bump `thumbEpoch` 强制原生 `image` 重挂，避开相机页返回后同层组件不刷新。

## 避坑指南

- **不要把后端相对路径直接给小程序 `<image>`。** 二次打开之所以正常，是因为详情 `toEditableCtns` 已经拼过 origin。
- **先出本地缩略图再 `showLoading`。** Loading 遮罩盖住原生 image 时，相机返回后这一帧经常画不出来。
- **保存仍只认 `attachmentId`。** 本地路径只用于当场展示，不提交。
