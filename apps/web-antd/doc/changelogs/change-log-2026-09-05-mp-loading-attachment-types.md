# 2026-09-05 小程序监装按附件类型分组上传

## 背景意图

师傅端监装处理原先只展示工单里已经有的照片分组，没有附件时落到一个未分类「监装照片」。现场需要先按基础资料维护的附件类型分槽再上传。同时去掉附件类型页对业务联系单 `160050` 的代码兜底，改由枚举管理维护模块名。

## 核心逻辑变更

- 小程序详情并行请求 `LoadingOrder/DetailAsync` 与 `AttachmentDtlType/GetListByModuleTypesAsync`（`moduleTypes: [160100]`）。
- `toEditableCtns` 先按维护类型铺空槽，再填该箱已有照片；历史未分类组追加在后。标题读 `attachmentDtlType.name`。
- 未配置类型时面板提示「未配置监装附件类型」，并保留未分类槽，避免完全不能传。
- 保存仍走 `EditOrderCtnsAsync` 按箱全量替换；空组不提交。
- 删除 `lookup.ts` 的 `KNOWN_MODULE_TYPE_FALLBACKS`。附件类型下拉只认枚举 `ModuleType`。枚举保存时一并清掉 ModuleType 下拉内存缓存。

## 避坑指南

- **`160100` 是后端 `OrderCtnLoading`，不是前端兜底。** 小程序查询写死这个值；「新增附件类型」能否勾上监装，取决于枚举管理 `ModuleType` 有没有 `value=160100`、`displayName=监装箱型附件`。
- **枚举编辑是全量子表替换。** 给 `ModuleType` 加 `160050` / `160100` 时必须把原有子项一起带回，漏带等于删掉。各租户/环境要配一次，可用枚举导出再导入。
- **类型接口失败不要挡详情。** 失败只 Toast，组退回工单已有 `attachmentGroups`。
- **ID 比较用 `String(id)`。** 附件类型 id 可能是雪花，禁止 `Number()`。
