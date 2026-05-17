# 变更记录：船公司新增 Logo 字段前端对接

## 背景意图

- `/basic-data/carrier` 后端接口协议升级，移除了 `countryId`，并新增 `logo` 附件对象。
- 旧前端未支持 Logo 上传与提交，且分页查询参数命名与后端约定不一致，导致新增/编辑与列表查询无法完整对接。

## 核心技术决策/逻辑变更

- 对齐 `CarrierAdmin` API 协议到新版本：
  - 接口路径保持 `Async` 后缀：`/GetPagedListAsync`、`/DetailAsync`、`/AddAsync`、`/EditAsync`、`/DeleteAsync`。
  - 分页查询参数按后端约定使用 `Keyword/CnName/.../Sorting/PageIndex/PageSize`。
  - DTO 新增 `logo` 相关类型定义（输入 `attachmentId/displayOrder`，输出 `AttachmentItemDto`）。
- 改造船公司页面表单与列表：
  - 移除 `countryId` 字段。
  - 新增 `logo` 上传字段，复用 `FileUploadInput` 组件，限制单文件图片上传。
  - 新增列表 `logo` 列，展示已关联 Logo 文件名。
  - 新增/编辑提交时，将上传结果映射为 `logo: { attachmentId, displayOrder: 0 }`；无值时传 `null` 清空。
  - 编辑回显时，将详情 `logo` 映射回上传组件可识别的附件数组结构。

## 避坑指南（Gotchas & Constraints）

- `FileUploadInput` 表单值是附件数组，提交单附件对象时必须取第一项并显式转为数字 `attachmentId`。
- 后端约定“清空 Logo”使用 `logo: null`（或不传）；前端统一在无上传值时传 `null`，避免编辑场景残留旧附件。
- 分页接口参数需严格与后端约定一致，当前以 `PageIndex/PageSize` 为准，避免因参数名不一致导致分页失效。
