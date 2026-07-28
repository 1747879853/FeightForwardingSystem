# 付款申请编辑页所属公司展示完整组织路径

## 背景意图

编辑付款申请时，详情接口返回组织串 `orgs`（从顶级到当前节点）。页面「所属公司」此前仅取 `orgs` 末端节点名称（如「世纪通达」），无法体现完整层级，与海运出口等模块的 `formatOrgPathLabel` 展示不一致。

## 核心逻辑变更

- `form.vue` 的 `loadEditData`：编辑态只读「所属公司」由 `detail.orgs.at(-1)?.name` 改为 `formatOrgPathLabel(detail.orgs)`。
- 复用 `#/composables/use-all-user-org` 中已有工具，各级 `name`（或 `displayName`）以 `/` 拼接。

## 避坑指南

- `orgs` 语义因场景而异：列表「所属公司」常取首节点或 `isCompany`；本字段为编辑态组织串全路径展示，勿与 `orgs.at(-1)`（直属组织名）混用。
- 新增模式仍用 `MyOrgSelect`，其选项 label 已含完整路径，无需改动。
