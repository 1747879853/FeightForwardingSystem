# 变更记录：分页选择器搜索结果防串数据

## 背景意图

- 在 `CtnSelect` 搜索场景中，先触发旧关键词请求、再触发新关键词请求时，旧请求晚回包会把历史数据重新并入当前结果。
- 该问题本质是公共分页选择能力的异步竞态问题，影响所有复用 `usePagedSelect` 的业务选择器，而非单一组件。

## 核心技术决策/逻辑变更

- 修改 `apps/web-antd/src/adapter/component/biz-select/use-paged-select.ts`：
  - 在内部状态新增 `queryVersion`，用于标记当前查询上下文版本。
  - `reset`（搜索词变化、扩展筛选变化）时递增版本号，表示进入新的查询上下文。
  - `api` 发起请求时捕获当前版本，响应返回后先比对版本；若版本不一致则丢弃该响应，不再合并缓存。
- 更新 `apps/web-antd/src/adapter/component/biz-select/README.md`，补充“搜索竞态防护”机制及生效范围（所有基于 `usePagedSelect` 的 Select 组件）。

## 避坑指南（Gotchas & Constraints）

- 下拉分页类组件存在“并发请求 + 缓存合并”时，必须先判断响应是否仍属于当前查询上下文，再执行缓存写入。
- 不建议在单个业务选择器内分别做竞态补丁，统一收敛到 `usePagedSelect` 可避免行为漂移和重复维护。
