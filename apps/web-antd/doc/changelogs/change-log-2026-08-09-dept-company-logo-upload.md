# 2026-08-09 组织管理公司级支持 Logo 上传

## 背景意图

TAPD #0570：组织机构「公司」需维护 Logo，供打印等场景使用。后端 `CreateOrganizationUnitAsync` / `UpdateOrganizationUnitAsync` / `GetOrganizationUnitAsync` 已暴露 `logo`（附件模块 `OrganizationUnitLogo`），前端表单与详情此前未对接。

## 核心逻辑变更

- `organization-unit.ts`：`OrganizationUnitDto` / Create / Update 补 `logo`（输入 `{ attachmentId, displayOrder }`，输出 `AttachmentItemDto`）
- `dept/data.ts`：公司专属字段增加 `FileUploadInput`（`listType: 'picture-card'` 缩略图卡片，单图、png/jpg/jpeg/webp/svg，≤5MB），仅 `isCompany===true` 显示
- `file-upload-input.vue`：新增 `listType`；`picture-card` 时以缩略图展示而非文件名附件列表；缩略图 URL 统一 `buildAttachmentUrl`
- `dept/modules/form.vue`：回显映射与提交映射对齐船公司；无值传 `null` 清空；部门提交强制 `logo: null`
- `dept/list.vue`：公司详情把 Logo 贴在标题与「组织名称」旁展示（`buildAttachmentUrl`），不再单独占一行
- i18n：`system.dept.logo` / `logoHelp`

## 避坑指南

- 清空 Logo 必须显式传 `logo: null`，不要省略字段，否则编辑可能残留旧附件
- Logo URL 为相对路径时必须走 `buildAttachmentUrl`，直接当 `src` 在独立 API 网关下会 404
- 仅公司可维护；用户把「公司」改成「部门」时前端会提交 `logo: null`，与公司专属字段展示逻辑一致
- Logo 上传请传 `listType: 'picture-card'`；默认 `text` 仍是附件文件名列表，别把两种场景混用
