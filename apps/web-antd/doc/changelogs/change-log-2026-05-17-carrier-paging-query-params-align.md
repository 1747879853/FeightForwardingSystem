# 变更记录：Carrier 分页查询参数按 Swagger 对齐

## 背景意图

- `CarrierAdmin/GetPagedListAsync` 的后端查询参数以 Swagger 为准，使用 `Keyword/CnName/.../Sorting/PageIndex/PageSize`。
- 前端上一轮将该接口切换为 `keyword/skipCount/maxResultCount`，导致接口参数名不匹配。

## 核心技术决策/逻辑变更

- 更新 `src/api/system/base-data/carrier-admin.ts` 的 `GetPagedListParams` 参数模型为后端约定的 PascalCase：
  - `Keyword`、`CnName`、`CnShortName`、`EnName`、`Code`、`OtherCode`、`EdiCode`、`Remark`、`Sorting`
  - `PageIndex`、`PageSize`
- 同步恢复调用侧参数传递：
  - `src/views/system/basic-data/CarrierAdmin/data.ts` 搜索字段改回 `Keyword`
  - `src/views/system/basic-data/CarrierAdmin/list.vue` 分页参数改回 `PageIndex/PageSize`
  - `src/views/sea-export-admin/freight-rate/*` 船公司下拉批量查询参数改回 `PageSize`
  - `src/adapter/component/biz-select/carrier-select.vue` 维持 `Keyword/PageIndex/PageSize` 映射

## 避坑指南（Gotchas & Constraints）

- 分页接口对“参数名”敏感，哪怕值正确，参数命名不一致也会导致后端无法正确绑定。
- 若后端字段命名沿用 ABP 风格（PascalCase），前端 API DTO 应保持同风格，避免局部改造引入兼容问题。
