# 更改单船公司 Logo 改用全局附件地址拼接

## 背景意图

更改单顶部订单信息条直接把接口返回的相对路径（如 `/Uploads/document/...`）当作 `img.src`，会拼到当前前端域名上，导致 404。需与费用页一致，走全局 `buildAttachmentUrl`。

## 核心逻辑变更

1. 引入 `#/utils` 的 `buildAttachmentUrl`。
2. 折叠摘要与展开栅格两处船公司 Logo 的 `:src` 均改为 `buildAttachmentUrl(carrierLogo.url || carrier.logo.url)`。

## 避坑指南

- 附件相对路径一律经 `buildAttachmentUrl`（或 `buildStaticFileUrl`）再用于展示/下载；勿直接绑到 `src`/`href`。
- 费用页 `orderFee/index.vue` 已正确处理，可作对照。
