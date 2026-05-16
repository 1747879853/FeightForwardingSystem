# 变更记录：分页下拉组件兼容 totalCount 防止重复加载

## 背景意图

- 编号生成模块“适用用户”下拉在数据已全部加载后，继续滚动仍触发接口请求。
- 该问题来自公共分页下拉能力，影响所有复用 `usePagedSelect` 且后端返回 `totalCount` 的场景。

## 核心技术决策/逻辑变更

- 修改 `apps/web-antd/src/adapter/component/biz-select/use-paged-select.ts`：
  - `fetchPage` 返回类型从仅支持 `total` 扩展为同时支持 `total` / `totalCount`。
  - 内部总数计算优先读取 `total`，其次读取 `totalCount`，都没有则回退 `0`。
  - 合并缓存时对 `items` 做空值兜底，避免异常结构触发循环逻辑。

## 避坑指南（Gotchas & Constraints）

- 分页组件的“是否还有更多”必须只依赖统一后的 `state.total`，不能直接假设所有接口字段一致。
- 若后端分页契约再次调整，应先在公共适配层做兼容，不建议在每个业务 Select 单独打补丁。
