# 全局附件地址拼接统一封装

## 背景意图

附件和 Logo 在多个页面存在“各自拼接 URL”的实现，常见写法是直接基于 `window.location.origin`。当 `VITE_GLOB_API_URL` 指向独立网关（如 `http://118.190.1.4:82/api`）时，这种做法会导致资源地址拼错，出现附件预览或 Logo 回显异常。

本次目标是统一封装“附件访问地址拼接”能力：以 `VITE_GLOB_API_URL` 去掉末尾 `api` 后作为根地址，再拼接附件相对路径。

## 核心逻辑变更

1. **新增全局附件 URL 工具**
   - 文件：`src/utils/attachment-url.ts`
   - 新增 `buildAttachmentUrl`：统一将相对路径拼接为完整地址；
   - 新增 `getApiRootUrl`：提供“去掉 `/api` 后的根地址”，供无需 `/api` 前缀的请求复用。

2. **上传结果统一落地为完整附件地址**
   - 文件：`src/api/common/upload.ts`
   - `mapResultToAttachment` 改为调用 `buildAttachmentUrl`；
   - 上传请求 `baseURL` 改为复用 `getApiRootUrl`，与全局规则一致。

3. **页面与组件统一复用拼接方法**
   - 文件：`src/adapter/component/file-upload/file-upload-input.vue`
   - 文件预览改为调用 `buildAttachmentUrl`，避免继续使用 `window.location.origin`。
   - 文件：`src/adapter/component/biz-select/carrier-select.vue`
   - 文件：`src/views/system/basic-data/CarrierAdmin/list.vue`
   - 船公司 Logo 统一改为 `buildAttachmentUrl`，确保跨域网关下也能正确展示。

4. **鉴权接口去 `/api` 根地址复用**
   - 文件：`src/api/core/auth.ts`
   - 用户配置接口 `baseURL` 改为调用 `getApiRootUrl`，去重并保持行为一致。

## 避坑指南

- **不要再手写 `window.location.origin + path`**：该方式在 API 网关与前端域名不一致时会失效。
- **附件字段可能是相对路径也可能是绝对路径**：统一走 `buildAttachmentUrl`，内部已处理协议判断和兜底。
- **去 `/api` 的规则必须集中维护**：后续若网关后缀调整，只需改 `attachment-url.ts` 一处。
