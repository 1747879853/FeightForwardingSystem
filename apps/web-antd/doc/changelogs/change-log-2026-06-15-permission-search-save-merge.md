# 模块权限搜索后保存丢失未展示权限修复

## 背景意图

权限管理页「模块权限」Tab 支持关键词搜索过滤树节点。用户反馈：搜索后点击保存，仅保留搜索结果中的权限，其余已配置权限被清空。该行为会导致角色/用户权限被意外覆盖，属于数据丢失类缺陷。

## 核心逻辑变更

- `list.vue` 新增 `collectPermissionKeys`：收集当前过滤树中所有可见节点的 `authCode`。
- `handlePermissionsChange` 在存在搜索词时改为**合并策略**：保留 `checkedPermissions` 中不在可见树内的已选权限，再与 Tree 回传的可见勾选合并去重；无搜索词时仍直接覆盖。
- 根因：`VbenTree` 在 `treeData` 为过滤子集时，`updateTreeValue` 会剔除不在 flatten 数据中的 modelValue 项并回写父组件，导致不可见权限被误删。

## 避坑指南

- 搜索过滤只影响 Tree 展示数据（`filteredPermissions`），**不得**让 `checkedPermissions` 与可见节点 1:1 同步。
- 若后续替换 Tree 组件或改为服务端搜索，保存前仍需以全量已选集合为准，不能仅提交当前可见勾选。
- 2026-06-09 搜索功能文档已声明「checkedPermissions 与树展示解耦」，本修复补齐该约束的实际实现。
