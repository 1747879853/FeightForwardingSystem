# 变更记录：编号生成模块前端接口对接与规则校验

## 背景意图

- `GenerateNumAdmin` 现有前端实现仍使用旧字段（`userId`）和旧接口路径（`*Async`），与最新后端契约不一致。
- 本次目标是让列表、详情、新增、编辑、删除全链路严格对齐最新接口文档，并在前端提前兜底关键业务校验。

## 核心技术决策/逻辑变更

- 更新 API 对接层：`src/api/system/base-data/generate-num-admin.ts`
  - 接口路径改为：`GetPagedList / Detail / Add / Edit / Delete`。
  - 分页参数改为 `skipCount`、`maxResultCount`。
  - 主表字段切换为 `orgId` + `generateNumUsers`，移除旧 `userId` 语义。
  - 规则子表补齐 `reset` 字段。
- 更新列表页与查询参数映射：`src/views/system/basic-data/GenerateNumAdmin/list.vue`
  - 前端分页统一换算 `skipCount = (currentPage - 1) * pageSize`。
- 更新表单与规则明细：`src/views/system/basic-data/GenerateNumAdmin/modules/form.vue`
  - 表单新增“适用组织 + 适用用户（多选）”。
  - 新增互斥校验：组织与适用用户不可同时设置。
  - 新增规则校验：规则不能为空、AutoNum 不超过 1 条、固定字符串规则必填文本、长度必须大于 0。
  - 编辑场景支持子表按 `id` 回传，未带回记录交由后端执行删除语义。
- 更新页面文案与字段名：`src/views/system/basic-data/GenerateNumAdmin/data.ts` 与中英文 locale。
  - 列表展示新增“适用组织/适用用户”。
  - 规则表格新增“重置序号（reset）”列。

## 避坑指南（Gotchas & Constraints）

- 互斥规则必须在前端提交前拦截，否则后端会直接返回业务错误，影响弹窗内体验。
- 编辑子表时必须优先复用已有明细 `id`，否则会把更新误判为新增，导致脏数据。
- `reset` 只对非 `AutoNum` 规则变化重置有意义，但接口层统一允许传布尔值，便于后端统一判定。
