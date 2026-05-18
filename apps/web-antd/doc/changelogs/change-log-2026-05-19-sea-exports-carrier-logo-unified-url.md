# 海运出口列表船公司 Logo 统一附件地址拼接

## 背景意图

`/sea-exports` 列表的船公司 Logo 已经支持展示，但图片地址仍直接使用后端返回值。当前项目已统一采用“`VITE_GLOB_API_URL` 去掉 `/api` 后拼接附件路径”的规则，为避免该页面出现相对路径回显异常，需要同步接入全局拼接方法。

## 核心逻辑变更

1. **海运出口列表 Logo 地址统一处理**
   - 文件：`src/views/sea-export-admin/list.vue`
   - 新增 `buildAttachmentUrl` 引用；
   - 船公司 Logo 列由 `row.carrierLogo.url` 直接赋值，改为 `buildAttachmentUrl(row.carrierLogo.url)`。

## 避坑指南

- **列表页不要直接绑定后端相对路径**：应统一走 `buildAttachmentUrl`，确保网关域名与前端域名不一致时也能正确回显。
- **Logo 与附件属于同一地址规则**：后续同类图片字段优先复用全局拼接工具，避免重复实现。

# 海运出口列表船公司 Logo 统一附件地址拼接

## 背景意图

`/sea-exports` 列表的船公司 Logo 已经支持展示，但图片地址仍直接使用后端返回值。当前项目已统一采用“`VITE_GLOB_API_URL` 去掉 `/api` 后拼接附件路径”的规则，为避免该页面出现相对路径回显异常，需要同步接入全局拼接方法。

## 核心逻辑变更

1. **海运出口列表 Logo 地址统一处理**
   - 文件：`src/views/sea-export-admin/list.vue`
   - 新增 `buildAttachmentUrl` 引用；
   - 船公司 Logo 列由 `row.carrierLogo.url` 直接赋值，改为 `buildAttachmentUrl(row.carrierLogo.url)`。

## 避坑指南

- **列表页不要直接绑定后端相对路径**：应统一走 `buildAttachmentUrl`，确保网关域名与前端域名不一致时也能正确回显。
- **Logo 与附件属于同一地址规则**：后续同类图片字段优先复用全局拼接工具，避免重复实现。
