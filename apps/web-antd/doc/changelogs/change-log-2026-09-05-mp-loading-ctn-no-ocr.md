# 2026-09-05 小程序监装拍照识别箱号

## 背景意图

师傅现场填箱号容易抄错。后端新增 `GeminiAdmin/UploadAndExtractCtnNoAsync`，拍箱门照片即可识别 ISO 箱号。小程序要单独入口：只回填箱号，不把这张图放进监装附件槽。

## 核心逻辑变更

- 监装处理面板箱号旁增加「识别」，拍照或相册选一张，走 `POST /api/services/app/GeminiAdmin/UploadAndExtractCtnNoAsync`。
- 接口 `success=true` 且 `ctnNo` 为空仍算识别失败，用弹窗提示手工填写；认出则写入当前箱 `ctnNo`（最长 32）。
- 忽略返回的 `attachmentId` / `fileUrl`，不推进 `attachmentGroups`，保存监装照片时不会带上识别图。

## 避坑指南

- **识别失败不是接口失败。** 不要把 `success=true` 当成一定有箱号。
- **只传一张图，超时 180 秒。** 多于一张后端报错；识别可能十几秒，loading 不要提前关。
- **后端仍会落附件。** 前端不关联到工单，附件表可能留下未引用记录。小程序侧按产品要求「图片不保存」处理。
- **不要在 hideLoading 后立刻 Toast。** 微信会把提示吃掉；失败改 `showModal`，并隔 320ms 再弹。错误文案也可能超过 Toast 7 字上限。
