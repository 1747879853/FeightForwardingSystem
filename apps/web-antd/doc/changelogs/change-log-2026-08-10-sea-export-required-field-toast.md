# 海运出口 - 必填校验 toast 点名缺项

## 背景意图

TAPD #0730 / #0647：保存仅提示「请完善必填项」，用户难以判断还差哪个字段；头部「归属组织」无必填 `*`。

## 核心逻辑变更

- `use-sea-export-submit`：多表单 `validate` 失败后，从各表单 `errors` + `schema.label` 汇总缺失字段名，toast 形如「请完善必填项：归属组织、委托单位」。
- 头部「归属组织」标签增加红色 `*`（与干系人必填角色同款样式）。
- 修复销售切换带出归属组织竞态：`UserOrgSelect` 换人时一次写入最终默认组织（禁止先 null 再默认）；海出/空运/海进 `handleHeaderOrgChange` 用序号防串；空运去掉会与 autoDefault 打架的父级清 org watch。

## 避坑指南

- 隐藏在头部的字段（如 `orgId`）仍参与 schema 校验，但界面无红框，依赖 toast 点名。
- `errors` 的 key 可能带路径，取首段 fieldName 再映射 label。
- 最多展示 8 个字段名，避免 toast 过长。
- 勿在业务页对 `salesUserId` 再异步 `setFieldValue(orgId, undefined)`，交给 `UserOrgSelect` 的 `clearOnUserChange` + `autoDefault`。
